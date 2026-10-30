/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common/types';
import { getDashboardSnapshot, isAttachmentShownInDashboard } from './apply_attachment';

const timeRange = { from: 'now-7d', to: 'now' };

const createDashboardApi = (attributes: object) =>
  ({
    getSerializedState: () => ({ attributes }),
    diffStates: (baseline: unknown, current: unknown) =>
      isEqual(baseline, current) ? {} : current,
  } as unknown as DashboardApi);

describe('isAttachmentShownInDashboard', () => {
  const data = { title: 'Logs', panels: [], time_range: timeRange } as DashboardAttachmentData;

  it("ignores the dashboard's refresh interval when the attachment sets none", () => {
    const api = createDashboardApi({
      title: 'Logs',
      panels: [],
      time_range: timeRange,
      refresh_interval: { pause: false, value: 60000 },
    });

    expect(isAttachmentShownInDashboard(api, getDashboardSnapshot(api), data)).toBe(true);
  });

  it('compares the refresh interval the attachment sets', () => {
    const api = createDashboardApi({
      title: 'Logs',
      panels: [],
      time_range: timeRange,
      refresh_interval: { pause: false, value: 60000 },
    });

    expect(
      isAttachmentShownInDashboard(api, getDashboardSnapshot(api), {
        ...data,
        refresh_interval: { pause: true, value: 60000 },
      })
    ).toBe(false);
  });
});
