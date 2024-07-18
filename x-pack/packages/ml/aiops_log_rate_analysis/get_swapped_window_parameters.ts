/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WindowParameters } from './window_parameters';

export const getSwappedWindowParameters = (
  windowParameters: WindowParameters
): WindowParameters => ({
  baselineMin: windowParameters.deviationMin,
  baselineMax: windowParameters.deviationMax,
  deviationMin: windowParameters.baselineMin,
  deviationMax: windowParameters.baselineMax,
});
