/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WindowParameters } from './window_parameters';

/**
 * Swaps the baseline and deviation window parameters. To be used when we identify the type of analysis to be 'dip'.
 *
 * @param windowParameters An object containing the window parameters for baseline and deviation periods.
 * @returns A new `WindowParameters` object with the baseline and deviation parameters swapped.
 */
export const getSwappedWindowParameters = (
  windowParameters: WindowParameters
): WindowParameters => ({
  baselineMin: windowParameters.deviationMin,
  baselineMax: windowParameters.deviationMax,
  deviationMin: windowParameters.baselineMin,
  deviationMax: windowParameters.baselineMax,
});
