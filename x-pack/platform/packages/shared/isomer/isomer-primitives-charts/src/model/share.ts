/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue } from './format';

/** Shares are whole tenths of a percent, so they print with at most one decimal and always sum exactly. */
export const SHARE_STEPS = 1000;

/**
 * `steps` apportioned over `values` by largest remainder, ties to the earlier value, so the parts sum to
 * `steps` exactly. `undefined` when the values sum to zero.
 */
export const apportion = (
  values: readonly number[],
  steps: number = SHARE_STEPS
): number[] | undefined => {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return undefined;
  }
  const exact = values.map((value) => (value / total) * steps);
  const whole = exact.map(Math.floor);
  const left = steps - whole.reduce((sum, step) => sum + step, 0);
  exact
    .map((amount, index) => ({ index, remainder: amount - whole[index]! }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .slice(0, left)
    .forEach(({ index }) => {
      whole[index]! += 1;
    });
  return whole;
};

/** A share in {@link SHARE_STEPS} as a percent. */
export const sharePercent = (steps: number): number => (steps * 100) / SHARE_STEPS;

/** A percent share as every surface prints it; `null` is no share, when the whole is zero. */
export const formatShare = (share: number | null): string =>
  formatValue(share === null ? null : share / 100, { style: 'percent' });
