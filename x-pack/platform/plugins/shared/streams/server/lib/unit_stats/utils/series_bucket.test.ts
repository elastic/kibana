/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_MAX_ROWS } from '../constants';
import { getIdsPerSeriesQuery, getSeriesBucketMs } from './series_bucket';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('getSeriesBucketMs', () => {
  it.each([
    ['5 minutes', 5 * MINUTE, 12_000],
    ['14 minutes', 14 * MINUTE, 33_600],
    ['15 minutes', 15 * MINUTE, MINUTE],
    ['1 hour', HOUR, MINUTE],
    ['6 hours', 6 * HOUR, 5 * MINUTE],
    ['24 hours', DAY, 15 * MINUTE],
    ['3 days', 3 * DAY, HOUR],
    ['10 days', 10 * DAY, 6 * HOUR],
    ['30 days', 30 * DAY, DAY],
  ])('snaps a %s range to the bucket width', (_label, rangeMs, expected) => {
    expect(getSeriesBucketMs(rangeMs)).toBe(expected);
  });

  it('never goes below the 10 second export interval', () => {
    expect(getSeriesBucketMs(60 * 1000 - 1)).toBe(10_000);
    expect(getSeriesBucketMs(1000)).toBe(10_000);
  });
});

describe('getIdsPerSeriesQuery', () => {
  it.each([
    ['15 minutes, 1 minute buckets', 15 * MINUTE, MINUTE, 625],
    ['24 hours, 15 minute buckets', DAY, 15 * MINUTE, 103],
    ['365 days, 1 day buckets', 365 * DAY, DAY, 27],
  ])('allows the ids that fit the row cap for %s', (_label, rangeMs, bucketMs, expected) => {
    expect(getIdsPerSeriesQuery({ rangeMs, bucketMs })).toBe(expected);
  });

  it('counts a partial first and last bucket', () => {
    // 90 seconds in 60 second buckets touch up to 3 buckets, not 1.5.
    expect(getIdsPerSeriesQuery({ rangeMs: 90_000, bucketMs: 60_000 })).toBe(
      Math.floor(ESQL_MAX_ROWS / 3)
    );
  });

  it('allows at least one id, however long the window', () => {
    expect(getIdsPerSeriesQuery({ rangeMs: 100_000 * DAY, bucketMs: DAY })).toBe(1);
  });

  it.each([5 * MINUTE, 15 * MINUTE, HOUR, 6 * HOUR, DAY, 3 * DAY, 10 * DAY, 30 * DAY, 365 * DAY])(
    'keeps ids times buckets within the row cap for a %s ms window',
    (rangeMs) => {
      const bucketMs = getSeriesBucketMs(rangeMs);
      const ids = getIdsPerSeriesQuery({ rangeMs, bucketMs });

      expect(ids * (Math.ceil(rangeMs / bucketMs) + 1)).toBeLessThanOrEqual(ESQL_MAX_ROWS);
    }
  );
});
