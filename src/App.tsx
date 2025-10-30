import React, { useState } from "react";
import { Home, Utensils, Activity, BarChart3, Lock, Egg, Wheat, Edit3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CalorieTracker = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [weight, setWeight] = useState(() => {
    const saved = localStorage.getItem("weight");
    return saved ? parseFloat(saved) : 82;
  });
  const [goalWeight] = useState(67);
  const [activityLevel, setActivityLevel] = useState(() => {
    const saved = localStorage.getItem("activityLevel");
    return saved || "regular";
  });
  const [mealType, setMealType] = useState("eggs");
  const [eggCount, setEggCount] = useState(0);
  const [riceGrams, setRiceGrams] = useState(0);
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [meals, setMeals] = useState(() => {
    const saved = localStorage.getItem("meals");
    return saved ? JSON.parse(saved) : [];
  });
  const [distance, setDistance] = useState(5);
  const [duration, setDuration] = useState(30);
  const [workouts, setWorkouts] = useState(() => {
    const saved = localStorage.getItem("workouts");
    return saved ? JSON.parse(saved) : [];
  });
  const [isDraggingWeight, setIsDraggingWeight] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartWeight, setDragStartWeight] = useState(0);
  const [insightsTab, setInsightsTab] = useState("balance");

  // Save to localStorage whenever data changes
  React.useEffect(() => {
    localStorage.setItem("weight", weight.toString());
  }, [weight]);

  React.useEffect(() => {
    localStorage.setItem("activityLevel", activityLevel);
  }, [activityLevel]);

  React.useEffect(() => {
    localStorage.setItem("meals", JSON.stringify(meals));
  }, [meals]);

  React.useEffect(() => {
    localStorage.setItem("workouts", JSON.stringify(workouts));
  }, [workouts]);

  // Hardcoded user data (unused but kept for future features)
  // const age = 29;
  // const height = 167; // cm
  // const sex = "male";

  // Body composition categories with estimated body fat percentages
  const bodyCompositionProfiles = {
    fat: { bodyFatPercent: 0.30, activityMultiplier: 1.2 }, // 30% BF, sedentary
    regular: { bodyFatPercent: 0.22, activityMultiplier: 1.375 }, // 22% BF, light activity
    fit: { bodyFatPercent: 0.15, activityMultiplier: 1.55 }, // 15% BF, moderate activity
    slim: { bodyFatPercent: 0.10, activityMultiplier: 1.725 }, // 10% BF, very active
  };

  // Katch-McArdle equation (body composition-based)
  const calculateBMR = () => {
    const profile = bodyCompositionProfiles[activityLevel as keyof typeof bodyCompositionProfiles];
    if (!profile) return 1700; // Fallback
    const leanBodyMass = weight * (1 - profile.bodyFatPercent);
    // Katch-McArdle: BMR = 370 + (21.6 × lean_body_mass_kg)
    return Math.round(370 + 21.6 * leanBodyMass);
  };

  const calculateTDEE = () => {
    const bmr = calculateBMR();
    const profile = bodyCompositionProfiles[activityLevel as keyof typeof bodyCompositionProfiles];
    if (!profile) return bmr * 1.375; // Fallback
    return Math.round(bmr * profile.activityMultiplier);
  };

  const totalMealCalories = meals.reduce((sum: number, meal: any) => sum + meal.calories, 0);
  const totalMealProtein = meals.reduce((sum: number, meal: any) => sum + meal.protein, 0);
  const totalWorkoutCalories = workouts.reduce((sum: number, workout: any) => sum + workout.calories, 0);
  const netCalories = totalMealCalories - totalWorkoutCalories;

  const bmr = calculateBMR();
  const tdee = calculateTDEE();

  const getChartData = () => {
    const days = Array.from({ length: 91 }, (_, i) => i);
    const dailyDeficit = netCalories - tdee;

    const dataPoints = days
      .filter((_, i) => i % 15 === 0)
      .map((day) => {
        // Account for metabolic adaptation over time
        let adaptationFactor = 1.0;
        if (day > 30) {
          // 5-10% metabolic adaptation after first month
          adaptationFactor = 0.95;
        }
        if (day > 60) {
          // Additional adaptation
          adaptationFactor = 0.9;
        }

        // Use 7700 cal/kg but account for adaptation
        const effectiveDeficit = dailyDeficit * adaptationFactor;
        const calorieDeficit = effectiveDeficit * day;
        const weightLoss = calorieDeficit / 7700;

        const projectedWeight = weight + weightLoss;
        return {
          day,
          weight: projectedWeight,
        };
      });

    // Find first index where goal is reached
    const goalReachedIndex = dataPoints.findIndex(point => point.weight <= goalWeight);

    // Split data into before and after goal
    return dataPoints.map((point, index) => {
      const reachedGoal = goalReachedIndex !== -1 && index >= goalReachedIndex;
      return {
        day: point.day,
        weight: point.weight,
        // Include the first goal point in both lines to connect them
        weightBeforeGoal: goalReachedIndex === -1 || index <= goalReachedIndex ? point.weight : null,
        weightAfterGoal: reachedGoal ? point.weight : null,
      };
    });
  };

  const addMeal = () => {
    let calories = 0,
      protein = 0,
      name = "";

    if (mealType === "eggs" && eggCount > 0) {
      calories = eggCount * 70;
      protein = eggCount * 6;
      name = `${eggCount} egg${eggCount > 1 ? "s" : ""}`;
      setEggCount(0);
    } else if (mealType === "rice" && riceGrams > 0) {
      calories = Math.round(riceGrams * 1.3);
      protein = Math.round(riceGrams * 0.027);
      name = `${riceGrams}g rice`;
      setRiceGrams(0);
    } else if (mealType === "custom" && customCalories) {
      calories = parseInt(customCalories);
      protein = parseFloat(customProtein) || 0;
      name = `${calories} cal`;
      setCustomCalories("");
      setCustomProtein("");
    }

    if (calories > 0) {
      setMeals([...meals, { id: Date.now(), name, calories, protein }]);
    }
  };

  const addWorkout = () => {
    if (duration > 0) {
      const pace = duration / distance;
      // Scientifically validated formula: Calories ≈ weight_kg × distance_km × 1.036
      const calories = Math.round(weight * distance * 1.036);
      setWorkouts([
        ...workouts,
        {
          id: Date.now(),
          distance,
          duration,
          pace: pace.toFixed(1),
          calories,
        },
      ]);
    }
  };

  const deleteMeal = (id: number) => {
    setMeals(meals.filter((m: any) => m.id !== id));
  };

  const deleteWorkout = (id: number) => {
    setWorkouts(workouts.filter((w: any) => w.id !== id));
  };

  const handleWeightDragStart = (e: any) => {
    setIsDraggingWeight(true);
    setDragStartY(e.type.includes("touch") ? e.touches[0].clientY : e.clientY);
    setDragStartWeight(weight);
  };

  const handleWeightDragMove = (e: any) => {
    if (!isDraggingWeight) return;
    e.preventDefault();
    const currentY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY - currentY;
    const weightChange = deltaY / 10; // 10px = 0.1kg
    const newWeight = Math.max(30, Math.min(300, dragStartWeight + weightChange));
    setWeight(Math.round(newWeight * 10) / 10);
  };

  const handleWeightDragEnd = () => {
    setIsDraggingWeight(false);
  };

  const getProjectionAnalysis = () => {
    const dailyDeficit = netCalories - tdee;

    // Account for metabolic adaptation in projections
    const weeklyDeficitAdapted = dailyDeficit * 7 * 0.85; // 15% adaptation factor
    const monthlyDeficitAdapted = dailyDeficit * 30 * 0.8; // 20% adaptation factor

    const projectedWeeklyLoss = weeklyDeficitAdapted / 7700;
    const projectedMonthlyLoss = monthlyDeficitAdapted / 7700;
    const daysToGoal =
      dailyDeficit < 0
        ? Math.ceil(((weight - goalWeight) * 7700) / Math.abs(dailyDeficit * 0.85))
        : null;

    const proteinPerKg = totalMealProtein / weight;

    // Protein targets based on body composition and deficit
    // const profile = bodyCompositionProfiles[activityLevel as keyof typeof bodyCompositionProfiles];
    const isInDeficit = dailyDeficit < 0;
    const minProtein = isInDeficit ? 1.6 : 1.2; // Higher in deficit to preserve muscle
    const optimalProtein = isInDeficit ? 2.0 : 1.6;

    let proteinStatus: "excellent" | "good" | "low" | "critical";
    let proteinColor: string;

    if (proteinPerKg >= optimalProtein) {
      proteinStatus = "excellent";
      proteinColor = "text-green-400";
    } else if (proteinPerKg >= minProtein) {
      proteinStatus = "good";
      proteinColor = "text-yellow-400";
    } else if (proteinPerKg >= 0.8) {
      proteinStatus = "low";
      proteinColor = "text-orange-400";
    } else {
      proteinStatus = "critical";
      proteinColor = "text-red-400";
    }

    // Calorie to protein ratio (calories per gram of protein)
    const calorieProteinRatio = totalMealCalories > 0 ? totalMealCalories / totalMealProtein : 0;

    // Ideal ratio is 10-15 cal/g protein for lean gains, <10 for aggressive cut
    let ratioStatus: "excellent" | "good" | "high";
    if (calorieProteinRatio <= 10) {
      ratioStatus = "excellent";
    } else if (calorieProteinRatio <= 15) {
      ratioStatus = "good";
    } else {
      ratioStatus = "high";
    }

    return {
      dailyDeficit,
      weeklyLoss: projectedWeeklyLoss,
      monthlyLoss: projectedMonthlyLoss,
      daysToGoal,
      proteinPerKg,
      proteinStatus,
      proteinColor,
      minProtein,
      optimalProtein,
      calorieProteinRatio,
      ratioStatus,
      tdeePercentage: totalMealCalories > 0 ? (totalMealCalories / tdee) * 100 : 0,
    };
  };

  const analysis = getProjectionAnalysis();

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <style>{`
        * {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Remove input spinners */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }

        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .glass-elevated {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(50px) saturate(200%);
          -webkit-backdrop-filter: blur(50px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        }

        .view-transition {
          animation: fadeSlide 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .item-enter {
          animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        button {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        button:active {
          transform: scale(0.96);
          opacity: 0.7;
        }

        input {
          transition: all 0.2s ease;
        }

        input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { value: totalMealCalories, label: "IN", color: "text-red-400" },
            { value: totalWorkoutCalories, label: "OUT", color: "text-green-400" },
            { value: netCalories, label: "NET", color: "text-white" },
            { value: bmr, label: "BMR", color: "text-white" },
          ].map((card, i) => (
            <div key={i} className="glass rounded-2xl p-3 text-center">
              <div className={`text-xl font-bold mb-0.5 ${card.color}`}>{card.value}</div>
              <div className="text-[10px] text-gray-500 font-medium tracking-wider">
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        {activeTab === "dashboard" && (
          <div className="space-y-2 view-transition">
            <div className="glass-elevated rounded-2xl p-3">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="min-w-0">
                  <label className="text-[10px] text-gray-500 mb-1 block">Current Weight (kg)</label>
                  <div
                    className={`glass rounded-xl h-10 flex items-center justify-center cursor-ns-resize select-none ${isDraggingWeight ? "glass-elevated" : ""}`}
                    onMouseDown={handleWeightDragStart}
                    onMouseMove={handleWeightDragMove}
                    onMouseUp={handleWeightDragEnd}
                    onMouseLeave={handleWeightDragEnd}
                    onTouchStart={handleWeightDragStart}
                    onTouchMove={handleWeightDragMove}
                    onTouchEnd={handleWeightDragEnd}
                  >
                    <div className="text-xl font-bold">{weight}</div>
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="text-[10px] text-gray-500 mb-1 block flex items-center gap-1">
                    Goal Weight (kg)
                  </label>
                  <div className="glass rounded-xl h-10 flex items-center justify-center gap-1">
                    <span className="text-xl font-bold">{goalWeight}</span>
                    <Lock size={12} />
                  </div>
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                {[
                  { value: "fat", label: "Fat" },
                  { value: "regular", label: "Regular" },
                  { value: "fit", label: "Fit" },
                  { value: "slim", label: "Slim" },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setActivityLevel(type.value)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all
                                    ${activityLevel === type.value ? "bg-white/20 text-white border border-white/30" : "glass text-gray-400"}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="glass rounded-lg p-1.5 text-center">
                  <div className="text-[9px] text-gray-500">BMR</div>
                  <div className="text-sm font-semibold">{bmr}</div>
                </div>
                <div className="glass rounded-lg p-1.5 text-center">
                  <div className="text-[9px] text-gray-500">TDEE</div>
                  <div className="text-sm font-semibold">{tdee}</div>
                </div>
              </div>
            </div>

            <div className="glass-elevated rounded-2xl p-3">
              <div className="h-48 mb-2 -ml-12 mr-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.9)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "white",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weightBeforeGoal"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth={2}
                      dot={{ fill: "rgba(255,255,255,0.8)", r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="weightAfterGoal"
                      stroke="rgba(34, 197, 94, 0.8)"
                      strokeWidth={2}
                      dot={{ fill: "rgba(34, 197, 94, 0.8)", r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="glass rounded-lg p-2 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Current:</span>
                  <span className="font-semibold">{weight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">90-day:</span>
                  <span className="font-semibold">
                    {(weight + ((netCalories - tdee) * 90 * 0.8) / 7700).toFixed(1)} kg
                  </span>
                </div>
                {(() => {
                  const dailyDeficit = netCalories - tdee;
                  if (dailyDeficit >= 0) return null;
                  const daysToGoal = Math.ceil(((weight - goalWeight) * 7700) / Math.abs(dailyDeficit * 0.85));
                  if (daysToGoal <= 0 || daysToGoal > 365) return null;
                  return (
                    <div className="flex justify-between text-green-400">
                      <span>Goal reached:</span>
                      <span className="font-semibold">{daysToGoal} days</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === "meals" && (
          <div className="space-y-2 view-transition">
            <div className="glass-elevated rounded-2xl p-3">
              <div className="flex gap-1 mb-3">
                {[
                  { value: "eggs", label: "Eggs", icon: Egg },
                  { value: "rice", label: "Rice", icon: Wheat },
                  { value: "custom", label: "Custom", icon: Edit3 },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setMealType(type.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1
                                    ${mealType === type.value ? "bg-white/20 text-white border border-white/30" : "glass text-gray-400"}`}
                  >
                    <type.icon size={14} />
                    {type.label}
                  </button>
                ))}
              </div>

              {mealType === "eggs" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEggCount(Math.max(0, eggCount - 1))}
                      className="glass rounded-xl w-9 h-9 flex items-center justify-center text-sm"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={eggCount}
                      onChange={(e) => setEggCount(parseInt(e.target.value) || 0)}
                      onKeyDown={(e) => e.key === 'Enter' && addMeal()}
                      className="glass rounded-xl flex-1 h-9 text-center bg-transparent border-0 text-base font-semibold"
                      placeholder="Eggs"
                    />
                    <button
                      onClick={() => setEggCount(eggCount + 1)}
                      className="glass rounded-xl w-9 h-9 flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={addMeal}
                    className="w-full glass-elevated rounded-xl py-2.5 text-sm font-semibold"
                  >
                    + Add
                  </button>
                </div>
              )}

              {mealType === "rice" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRiceGrams(Math.max(0, riceGrams - 10))}
                      className="glass rounded-xl w-9 h-9 flex items-center justify-center text-sm"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={riceGrams}
                      onChange={(e) => setRiceGrams(parseInt(e.target.value) || 0)}
                      onKeyDown={(e) => e.key === 'Enter' && addMeal()}
                      className="glass rounded-xl flex-1 h-9 text-center bg-transparent border-0 text-base font-semibold"
                      placeholder="Grams"
                    />
                    <button
                      onClick={() => setRiceGrams(riceGrams + 10)}
                      className="glass rounded-xl w-9 h-9 flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={addMeal}
                    className="w-full glass-elevated rounded-xl py-2.5 text-sm font-semibold"
                  >
                    + Add
                  </button>
                </div>
              )}

              {mealType === "custom" && (
                <div className="space-y-2">
                  <input
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addMeal()}
                    className="w-full glass rounded-xl h-9 px-3 bg-transparent border-0 text-sm"
                    placeholder="Calories"
                  />
                  <input
                    type="number"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addMeal()}
                    className="w-full glass rounded-xl h-9 px-3 bg-transparent border-0 text-sm"
                    placeholder="Protein (g)"
                  />
                  <button
                    onClick={addMeal}
                    className="w-full glass-elevated rounded-xl py-2.5 text-sm font-semibold"
                  >
                    + Add
                  </button>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {meals.length === 0 ? (
                  <p className="text-center text-gray-600 py-6 text-sm">No meals added</p>
                ) : (
                  meals.map((meal: any) => (
                    <div
                      key={meal.id}
                      className="glass rounded-2xl p-3 flex justify-between items-center item-enter"
                    >
                      <div>
                        <div className="font-medium text-sm">{meal.name}</div>
                        <div className="text-xs text-gray-500">
                          {meal.calories} cal • {meal.protein}g protein
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMeal(meal.id)}
                        className="glass rounded-lg w-7 h-7 flex items-center justify-center text-red-400 text-lg"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="glass rounded-2xl p-3 mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Calories</span>
                  <span className="font-bold">{totalMealCalories}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Protein</span>
                  <span className="font-bold">{totalMealProtein.toFixed(1)}g</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Target: {(weight * 1.6).toFixed(0)}-{(weight * 2.0).toFixed(0)}g/day for muscle
                  retention
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "running" && (
          <div className="space-y-2 view-transition">
            <div className="glass-elevated rounded-2xl p-3">
              <label className="text-[10px] text-gray-500 mb-1 block">Distance (km)</label>
              <div className="flex gap-1.5 mb-4">
                {[2.5, 5, 10, 15, 17.5].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDistance(d)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium
                                    ${distance === d ? "bg-white/20 text-white border border-white/30" : "glass text-gray-400"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <label className="text-xs text-gray-500 mb-2 block">Duration (minutes)</label>
              <div className="flex items-center gap-1.5 mb-4">
                <button
                  onClick={() => setDuration(Math.max(1, duration - 1))}
                  className="glass rounded-xl w-9 h-9 flex items-center justify-center text-sm"
                >
                  −
                </button>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  onKeyDown={(e) => e.key === 'Enter' && addWorkout()}
                  className="glass rounded-xl flex-1 h-9 text-center bg-transparent border-0 text-base font-semibold"
                />
                <button
                  onClick={() => setDuration(duration + 1)}
                  className="glass rounded-xl w-9 h-9 flex items-center justify-center text-sm"
                >
                  +
                </button>
              </div>

              <button
                onClick={addWorkout}
                className="w-full glass-elevated rounded-xl py-2.5 text-sm font-semibold mb-4"
              >
                + Add Run
              </button>

              <div className="space-y-2">
                {workouts.length === 0 ? (
                  <p className="text-center text-gray-600 py-6 text-sm">No runs logged</p>
                ) : (
                  workouts.map((workout: any) => (
                    <div
                      key={workout.id}
                      className="glass rounded-2xl p-3 flex justify-between items-center item-enter"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {workout.distance}km • {workout.duration}min
                        </div>
                        <div className="text-xs text-gray-500">
                          {workout.pace} min/km • {workout.calories} cal
                        </div>
                      </div>
                      <button
                        onClick={() => deleteWorkout(workout.id)}
                        className="glass rounded-lg w-7 h-7 flex items-center justify-center text-red-400 text-lg"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="glass rounded-2xl p-3 mt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Workout Calories</span>
                  <span className="font-bold">{totalWorkoutCalories}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="space-y-2 view-transition">
            <div className="glass-elevated rounded-2xl p-3">
              {/* Tabs */}
              <div className="flex gap-1 mb-3">
                {[
                  { value: "balance", label: "Balance" },
                  { value: "protein", label: "Protein" },
                  { value: "macros", label: "Macros" },
                  { value: "running", label: "Running" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setInsightsTab(tab.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                                    ${insightsTab === tab.value ? "bg-white/20 text-white border border-white/30" : "glass text-gray-400"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-1 text-xs">
                {insightsTab === "balance" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Daily deficit:</span>
                      <strong className={analysis.dailyDeficit < 0 ? "text-green-400" : "text-red-400"}>
                        {analysis.dailyDeficit} cal
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Weekly loss:</span>
                      <strong>{analysis.weeklyLoss.toFixed(2)} kg</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Monthly loss:</span>
                      <strong>{analysis.monthlyLoss.toFixed(2)} kg</strong>
                    </div>
                    {analysis.daysToGoal && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Days to goal:</span>
                        <strong className="text-green-400">{analysis.daysToGoal} days</strong>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-t border-white/10 mt-1 pt-1">
                      <span className="text-gray-500">TDEE coverage</span>
                      <strong className={analysis.tdeePercentage > 100 ? "text-red-400" : "text-green-400"}>
                        {analysis.tdeePercentage.toFixed(0)}%
                      </strong>
                    </div>
                    <div className="text-gray-600 text-[10px] pt-2">
                      💡 Expect BMR to decrease 5-10% after 12+ weeks in deficit
                    </div>
                  </>
                )}

                {insightsTab === "protein" && (
                  <>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Current</span>
                      <strong>{totalMealProtein.toFixed(1)}g ({analysis.proteinPerKg.toFixed(1)}g/kg)</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Target range</span>
                      <strong>{(weight * analysis.minProtein).toFixed(0)}-{(weight * analysis.optimalProtein).toFixed(0)}g</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Status</span>
                      <strong className={analysis.proteinColor}>
                        {analysis.proteinStatus}
                      </strong>
                    </div>
                    {analysis.proteinStatus !== "excellent" && analysis.proteinStatus !== "good" && (
                      <div className="pt-2 text-red-400 flex items-start gap-1">
                        <span>⚠️</span>
                        <span>Low protein may cause muscle loss during deficit</span>
                      </div>
                    )}
                  </>
                )}

                {insightsTab === "macros" && (
                  <>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Cal/protein ratio</span>
                      <strong className={
                        analysis.ratioStatus === "excellent" ? "text-green-400" :
                          analysis.ratioStatus === "good" ? "text-yellow-400" : "text-orange-400"
                      }>
                        {analysis.calorieProteinRatio.toFixed(1)} cal/g
                      </strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Protein %</span>
                      <strong>
                        {totalMealCalories > 0 ? ((totalMealProtein * 4 / totalMealCalories) * 100).toFixed(0) : 0}%
                      </strong>
                    </div>
                    <div className="text-gray-600 text-[10px] pt-2">
                      Ideal: &lt;10 cal/g for cuts, 10-15 for maintenance
                    </div>
                  </>
                )}

                {insightsTab === "running" && (
                  <>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Total runs</span>
                      <strong>{workouts.length}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Calories/km</span>
                      <strong>~{(weight * 1.036).toFixed(0)} cal</strong>
                    </div>
                    <div className="text-gray-600 text-[10px] pt-2">
                      Based on your current weight
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Pill */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-auto">
        <nav className="glass-elevated rounded-full px-2 py-2">
          <div className="flex gap-1">
            {[
              { id: "dashboard", icon: Home },
              { id: "meals", icon: Utensils },
              { id: "running", icon: Activity },
              { id: "insights", icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full p-3 transition-all duration-300
                                ${activeTab === tab.id ? "glass-elevated" : "hover:bg-white/5"}`}
              >
                <tab.icon size={20} strokeWidth={2} />
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default CalorieTracker;
