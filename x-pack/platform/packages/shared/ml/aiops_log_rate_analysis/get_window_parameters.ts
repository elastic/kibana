/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WindowParameters } from './window_parameters';

/**
 * Given a point in time (e.g. where a user clicks), use simple heuristics to compute:
 *
 * 1. The time window around the click to evaluate for changes
 * 2. The historical time window prior to the click to use as a baseline.
 *
 * The philosophy here is that charts are displayed with different granularities according to their
 * overall time window. We select the log deviation and historical time windows inline with the
 * overall time window.
 *
 * The algorithm for doing this is based on the typical granularities that exist in machine data.
 *
 * @param clickTime timestamp of the clicked log rate deviation.
 * @param minTime minimum timestamp of the time window to be analysed
 * @param maxTime maximum timestamp of the time window to be analysed
 * @param clickTimeUpper optional timestamp to treat clicktime and clickTimeUpper
 *                       as a time range instead of point in time
 * @param windowGapOverride optional override for the baseline/deviation gap
 * @returns WindowParameters
 */
export const getWindowParameters = (
  clickTime: number,
  minTime: number,
  maxTime: number,
  clickTimeUpper?: number,
  windowGapOverride?: number
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
  const windowGap = windowGapOverride ?? Math.max(totalWindow / 10, minWindowGap);

  const deviationMin = clickTimeUpper ? clickTime : clickTime - deviationWindow / 2;
  const deviationMax = clickTimeUpper ? clickTimeUpper : clickTime + deviationWindow / 2;

  const baselineMax = deviationMin - windowGap;
  const baselineMin = baselineMax - baselineWindow;

  return {
    baselineMin: Math.round(baselineMin),
    baselineMax: Math.round(baselineMax),
    deviationMin: Math.round(deviationMin),
    deviationMax: Math.round(deviationMax),
  };
};
