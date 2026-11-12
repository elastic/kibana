/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAgentEvaluator } from '../types';
import { noDashboardResult, skippedResult } from '../evaluator_utils';

export const DASHBOARD_TIME_RANGE_EVALUATOR_NAME = 'Dashboard Time Range';

const formatTimeRange = (timeRange?: { from: string; to: string }): string =>
  timeRange ? `${timeRange.from} to ${timeRange.to}` : 'none';

/**
 * Checks that the dashboard ends up with the gold time range. A copied screen
 * context time range is called out, since it is the page's time picker and not a request.
 */
export const dashboardTimeRangeEvaluator: DashboardAgentEvaluator = {
  name: DASHBOARD_TIME_RANGE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ input, expected, output }) => {
    const gold = expected?.timeRange;
    if (!gold) {
      return skippedResult('No gold time range.');
    }
    const { dashboard } = output;
    if (!dashboard) {
      return noDashboardResult;
    }
    const { time_range: timeRange } = dashboard;
    if (timeRange?.from === gold.from && timeRange?.to === gold.to) {
      return {
        score: 1,
        label: 'match',
        explanation: `The dashboard time range is ${formatTimeRange(gold)}.`,
      };
    }
    const screenTimeRange = input?.screenContext?.time_range;
    const copied =
      screenTimeRange !== undefined &&
      timeRange?.from === screenTimeRange.from &&
      timeRange?.to === screenTimeRange.to;
    return {
      score: 0,
      label: copied ? 'copied-screen-time-range' : 'mismatch',
      explanation: `Expected ${formatTimeRange(gold)}, found ${formatTimeRange(timeRange)}${
        copied ? ' (copied from the screen context)' : ''
      }.`,
    };
  },
};
