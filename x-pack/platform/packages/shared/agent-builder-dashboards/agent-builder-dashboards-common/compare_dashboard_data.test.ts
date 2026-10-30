/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { DashboardAttachmentData } from './types';
import {
  getComparableAttachmentState,
  getComparableDashboardState,
} from './compare_dashboard_data';

const grid = { x: 0, y: 0, w: 24, h: 15 };

const metricApiConfig = {
  type: 'metric' as const,
  title: 'Count',
  data_source: { type: 'esql' as const, query: 'FROM logs | STATS count = COUNT(*)' },
  metrics: [{ type: 'primary' as const, column: 'count' }],
};

describe('getComparableAttachmentState', () => {
  it('keeps Lens panels in the API format, with the attributes the Lens comparator reads', () => {
    const data = {
      title: 'Logs',
      panels: [{ type: LENS_EMBEDDABLE_TYPE, id: 'p1', grid, config: metricApiConfig }],
    } as unknown as DashboardAttachmentData;

    const [panel] = getComparableAttachmentState(data).panels as Array<{
      config: Record<string, unknown>;
    }>;

    expect(panel.config).toHaveProperty('attributes');
    expect(panel.config).toMatchObject(metricApiConfig);
  });

  it('has no time range or refresh interval when the attachment sets none', () => {
    const data = { title: 'Logs', panels: [] } as unknown as DashboardAttachmentData;

    const state = getComparableAttachmentState(data);

    expect(state).not.toHaveProperty('time_range');
    expect(state).not.toHaveProperty('refresh_interval');
  });

  it('gives an agent-written Lens chart the defaults the dashboard serializes', () => {
    const data = {
      title: 'Logs',
      panels: [{ type: LENS_EMBEDDABLE_TYPE, id: 'p1', grid, config: metricApiConfig }],
    } as unknown as DashboardAttachmentData;
    const serializedState = getComparableAttachmentState(data);

    expect(getComparableDashboardState(serializedState).panels).toEqual(serializedState.panels);
  });
});

describe('getComparableDashboardState', () => {
  it('keeps the time range and refresh interval', () => {
    const state = {
      title: 'Logs',
      panels: [],
      time_range: { from: 'now-24h', to: 'now' },
      refresh_interval: { pause: true, value: 60000 },
    } as unknown as DashboardState;

    expect(getComparableDashboardState(state)).toMatchObject({
      time_range: { from: 'now-24h', to: 'now' },
      refresh_interval: { pause: true, value: 60000 },
    });
  });

  it('gives a dashboard the form of the attachment that applying would give it', () => {
    const state = { title: 'Logs', panels: [] } as unknown as DashboardState;
    const data = { title: 'Logs', panels: [] } as unknown as DashboardAttachmentData;

    expect(getComparableDashboardState(state)).toEqual(getComparableAttachmentState(data));
  });
});
