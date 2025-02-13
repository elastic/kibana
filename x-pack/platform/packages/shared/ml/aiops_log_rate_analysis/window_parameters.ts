/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

/**
 * Time range definition for baseline and deviation to be used by log rate analysis.
 *
 * @export
 * @interface WindowParameters
 * @typedef {WindowParameters}
 */
export interface WindowParameters {
  /** Baseline minimum value */
  baselineMin: number;
  /** Baseline maximum value */
  baselineMax: number;
  /** Deviation minimum value */
  deviationMin: number;
  /** Deviation maximum value */
  deviationMax: number;
}

/**
 * Type guard for WindowParameters
 *
 * @param {unknown} arg - The argument to be checked.
 * @returns {arg is WindowParameters}
 */
export const isWindowParameters = (arg: unknown): arg is WindowParameters =>
  isPopulatedObject(arg, ['baselineMin', 'baselineMax', 'deviationMin', 'deviationMax']) &&
  Object.values(arg).every((d) => typeof d === 'number');
