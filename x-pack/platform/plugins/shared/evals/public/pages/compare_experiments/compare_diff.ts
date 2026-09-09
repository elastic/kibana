/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction } from '@kbn/evals-common';

/**
 * Diff as target − baseline so positive values mean the target scored higher.
 */
export const computeCompareDiff = (meanTarget: number, meanBaseline: number): number =>
  meanTarget - meanBaseline;

/**
 * Whether a compare diff is an improvement given metric polarity.
 * Positive diff improves `maximize` metrics; negative improves `minimize` metrics.
 */
export const isImproved = (diff: number, direction: Direction): boolean => {
  if (direction === 'neutral') {
    return false;
  }
  return direction === 'maximize' ? diff > 0 : diff < 0;
};
