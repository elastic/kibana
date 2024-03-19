/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentCountStatsChangePoint } from '../types';
import { getWindowParameters } from './get_window_parameters';
import type { WindowParameters } from './window_parameters';

export function getWindowParametersForTrigger(
  startRange: number | WindowParameters,
  interval: number,
  timeRangeEarliest: number,
  timeRangeLatest: number,
  changePoint?: DocumentCountStatsChangePoint
) {
  if (
    typeof startRange === 'number' &&
    changePoint &&
    startRange >= changePoint.lower &&
    startRange <= changePoint.upper
  ) {
    return getWindowParameters(
      changePoint.lower + interval,
      timeRangeEarliest,
      timeRangeLatest + interval,
      changePoint.upper,
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
