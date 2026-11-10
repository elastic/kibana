/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SECONDS_REGEX = /^[1-9][0-9]*s$/;
const MINUTES_REGEX = /^[1-9][0-9]*m$/;
const HOURS_REGEX = /^[1-9][0-9]*h$/;
const DAYS_REGEX = /^[1-9][0-9]*d$/;

/**
 * Formats a `{number}{unit}` duration string (e.g. `"5m"`) into a human-readable
 * label (e.g. `"5 min"`, or `"5 minutes"` when `fullUnit` is set). Throws on units
 * it does not recognize. Copied into alerting v2 to avoid a dependency on the
 * alerting (v1) plugin.
 */
export function formatDuration(duration: string, fullUnit?: boolean): string {
  const parsed = parseInt(duration, 10);
  if (SECONDS_REGEX.test(duration)) {
    return `${parsed} ${fullUnit ? (parsed > 1 ? 'seconds' : 'second') : 'sec'}`;
  } else if (MINUTES_REGEX.test(duration)) {
    return `${parsed} ${fullUnit ? (parsed > 1 ? 'minutes' : 'minute') : 'min'}`;
  } else if (HOURS_REGEX.test(duration)) {
    return `${parsed} ${fullUnit ? (parsed > 1 ? 'hours' : 'hour') : 'hr'}`;
  } else if (DAYS_REGEX.test(duration)) {
    return `${parsed} ${parsed > 1 ? 'days' : 'day'}`;
  }
  throw new Error(
    `Invalid duration "${duration}". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d"`
  );
}
