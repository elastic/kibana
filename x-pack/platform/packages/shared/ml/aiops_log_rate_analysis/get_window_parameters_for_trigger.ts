/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentCountStatsChangePoint } from './types';
import { getWindowParameters } from './get_window_parameters';
import type { WindowParameters } from './window_parameters';

/**
 * Calculates window parameters, adjusting the window based on a
 * change point and interval. If a change point is specified and falls within
 * the startRange, the window is adjusted around the change point. Otherwise,
 * the window is determined by the startRange and interval.
 *
 * @param startRange The start timestamp or window parameters. If a number,
 *                   it's the start timestamp; if an object, it's assumed to be
 *                   window parameters and is returned directly.
 * @param interval Interval in milliseconds for extending the window or
 *                 adjusting the start range.
 * @param timeRangeEarliest Earliest timestamp in milliseconds in the time range.
 * @param timeRangeLatest Latest timestamp in milliseconds in the time range.
 * @param changePoint Optional change point with `startTs` and `endTs`
 *                    properties. Adjusts window parameters if within `startRange`.
 * @returns Window parameters
 */
export function getWindowParametersForTrigger(
  startRange: number | WindowParameters,
  interval: number,
  timeRangeEarliest: number,
  timeRangeLatest: number,
  changePoint?: DocumentCountStatsChangePoint
): WindowParameters {
  if (
    typeof startRange === 'number' &&
    changePoint &&
    startRange >= changePoint.startTs &&
    startRange <= changePoint.endTs
  ) {
    return getWindowParameters(
      changePoint.startTs + interval,
      timeRangeEarliest,
      timeRangeLatest + interval,
      changePoint.endTs,
      interval
    );
  } else if (typeof startRange === 'number') {
    return getWindowParameters(
      startRange + interval / 2,
      timeRangeEarliest,
      timeRangeLatest + interval
    );
  }

  return startRange;
}
