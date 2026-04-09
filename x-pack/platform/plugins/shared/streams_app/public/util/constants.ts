/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FAILURE_STORE_SELECTOR = '::failures';

/** Default SuperDatePicker range when Streams has no rangeFrom/rangeTo in the URL (Last 24 hours). */
export const STREAMS_APP_DEFAULT_TIME_RANGE = {
  from: 'now-24h',
  to: 'now',
} as const;
