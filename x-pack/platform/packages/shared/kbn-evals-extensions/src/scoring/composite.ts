/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompositeScoreConfig, CompositeScoreResult } from '../types';

const GRADE_THRESHOLDS: Array<[CompositeScoreResult['compositeGrade'], number]> = [
  ['A', 0.9],
  ['B', 0.8],
  ['C', 0.7],
  ['D', 0.6],
  ['F', 0],
];

export const computeCompositeScore = (
  evaluatorResults: Array<{ evaluator: string; score: number | null }>,
  config: CompositeScoreConfig
): CompositeScoreResult => {
  const dimensionScores: Record<string, number> = {};

  for (const [dimension, evaluatorNames] of Object.entries(config.dimensions)) {
    const scores = evaluatorNames
      .map((name) => evaluatorResults.find((r) => r.evaluator === name)?.score)
      .filter((s): s is number => s != null);

    dimensionScores[dimension] =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
  }

  // Compute weighted average, renormalizing for missing dimensions
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [dimension, weight] of Object.entries(config.weights)) {
    if (dimension in dimensionScores) {
      weightedSum += dimensionScores[dimension] * weight;
      totalWeight += weight;
    }
  }

  const compositeScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const compositeGrade =
    GRADE_THRESHOLDS.find(([, threshold]) => compositeScore >= threshold)?.[0] ?? 'F';

  return {
    compositeScore,
    compositeGrade,
    dimensionScores,
  };
};
