/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AlphaMetric = 'nominal' | 'ordinal' | 'interval';

/**
 * Ratings of one unit (an item) by the raters who rated it. Raters who skipped the unit are
 * simply absent, so units may have different numbers of ratings.
 */
export type KrippendorffUnit = readonly number[];

/**
 * Krippendorff's alpha: 1 - observed / expected disagreement, computed from the coincidence
 * matrix, so it handles missing ratings and any number of raters. Units with fewer than two
 * ratings carry no agreement information and are ignored.
 *
 * Returns null when alpha is undefined: no pairable unit, or every rating is the same value.
 */
export const computeKrippendorffAlpha = (
  units: readonly KrippendorffUnit[],
  metric: AlphaMetric = 'nominal'
): number | null => {
  const coincidence = new Map<number, Map<number, number>>();
  const addCoincidence = (c: number, k: number, amount: number) => {
    const row = coincidence.get(c) ?? new Map<number, number>();
    row.set(k, (row.get(k) ?? 0) + amount);
    coincidence.set(c, row);
  };

  for (const unit of units) {
    const m = unit.length;
    if (m < 2) {
      continue;
    }
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        if (i !== j) {
          addCoincidence(unit[i], unit[j], 1 / (m - 1));
        }
      }
    }
  }

  const values = [...coincidence.keys()].sort((a, b) => a - b);
  const marginal = new Map<number, number>();
  let total = 0;
  for (const c of values) {
    const sum = [...(coincidence.get(c)?.values() ?? [])].reduce((acc, v) => acc + v, 0);
    marginal.set(c, sum);
    total += sum;
  }
  if (values.length < 2 || total <= 1) {
    return null;
  }

  const nOf = (v: number) => marginal.get(v) ?? 0;
  const difference = (c: number, k: number): number => {
    if (c === k) {
      return 0;
    }
    if (metric === 'nominal') {
      return 1;
    }
    if (metric === 'interval') {
      return (c - k) ** 2;
    }
    const [lo, hi] = c < k ? [c, k] : [k, c];
    const between = values.filter((v) => v >= lo && v <= hi).reduce((acc, v) => acc + nOf(v), 0);
    return (between - (nOf(c) + nOf(k)) / 2) ** 2;
  };

  let observed = 0;
  let expected = 0;
  for (const c of values) {
    for (const k of values) {
      const delta = difference(c, k);
      observed += (coincidence.get(c)?.get(k) ?? 0) * delta;
      expected += nOf(c) * nOf(k) * delta;
    }
  }
  if (expected === 0) {
    return null;
  }
  return 1 - ((total - 1) * observed) / expected;
};
