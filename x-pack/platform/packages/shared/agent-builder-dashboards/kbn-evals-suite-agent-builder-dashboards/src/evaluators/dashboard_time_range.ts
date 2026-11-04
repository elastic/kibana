/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAgentEvaluator } from '../types';
import { noDashboardResult, skippedResult } from '../evaluator_utils';

export const DASHBOARD_TIME_RANGE_EVALUATOR_NAME = 'Dashboard Time Range';

/**
 * Checks that a dashboard built from a request that names no time window does
 * not copy the screen context time range, which is the page's time picker and
 * not a request.
 */
export const dashboardTimeRangeEvaluator: DashboardAgentEvaluator = {
  name: DASHBOARD_TIME_RANGE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ input, output }) => {
    const screenTimeRange = input?.screenContext?.time_range;
    if (!screenTimeRange) {
      return skippedResult('No screen context time range.');
    }
    const { dashboard } = output;
    if (!dashboard) {
      return noDashboardResult;
    }
    const { time_range: timeRange } = dashboard;
    const copied = timeRange?.from === screenTimeRange.from && timeRange?.to === screenTimeRange.to;
    const found = timeRange ? `${timeRange.from} to ${timeRange.to}` : 'none';
    return {
      score: copied ? 0 : 1,
      label: copied ? 'copied-screen-time-range' : 'own-time-range',
      explanation: copied
        ? `The dashboard copied the screen context time range (${found}).`
        : `The dashboard time range (${found}) is not the screen context's (${screenTimeRange.from} to ${screenTimeRange.to}).`,
    };
  },
};
