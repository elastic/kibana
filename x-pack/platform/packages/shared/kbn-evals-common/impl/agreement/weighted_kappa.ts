/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** One item scored by both a judge and a human on the same numeric scale. */
export interface ScorePair {
  judge: number;
  human: number;
}

export type KappaWeighting = 'linear' | 'quadratic';

export interface WeightedKappaOptions {
  weighting?: KappaWeighting;
}

/**
 * Cohen's weighted kappa for ordinal scores: 1 - observed disagreement / chance disagreement,
 * where disagreement between two scores grows with their distance. Returns null when it is
 * undefined (no pairs, a non-finite score, or both raters used a single identical value).
 *
 * Quadratic weighting is computed in O(n) from moments, because chance disagreement over every
 * judge x human combination expands to var(judge) + var(human) + (mean(judge) - mean(human))^2.
 * Linear weighting has no such closed form here and stays a pairwise O(n^2) sum.
 */
export const computeWeightedKappa = (
  pairs: readonly ScorePair[],
  { weighting = 'quadratic' }: WeightedKappaOptions = {}
): number | null => {
  const n = pairs.length;
  if (n === 0) {
    return null;
  }
  // Plain loop rather than Math.max(...values): spreading every score overflows the call stack
  // once there are ~100k of them.
  let min = Infinity;
  let max = -Infinity;
  for (const { judge, human } of pairs) {
    if (!Number.isFinite(judge) || !Number.isFinite(human)) {
      return null;
    }
    min = Math.min(min, judge, human);
    max = Math.max(max, judge, human);
  }
  // Normalising by the range cancels in the observed/expected ratio, so it only keeps the
  // weights in [0, 1]; the result does not depend on the scale's width.
  const range = max - min;
  if (!(range > 0) || !Number.isFinite(range)) {
    return null;
  }

  const { observed, expected } =
    weighting === 'linear'
      ? linearDisagreement(pairs, range)
      : quadraticDisagreement(pairs, min, range);

  if (expected === 0) {
    return null;
  }
  const kappa = 1 - observed / expected;
  return Number.isFinite(kappa) ? kappa : null;
};

interface Disagreement {
  observed: number;
  expected: number;
}

const linearDisagreement = (pairs: readonly ScorePair[], range: number): Disagreement => {
  const n = pairs.length;
  const weight = (a: number, b: number): number => Math.abs(a - b) / range;

  let observed = 0;
  for (const { judge, human } of pairs) {
    observed += weight(judge, human);
  }

  let expected = 0;
  for (const { judge } of pairs) {
    for (const { human } of pairs) {
      expected += weight(judge, human);
    }
  }
  return { observed: observed / n, expected: expected / (n * n) };
};

const quadraticDisagreement = (
  pairs: readonly ScorePair[],
  min: number,
  range: number
): Disagreement => {
  const n = pairs.length;
  // Scores are shifted to the scale minimum and divided by the range before any squaring, so a
  // large constant offset or a very wide scale cannot swamp the variances.
  const unit = (score: number): number => (score - min) / range;

  let judgeSum = 0;
  let humanSum = 0;
  for (const { judge, human } of pairs) {
    judgeSum += unit(judge);
    humanSum += unit(human);
  }
  const judgeMean = judgeSum / n;
  const humanMean = humanSum / n;

  // Second pass about the means (not a raw sum of squares) avoids catastrophic cancellation.
  let observed = 0;
  let judgeSquares = 0;
  let humanSquares = 0;
  for (const { judge, human } of pairs) {
    const distance = (judge - human) / range;
    observed += distance * distance;
    judgeSquares += (unit(judge) - judgeMean) ** 2;
    humanSquares += (unit(human) - humanMean) ** 2;
  }

  return {
    observed: observed / n,
    expected: judgeSquares / n + humanSquares / n + (judgeMean - humanMean) ** 2,
  };
};
