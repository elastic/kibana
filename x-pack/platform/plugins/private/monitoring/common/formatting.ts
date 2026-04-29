/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

export const LARGE_FLOAT = '0,0.[00]';
export const SMALL_FLOAT = '0.[00]';
export const LARGE_BYTES = '0,0.0 b';
export const SMALL_BYTES = '0.0 b';
export const LARGE_ABBREVIATED = '0,0.[0]a';
export const LARGE = '0,0';
export const ROUNDED_FLOAT = '00.[00]';

/**
 * Format the {@code date} in the user's expected date/time format using the provided time zone.
 * If {@code timezone} is unset, {@code null}, or {@code 'Browser'}, this uses the browser's guessed time zone.
 * @param date Either a numeric Unix timestamp or a {@code Date} object
 * @param timezone The user's configured time zone (e.g. {@code 'UTC'}, {@code 'Asia/Seoul'}, {@code 'Browser'})
 * @returns The date formatted using 'LL LTS'
 */
export function formatDateTimeLocal(date: number | Date, timezone?: string | null): string {
  const resolvedTz = !timezone || timezone === 'Browser' ? moment.tz.guess() : timezone;
  return moment.tz(date, resolvedTz).format('LL LTS');
}

/**
 * Shorten a Logstash Pipeline's hash for display purposes
 * @param {string} hash The complete hash
 * @return {string} The shortened hash
 */
export function shortenPipelineHash(hash: string) {
  return hash.substr(0, 6);
}

export function getDateFromNow(timestamp: string | number | Date, tz: string) {
  return moment(timestamp)
    .tz(tz === 'Browser' ? moment.tz.guess() : tz)
    .fromNow();
}

export function getCalendar(timestamp: string | number | Date, tz: string) {
  return moment(timestamp)
    .tz(tz === 'Browser' ? moment.tz.guess() : tz)
    .calendar();
}
