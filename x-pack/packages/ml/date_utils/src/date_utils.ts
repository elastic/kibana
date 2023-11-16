/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// utility functions for handling dates

import dateMath from '@kbn/datemath';
import { formatDate } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { TIME_FORMAT } from './time_format';

/**
 * Format a timestamp as human readable date.
 *
 * @param {number} ts - The timestamp to be formatted.
 * @returns {string}
 */
export function formatHumanReadableDate(ts: number): string {
  return formatDate(ts, 'MMMM Do YYYY');
}

/**
 * Format a timestamp as human readable date including hours and minutes.
 *
 * @param {number} ts - The timestamp to be formatted.
 * @returns {string}
 */
export function formatHumanReadableDateTime(ts: number): string {
  return formatDate(ts, 'MMMM Do YYYY, HH:mm');
}

/**
 * Format a timestamp as human readable date including hours, minutes and seconds.
 *
 * @param {number} ts - The timestamp to be formatted.
 * @returns {string}
 */
export function formatHumanReadableDateTimeSeconds(ts: number): string {
  return formatDate(ts, 'MMMM Do YYYY, HH:mm:ss');
}

/**
 * Validate a time range of two string based dates.
 * Copy of `src/plugins/data/public/query/timefilter/lib/validate_timerange.ts`
 * for the time being so it can be used in packages.
 *
 * @param {?TimeRange} [time] - The time range to be validated.
 * @returns {boolean}
 */
export function validateTimeRange(time?: TimeRange): boolean {
  if (!time) return false;
  const momentDateFrom = dateMath.parse(time.from);
  const momentDateTo = dateMath.parse(time.to);
  return !!(momentDateFrom && momentDateFrom.isValid() && momentDateTo && momentDateTo.isValid());
}

/**
 * Transform a string based time range into one based on timestamps.
 *
 * @param {TimeRange} time - The time range to be transformed.
 * @returns {{ to: any; from: any; }}
 */
export function createAbsoluteTimeRange(time: TimeRange) {
  if (validateTimeRange(time) === false) {
    return null;
  }

  return {
    to: dateMath.parse(time.to)?.valueOf(),
    from: dateMath.parse(time.from)?.valueOf(),
  };
}

/**
 * Format a timestamp into a human readable date based on the `TIME_FORMAT` spec.
 *
 * @param {number} value - The timestamp to be formatted.
 * @returns {string}
 */
export const timeFormatter = (value: number): string => {
  return formatDate(value, TIME_FORMAT);
};
