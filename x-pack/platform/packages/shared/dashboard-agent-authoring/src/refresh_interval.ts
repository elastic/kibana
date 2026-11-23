/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_FAILURE_TYPES } from './failure_types';
import type { DashboardFailure } from './utils';

const REFRESH_INTERVAL_WITHOUT_TIME_RANGE_ERROR =
  'Change to "refresh_interval" was reverted because auto-refresh is saved only together with a time range, and the dashboard has none. Set time_range in the same call: use the window the user named, or ask the user for one.';

/**
 * Reverts a refresh interval the call changed on a dashboard without a time range, because the
 * dashboard saves auto-refresh only together with a stored time range and would drop it on save.
 * Runs after the host fills in a default time range.
 */
export const revertRefreshIntervalWithoutTimeRange = ({
  originalDashboardData,
  dashboardData,
}: {
  /** The dashboard before the call; undefined for a new dashboard. */
  originalDashboardData: DashboardAttachmentData | undefined;
  dashboardData: DashboardAttachmentData;
}): { dashboardData: DashboardAttachmentData; failure?: DashboardFailure } => {
  const { refresh_interval: refreshInterval, time_range: timeRange } = dashboardData;
  const originalRefreshInterval = originalDashboardData?.refresh_interval;
  if (
    refreshInterval === undefined ||
    timeRange !== undefined ||
    isEqual(refreshInterval, originalRefreshInterval)
  ) {
    return { dashboardData };
  }

  const { refresh_interval: _changedRefreshInterval, ...dashboardDataWithoutRefreshInterval } =
    dashboardData;
  return {
    dashboardData:
      originalRefreshInterval === undefined
        ? dashboardDataWithoutRefreshInterval
        : { ...dashboardData, refresh_interval: originalRefreshInterval },
    failure: {
      type: DASHBOARD_FAILURE_TYPES.validateDashboard,
      kind: 'dashboard',
      identifier: 'refresh_interval',
      error: REFRESH_INTERVAL_WITHOUT_TIME_RANGE_ERROR,
    },
  };
};
