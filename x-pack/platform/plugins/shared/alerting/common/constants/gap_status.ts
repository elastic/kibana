/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const gapStatus = {
  UNFILLED: 'unfilled',
  FILLED: 'filled',
  PARTIALLY_FILLED: 'partially_filled',
} as const;

export const aggregatedGapStatus = {
  IN_PROGRESS: 'in_progress',
  UNFILLED: 'unfilled',
  FILLED: 'filled',
} as const;

export type GapStatus = (typeof gapStatus)[keyof typeof gapStatus];
export type AggregatedGapStatus = (typeof aggregatedGapStatus)[keyof typeof aggregatedGapStatus];
