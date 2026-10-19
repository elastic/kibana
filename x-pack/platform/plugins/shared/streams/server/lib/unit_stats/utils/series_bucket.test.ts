/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSeriesBucketMs } from './series_bucket';

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
