/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Diff as target − baseline so positive values mean the target scored higher.
 */
export const computeCompareDiff = (meanBaseline: number, meanTarget: number): number =>
  meanTarget - meanBaseline;

/**
 * Whether a compare diff is an improvement given metric polarity.
 * Positive diff improves higher-is-better metrics; negative improves lower-is-better.
 */
export const isImproved = (diff: number, higherIsBetter: boolean): boolean =>
  higherIsBetter ? diff > 0 : diff < 0;

const LOWER_IS_BETTER_PATTERN = /\b(tokens?|latency|costs?|duration|time|errors?)\b/i;

/**
 * Temporary name→polarity adapter until `higherIsBetter` is stored on score docs.
 * Prefer the explicit boolean API for new call sites and tests.
 */
export const isHigherIsBetterFromName = (evaluatorName: string): boolean =>
  !LOWER_IS_BETTER_PATTERN.test(evaluatorName);
