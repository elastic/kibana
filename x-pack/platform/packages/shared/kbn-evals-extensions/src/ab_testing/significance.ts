/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificanceResult } from '../types';
import { computeConfidenceInterval } from '../scoring/confidence';

/**
 * Tests statistical significance of the difference between two score arrays
 * using a bootstrap permutation test.
 *
 * @param scoresA - Scores for variant A
 * @param scoresB - Scores for variant B
 * @param alpha - Significance level (default: 0.05)
 * @param nPermutations - Number of permutation iterations (default: 10000)
 * @param seed - Random seed for reproducibility
 */
export const testSignificance = (
  scoresA: number[],
  scoresB: number[],
  alpha: number = 0.05,
  nPermutations: number = 10000,
  seed: number = 42
): SignificanceResult => {
  if (scoresA.length === 0 || scoresB.length === 0) {
    return {
      significant: false,
      confidenceInterval: { lower: 0, upper: 0, mean: 0, level: 1 - alpha },
      recommendation: 'Insufficient data for significance testing',
    };
  }

  const meanA = scoresA.reduce((s, v) => s + v, 0) / scoresA.length;
  const meanB = scoresB.reduce((s, v) => s + v, 0) / scoresB.length;
  const observedDelta = meanA - meanB;

  if (scoresA.length !== scoresB.length) {
    throw new Error(
      `Cannot test significance: scoresA.length (${scoresA.length}) !== scoresB.length (${scoresB.length})`
    );
  }

  // Bootstrap confidence interval on the difference
  const diffs = scoresA.map((a, i) => a - scoresB[i]);
  const ci = computeConfidenceInterval(diffs, 1 - alpha, nPermutations, seed);

  // Permutation test: under the null hypothesis (no difference), how often
  // would we see a delta as extreme as observed?
  const combined = [...scoresA, ...scoresB];
  const nA = scoresA.length;

  // Simple seeded PRNG (Park-Miller LCG)
  let state = Math.abs(seed) % 2147483647 || 1;
  const rng = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };

  let extremeCount = 0;
  for (let i = 0; i < nPermutations; i++) {
    // Fisher-Yates shuffle of combined array (in-place on a copy)
    const shuffled = [...combined];
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(rng() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
    }

    const permMeanA = shuffled.slice(0, nA).reduce((s, v) => s + v, 0) / nA;
    const permMeanB = shuffled.slice(nA).reduce((s, v) => s + v, 0) / (combined.length - nA);
    const permDelta = permMeanA - permMeanB;

    if (Math.abs(permDelta) >= Math.abs(observedDelta)) {
      extremeCount++;
    }
  }

  const pValue = extremeCount / nPermutations;
  const significant = pValue < alpha;

  let recommendation: string;
  if (!significant) {
    recommendation = `No statistically significant difference detected (p=${pValue.toFixed(
      4
    )}, α=${alpha}). Collect more data or accept equivalence.`;
  } else if (observedDelta > 0) {
    recommendation = `Variant A is significantly better (delta=${observedDelta.toFixed(
      4
    )}, p=${pValue.toFixed(4)}).`;
  } else {
    recommendation = `Variant B is significantly better (delta=${Math.abs(observedDelta).toFixed(
      4
    )}, p=${pValue.toFixed(4)}).`;
  }

  return {
    significant,
    pValue,
    confidenceInterval: ci,
    recommendation,
  };
};
