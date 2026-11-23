/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_FAILURE_TYPES } from './failure_types';
import { revertRefreshIntervalWithoutTimeRange } from './refresh_interval';

const RUNNING = { pause: false, value: 30000 };
const PAUSED = { pause: true, value: 60000 };
const TIME_RANGE = { from: 'now-7d', to: 'now' };

const createDashboard = (
  fields: Partial<DashboardAttachmentData> = {}
): DashboardAttachmentData => ({
  title: 'Dashboard',
  panels: [],
  ...fields,
});

const refreshIntervalFailure = {
  type: DASHBOARD_FAILURE_TYPES.validateDashboard,
  kind: 'dashboard',
  identifier: 'refresh_interval',
  error: expect.stringContaining('Set time_range in the same call'),
};

describe('revertRefreshIntervalWithoutTimeRange', () => {
  it('restores the previous refresh interval of a dashboard without a time range', () => {
    const result = revertRefreshIntervalWithoutTimeRange({
      originalDashboardData: createDashboard({ refresh_interval: PAUSED }),
      dashboardData: createDashboard({ title: 'Renamed', refresh_interval: RUNNING }),
    });

    expect(result).toEqual({
      dashboardData: createDashboard({ title: 'Renamed', refresh_interval: PAUSED }),
      failure: refreshIntervalFailure,
    });
  });

  it.each([
    ['a new dashboard', undefined],
    ['a dashboard that had none', createDashboard()],
  ])('removes a refresh interval set on %s without a time range', (_, originalDashboardData) => {
    const result = revertRefreshIntervalWithoutTimeRange({
      originalDashboardData,
      dashboardData: createDashboard({ refresh_interval: RUNNING }),
    });

    expect(result.dashboardData).not.toHaveProperty('refresh_interval');
    expect(result.failure).toEqual(refreshIntervalFailure);
  });

  it('reverts a paused refresh interval when the dashboard has no time range', () => {
    const result = revertRefreshIntervalWithoutTimeRange({
      originalDashboardData: createDashboard({ refresh_interval: RUNNING }),
      dashboardData: createDashboard({ refresh_interval: PAUSED }),
    });

    expect(result.dashboardData.refresh_interval).toEqual(RUNNING);
    expect(result.failure).toEqual(refreshIntervalFailure);
  });

  it('keeps a changed refresh interval when the dashboard has a time range', () => {
    const dashboardData = createDashboard({ time_range: TIME_RANGE, refresh_interval: RUNNING });

    expect(
      revertRefreshIntervalWithoutTimeRange({
        originalDashboardData: createDashboard(),
        dashboardData,
      })
    ).toEqual({ dashboardData });
  });

  it('keeps an unchanged refresh interval of a dashboard without a time range', () => {
    const dashboardData = createDashboard({ refresh_interval: RUNNING });

    expect(
      revertRefreshIntervalWithoutTimeRange({
        originalDashboardData: createDashboard({ refresh_interval: { ...RUNNING } }),
        dashboardData,
      })
    ).toEqual({ dashboardData });
  });

  it('leaves a dashboard without a refresh interval unchanged', () => {
    const dashboardData = createDashboard();

    expect(
      revertRefreshIntervalWithoutTimeRange({ originalDashboardData: undefined, dashboardData })
    ).toEqual({ dashboardData });
  });
});
