/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Since 8.x we use the "fixed_interval" or "calendar_interval" parameter instead
 * of the less precise "interval". This helper parse the interval and return its type.
 * @param interval Interval value (e.g. "1d", "1w"...)
 */
export const getIntervalType = (interval: string): 'fixed_interval' | 'calendar_interval' => {
  // We will consider all interval as fixed except if they are
  // weekly (w), monthly (M), quarterly (q) or yearly (y)
  const intervalMetric = interval.charAt(interval.length - 1);
  if (['w', 'M', 'q', 'y'].includes(intervalMetric)) {
    return 'calendar_interval';
  }
  return 'fixed_interval';
};
