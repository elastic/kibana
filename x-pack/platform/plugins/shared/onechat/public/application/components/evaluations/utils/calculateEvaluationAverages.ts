/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Calculate averages from evaluation data
export const calculateAverages = (evaluationData: any) => {
  if (!evaluationData?.results?.length) {
    return {};
  }

  const results = evaluationData.results;

  // Initialize sums and counts for all possible score types
  const scoreSums: Record<string, number> = {};
  const scoreCounts: Record<string, number> = {};

  // Process each result
  results.forEach((result: any) => {
    if (result.scores) {
      Object.entries(result.scores).forEach(([scoreKey, scoreValue]) => {
        if (typeof scoreValue === 'number') {
          scoreSums[scoreKey] = (scoreSums[scoreKey] || 0) + scoreValue;
          scoreCounts[scoreKey] = (scoreCounts[scoreKey] || 0) + 1;
        }
      });
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
