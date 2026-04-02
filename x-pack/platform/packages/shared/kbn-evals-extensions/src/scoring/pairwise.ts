/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PairwiseEvaluatorResult } from '../types';

/**
 * Computes per-evaluator pairwise comparison results from score arrays.
 *
 * @param evaluatorScores - Map of evaluator name → [scoreA[], scoreB[]] arrays
 * @returns Array of pairwise evaluator results with deltas and direction
 */
export const computePairwiseResults = (
  evaluatorScores: Record<string, { scoresA: number[]; scoresB: number[] }>
): PairwiseEvaluatorResult[] => {
  const results: PairwiseEvaluatorResult[] = [];

  for (const [evaluator, { scoresA, scoresB }] of Object.entries(evaluatorScores)) {
    const meanA = scoresA.length > 0 ? scoresA.reduce((s, v) => s + v, 0) / scoresA.length : 0;
    const meanB = scoresB.length > 0 ? scoresB.reduce((s, v) => s + v, 0) / scoresB.length : 0;
    const delta = meanA - meanB;

    let direction: PairwiseEvaluatorResult['direction'];
    // Use a small epsilon to avoid floating-point noise
    if (Math.abs(delta) < 0.001) {
      direction = 'tie';
    } else if (delta > 0) {
      direction = 'A_better';
    } else {
      direction = 'B_better';
    }

    results.push({ evaluator, scoreA: meanA, scoreB: meanB, delta, direction });
  }

  return results;
};
