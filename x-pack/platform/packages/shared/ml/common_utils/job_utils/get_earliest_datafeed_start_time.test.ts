/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getEarliestDatafeedStartTime } from './get_earliest_datafeed_start_time';
import { getLatestDataOrBucketTimestamp } from './get_latest_data_or_bucket_timestamp';

describe('getEarliestDatafeedStartTime', () => {
  test('returns expected value when no gap in data at end of bucket processing', () => {
    expect(getEarliestDatafeedStartTime(1549929594000, 1549928700000)).toBe(1549929594000);
  });
  test('returns expected value when there is a gap in data at end of bucket processing', () => {
    expect(getEarliestDatafeedStartTime(1549929594000, 1562256600000)).toBe(1562256600000);
  });
  test('returns expected value when bucket span is provided', () => {
    expect(
      getEarliestDatafeedStartTime(1549929594000, 1562256600000, moment.duration(1, 'h'))
    ).toBe(1562260200000);
  });

  test('returns expected value when job has not run', () => {
    expect(getLatestDataOrBucketTimestamp(undefined, undefined)).toBe(undefined);
  });
});
