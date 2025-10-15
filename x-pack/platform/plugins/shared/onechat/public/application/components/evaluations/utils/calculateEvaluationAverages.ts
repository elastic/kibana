/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScore } from '../../../../../common/http_api/evaluations';

// Calculate averages from evaluation data
export const calculateAverages = (evaluationData: EvaluationScore[]) => {
  if (!evaluationData?.length) {
    return {};
  }

  // Initialize sums and counts for all possible score types
  const scoreSums: Record<string, number> = {};
  const scoreCounts: Record<string, number> = {};

  // Process each result
  evaluationData.forEach((result: EvaluationScore) => {
    if (result && result.evaluatorId && typeof result.score === 'number') {
      scoreSums[result.evaluatorId] = (scoreSums[result.evaluatorId] || 0) + result.score;
      scoreCounts[result.evaluatorId] = (scoreCounts[result.evaluatorId] || 0) + 1;
    }
  });

  // Calculate averages for all score types
  const averages: Record<string, number> = {};
  Object.keys(scoreSums).forEach((scoreKey) => {
    if (scoreCounts[scoreKey] > 0) {
      averages[scoreKey] = scoreSums[scoreKey] / scoreCounts[scoreKey];
    }
  });

  // Return all calculated averages
  return averages;
};
