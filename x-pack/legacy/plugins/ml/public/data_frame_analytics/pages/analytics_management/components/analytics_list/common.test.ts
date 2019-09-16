/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import StatsMock from './__mocks__/analytics_stats.json';

import {
  isCompletedAnalyticsJob,
  isDataFrameAnalyticsRunning,
  isDataFrameAnalyticsStats,
} from './common';

const completedJob = StatsMock.data_frame_analytics[0];
const runningJob = StatsMock.data_frame_analytics[1];

describe('Data Frame Analytics: common utils', () => {
  test('isCompletedAnalyticsJob()', () => {
    expect(isCompletedAnalyticsJob(completedJob)).toBe(true);
    expect(isCompletedAnalyticsJob(runningJob)).toBe(false);
  });

  test('isDataFrameAnalyticsRunning()', () => {
    expect(isDataFrameAnalyticsRunning(completedJob)).toBe(false);
    expect(isDataFrameAnalyticsRunning(runningJob)).toBe(true);
  });

  test('isDataFrameAnalyticsStats()', () => {
    expect(isDataFrameAnalyticsStats(completedJob)).toBe(true);
    expect(isDataFrameAnalyticsStats(runningJob)).toBe(true);
    expect(isDataFrameAnalyticsStats({})).toBe(false);
    expect(isDataFrameAnalyticsStats('no-object')).toBe(false);
  });
});
