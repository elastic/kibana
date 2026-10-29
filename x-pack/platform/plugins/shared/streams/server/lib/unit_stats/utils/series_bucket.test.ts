/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_STREAMS_UNIT_STATS_COMPONENTS } from '@kbn/streams-schema';
import { ESQL_MAX_ROWS, SERIES_MAX_BUCKETS } from '../constants';
import { getSeriesBucketMs } from './series_bucket';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const YEAR = 365 * DAY;
const MONTH = 30 * DAY;

describe('getSeriesBucketMs', () => {
  it.each([
    ['5 minutes', 5 * MINUTE, 10 * SECOND],
    ['15 minutes', 15 * MINUTE, 30 * SECOND],
    ['1 hour', HOUR, MINUTE],
    ['6 hours', 6 * HOUR, 5 * MINUTE],
    ['24 hours', DAY, 30 * MINUTE],
    ['3 days', 3 * DAY, HOUR],
    ['7 days', 7 * DAY, 3 * HOUR],
    ['30 days', 30 * DAY, 12 * HOUR],
    ['90 days', 90 * DAY, DAY],
    ['1 year', YEAR, WEEK],
    ['5 years', 5 * YEAR, MONTH],
  ])('picks the width Discover would for a %s range', (_label, rangeMs, expected) => {
    expect(getSeriesBucketMs(rangeMs)).toBe(expected);
  });

  it('steps up to a wider width when the nearest one gives more buckets than the cap', () => {
    // Discover would pick 1 day here, which is 180 buckets.
    expect(getSeriesBucketMs(180 * DAY)).toBe(WEEK);
  });

  it('uses the width that fits exactly when the range is wider than the widest ladder width', () => {
    const rangeMs = 200 * YEAR;

    expect(getSeriesBucketMs(rangeMs)).toBe(Math.ceil(rangeMs / SERIES_MAX_BUCKETS));
  });

  it('never goes below the 10 second export interval', () => {
    expect(getSeriesBucketMs(60 * 1000 - 1)).toBe(10_000);
    expect(getSeriesBucketMs(1000)).toBe(10_000);
  });
});

describe('the series row budget', () => {
  it('lets every component of a request have a full series in one query', () => {
    // A partial bucket at each end adds one to the bucket count.
    expect(MAX_STREAMS_UNIT_STATS_COMPONENTS * (SERIES_MAX_BUCKETS + 1)).toBeLessThanOrEqual(
      ESQL_MAX_ROWS
    );
  });

  it.each([
    10 * SECOND,
    5 * MINUTE,
    HOUR,
    DAY,
    30 * DAY,
    99 * DAY,
    100 * DAY,
    180 * DAY,
    YEAR,
    5 * YEAR,
    200 * YEAR,
  ])('keeps the series of a %s ms range within the row cap for the most components', (rangeMs) => {
    const bucketMs = getSeriesBucketMs(rangeMs);
    const rowsPerId = Math.ceil(rangeMs / bucketMs) + 1;

    expect(rowsPerId * MAX_STREAMS_UNIT_STATS_COMPONENTS).toBeLessThanOrEqual(ESQL_MAX_ROWS);
  });
});
