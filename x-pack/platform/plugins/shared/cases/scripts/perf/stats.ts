/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface LatencySummary {
  count: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
};

export const summarize = (samples: number[]): LatencySummary => {
  if (samples.length === 0) {
    return { count: 0, mean: NaN, p50: NaN, p95: NaN, p99: NaN, min: NaN, max: NaN };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    count: sorted.length,
    mean: sum / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
};

export const formatSummary = (label: string, s: LatencySummary): string => {
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : 'n/a');
  return [
    `${label} (n=${s.count})`,
    `  mean=${fmt(s.mean)}ms`,
    `  p50=${fmt(s.p50)}ms`,
    `  p95=${fmt(s.p95)}ms`,
    `  p99=${fmt(s.p99)}ms`,
    `  min=${fmt(s.min)}ms`,
    `  max=${fmt(s.max)}ms`,
  ].join('\n');
};
