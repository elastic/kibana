/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DEFAULT_DECIMALS = 2;
const MAX_DECIMALS = 6;
// Below this magnitude a value is float noise from subtracting two equal means, not a real delta.
const NOISE_FLOOR = 10 ** -MAX_DECIMALS;

/**
 * Fixed-point formatting that keeps two decimals for ordinary values but widens for sub-cent
 * magnitudes, so a cost metric moving from $0.002 to $0.004 does not render as `0.00` vs `0.00`.
 */
export function formatMetricValue(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 10 ** -DEFAULT_DECIMALS || magnitude < NOISE_FLOOR) {
    return value.toFixed(DEFAULT_DECIMALS);
  }
  // Two significant digits: 0.004 -> 0.0040, 0.00004 -> 0.000040.
  const decimals = Math.min(Math.ceil(-Math.log10(magnitude)) + 1, MAX_DECIMALS);
  return value.toFixed(decimals);
}
