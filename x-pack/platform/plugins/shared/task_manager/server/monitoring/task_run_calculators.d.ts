/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
export interface AveragedStat extends JsonObject {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}
export declare function calculateRunningAverage(values: number[]): AveragedStat;
/**
 * Calculate the frequency of each term in a list of terms.
 * @param values
 */
export declare function calculateFrequency<T>(values: T[]): JsonObject;
/**
 * Utility to keep track of a bounded array of values which changes over time
 * dropping older values as they slide out of the window we wish to track
 */
export declare function createRunningAveragedStat<T>(
  runningAverageWindowSize: number
): (value?: T) => T[];
export declare function createMapOfRunningAveragedStats<T>(runningAverageWindowSize: number): (
  key?: string,
  value?: T
) => {
  [x: string]: T[];
};
export declare function filterOutliers(values: number[]): number[];
