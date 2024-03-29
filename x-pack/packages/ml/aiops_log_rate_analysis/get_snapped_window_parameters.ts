/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WindowParameters } from './window_parameters';

/**
 *
 * Converts window paramaters from the brushes to “snap” the brushes to the chart histogram bar width and ensure timestamps
 * correspond to bucket timestamps
 *
 * @param windowParameters time range definition for baseline and deviation to be used by log rate analysis
 * @param snapTimestamps time range definition that always corresponds to histogram bucket timestamps
 * @returns WindowParameters
 */
export const getSnappedWindowParameters = (
  windowParameters: WindowParameters,
  snapTimestamps: number[]
): WindowParameters => {
  const snappedBaselineMin = snapTimestamps.reduce((pts, cts) => {
    if (
      Math.abs(cts - windowParameters.baselineMin) < Math.abs(pts - windowParameters.baselineMin)
    ) {
      return cts;
    }
    return pts;
  }, snapTimestamps[0]);
  const baselineMaxTimestamps = snapTimestamps.filter((ts) => ts > snappedBaselineMin);

  const snappedBaselineMax = baselineMaxTimestamps.reduce((pts, cts) => {
    if (
      Math.abs(cts - windowParameters.baselineMax) < Math.abs(pts - windowParameters.baselineMax)
    ) {
      return cts;
    }
    return pts;
  }, baselineMaxTimestamps[0]);
  const deviationMinTss = baselineMaxTimestamps.filter((ts) => ts > snappedBaselineMax);

  const snappedDeviationMin = deviationMinTss.reduce((pts, cts) => {
    if (
      Math.abs(cts - windowParameters.deviationMin) < Math.abs(pts - windowParameters.deviationMin)
    ) {
      return cts;
    }
    return pts;
  }, deviationMinTss[0]);
  const deviationMaxTss = deviationMinTss.filter((ts) => ts > snappedDeviationMin);

  const snappedDeviationMax = deviationMaxTss.reduce((pts, cts) => {
    if (
      Math.abs(cts - windowParameters.deviationMax) < Math.abs(pts - windowParameters.deviationMax)
    ) {
      return cts;
    }
    return pts;
  }, deviationMaxTss[0]);

  return {
    baselineMin: snappedBaselineMin,
    baselineMax: snappedBaselineMax,
    deviationMin: snappedDeviationMin,
    deviationMax: snappedDeviationMax,
  };
};
