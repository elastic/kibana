/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Duration } from 'moment';
import { parseInterval } from '@kbn/ml-parse-interval';

/**
 * Parses the supplied string to a time interval suitable for use in an ML anomaly
 * detection job or datafeed.
 * @param value the string to parse
 * @return {Duration} the parsed interval, or null if it does not represent a valid
 * time interval.
 */
export function parseTimeIntervalForJob(value: string | number | undefined): Duration | null {
  if (value === undefined) {
    return null;
  }

  // Must be a valid interval, greater than zero,
  // and if specified in ms must be a multiple of 1000ms.
  const interval = parseInterval(value, true);
  return interval !== null && interval.asMilliseconds() !== 0 && interval.milliseconds() === 0
    ? interval
    : null;
}
