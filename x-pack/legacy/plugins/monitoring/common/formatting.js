/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';

export const LARGE_FLOAT = '0,0.[00]';
export const SMALL_FLOAT = '0.[00]';
export const LARGE_BYTES = '0,0.0 b';
export const SMALL_BYTES = '0.0 b';
export const LARGE_ABBREVIATED = '0,0.[0]a';

/**
 * Format the {@code date} in the user's expected date/time format using their <em>dateFormat:tz</em> defined time zone.
 * @param date Either a numeric Unix timestamp or a {@code Date} object
 * @returns The date formatted using 'LL LTS'
 */
export function formatDateTimeLocal(date, timezone) {
  if (timezone === 'Browser') {
    timezone = moment.tz.guess() || 'utc';
  }

  return moment.tz(date, timezone).format('LL LTS');
}

/**
 * Shorten a Logstash Pipeline's hash for display purposes
 * @param {string} hash The complete hash
 * @return {string} The shortened hash
 */
export function shortenPipelineHash(hash) {
  return hash.substr(0, 6);
}
