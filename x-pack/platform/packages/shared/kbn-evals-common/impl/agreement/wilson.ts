/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConfidenceInterval {
  low: number;
  high: number;
}

const Z_95 = 1.959963984540054;

/** Wilson score interval at 95%, which stays within [0, 1] for small samples near 0 or 1. */
export const wilsonInterval = (successes: number, total: number): ConfidenceInterval => {
  if (total <= 0) {
    return { low: 0, high: 1 };
  }
  const p = successes / total;
  const z2 = Z_95 * Z_95;
  const denom = 1 + z2 / total;
  const centre = p + z2 / (2 * total);
  const spread = Z_95 * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total));
  return {
    low: Math.max(0, (centre - spread) / denom),
    high: Math.min(1, (centre + spread) / denom),
  };
};

/** True when two intervals overlap, i.e. the data cannot order the two rows. */
export const intervalsOverlap = (a: ConfidenceInterval, b: ConfidenceInterval): boolean =>
  a.low <= b.high && b.low <= a.high;
