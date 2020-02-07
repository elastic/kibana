/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import StatsMock from './__mocks__/analytics_stats.json';
jest.mock('ui/new_platform');

import {
  isCompletedAnalyticsJob,
  isDataFrameAnalyticsRunning,
  isDataFrameAnalyticsStats,
  DataFrameAnalyticsStats,
  DATA_FRAME_TASK_STATE,
} from './common';

const completedJob = StatsMock.data_frame_analytics[0] as DataFrameAnalyticsStats;
const runningJob = StatsMock.data_frame_analytics[1] as DataFrameAnalyticsStats;

describe('Data Frame Analytics: common utils', () => {
  test('isCompletedAnalyticsJob()', () => {
    expect(isCompletedAnalyticsJob(completedJob)).toBe(true);
    expect(isCompletedAnalyticsJob(runningJob)).toBe(false);
  });

  test('isDataFrameAnalyticsRunning()', () => {
    expect(isDataFrameAnalyticsRunning(completedJob.state)).toBe(false);
    expect(isDataFrameAnalyticsRunning(runningJob.state)).toBe(true);
    runningJob.state = DATA_FRAME_TASK_STATE.STARTED;
    expect(isDataFrameAnalyticsRunning(runningJob.state)).toBe(true);
    runningJob.state = DATA_FRAME_TASK_STATE.STARTING;
    expect(isDataFrameAnalyticsRunning(runningJob.state)).toBe(true);
    runningJob.state = DATA_FRAME_TASK_STATE.REINDEXING;
    expect(isDataFrameAnalyticsRunning(runningJob.state)).toBe(true);
    runningJob.state = DATA_FRAME_TASK_STATE.FAILED;
    expect(isDataFrameAnalyticsRunning(runningJob.state)).toBe(false);
  });

  test('isDataFrameAnalyticsStats()', () => {
    expect(isDataFrameAnalyticsStats(completedJob)).toBe(true);
    expect(isDataFrameAnalyticsStats(runningJob)).toBe(true);
    expect(isDataFrameAnalyticsStats({})).toBe(false);
    expect(isDataFrameAnalyticsStats('no-object')).toBe(false);
  });
});
