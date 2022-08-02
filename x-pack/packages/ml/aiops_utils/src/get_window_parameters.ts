/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Time range definition for baseline and deviation to be used by spike log analysis.
 */
export interface WindowParameters {
  baselineMin: number;
  baselineMax: number;
  deviationMin: number;
  deviationMax: number;
}

/**
 * Given a point in time (e.g. where a user clicks), use simple heuristics to compute:
 *
 * 1. The time window around the click to evaluate for changes
 * 2. The historical time window prior to the click to use as a baseline.
 *
 * The philosophy here is that charts are displayed with different granularities according to their
 * overall time window. We select the change point and historical time windows inline with the
 * overall time window.
 *
 * The algorithm for doing this is based on the typical granularities that exist in machine data.
 *
 * @param clickTime timestamp of the clicked log rate spike.
 * @param minTime minimum timestamp of the time window to be analysed
 * @param maxTime maximum timestamp of the time window to be analysed
 * @returns WindowParameters
 */
export const getWindowParameters = (
  clickTime: number,
  minTime: number,
  maxTime: number
): WindowParameters => {
  const totalWindow = maxTime - minTime;

  // min deviation window
  const minDeviationWindow = 10 * 60 * 1000; // 10min
  const minBaselineWindow = 30 * 60 * 1000; // 30min
  const minWindowGap = 5 * 60 * 1000; // 5min

  // work out bounds as done in the original notebooks,
  // with the deviation window aiming to be a 1/10
  // of the size of the total window and the baseline window
  // being 3.5/10 of the total window.
  const deviationWindow = Math.max(totalWindow / 10, minDeviationWindow);
  const baselineWindow = Math.max(totalWindow / 3.5, minBaselineWindow);
  const windowGap = Math.max(totalWindow / 10, minWindowGap);

  const deviationMin = clickTime - deviationWindow / 2;
  const deviationMax = clickTime + deviationWindow / 2;

  const baselineMax = deviationMin - windowGap;
  const baselineMin = baselineMax - baselineWindow;

  return {
    baselineMin: Math.round(baselineMin),
    baselineMax: Math.round(baselineMax),
    deviationMin: Math.round(deviationMin),
    deviationMax: Math.round(deviationMax),
  };
};

/**
 *
 * Converts window paramaters from the brushes to “snap” the brushes to the chart histogram bar width and ensure timestamps
 * correspond to bucket timestamps
 *
 * @param windowParameters time range definition for baseline and deviation to be used by spike log analysis
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
