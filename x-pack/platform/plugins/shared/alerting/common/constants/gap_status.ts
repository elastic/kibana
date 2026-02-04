/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Describes the raw status of individual gap documents regarding to the gap fill process.
 */
export const gapStatus = {
  UNFILLED: 'unfilled',
  FILLED: 'filled',
  PARTIALLY_FILLED: 'partially_filled',
} as const;

export type GapStatus = (typeof gapStatus)[keyof typeof gapStatus];

/**
 * Represents the status of a gap fill process for a rule.
 * This is a derived, per-rule aggregation that summarizes how well
 * the set of gaps for a rule has been filled. It is calculated from the gap
 * duration sums with precedence: unfilled > in_progress > filled.
 */
export const gapFillStatus = {
  UNFILLED: 'unfilled',
  IN_PROGRESS: 'in_progress',
  FILLED: 'filled',
} as const;

export type GapFillStatus = (typeof gapFillStatus)[keyof typeof gapFillStatus];
