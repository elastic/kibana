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
  /**
   * Full range of the scale. Defaults to the observed minimum and maximum across both raters,
   * which understates disagreement when the scale is wider than the data.
   */
  scale?: { min: number; max: number };
}

/**
 * Cohen's weighted kappa for ordinal scores: 1 - observed disagreement / chance disagreement,
 * where disagreement between two scores grows with their distance. Returns null when it is
 * undefined (no pairs, or both raters used a single identical value).
 */
export const computeWeightedKappa = (
  pairs: readonly ScorePair[],
  { weighting = 'quadratic', scale }: WeightedKappaOptions = {}
): number | null => {
  const n = pairs.length;
  if (n === 0) {
    return null;
  }
  const all = pairs.flatMap(({ judge, human }) => [judge, human]);
  const min = scale?.min ?? Math.min(...all);
  const max = scale?.max ?? Math.max(...all);
  const range = max - min;
  if (range <= 0) {
    return null;
  }
  const weight = (a: number, b: number): number => {
    const distance = Math.abs(a - b) / range;
    return weighting === 'linear' ? distance : distance * distance;
  };

  let observed = 0;
  for (const { judge, human } of pairs) {
    observed += weight(judge, human);
  }
  observed /= n;

  let expected = 0;
  for (const { judge } of pairs) {
    for (const { human } of pairs) {
      expected += weight(judge, human);
    }
  }
  expected /= n * n;

  return expected === 0 ? null : 1 - observed / expected;
};
