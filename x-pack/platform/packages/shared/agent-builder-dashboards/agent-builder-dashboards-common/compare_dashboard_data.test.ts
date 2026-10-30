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
import { DEFAULT_TIME_RANGE } from './dashboard_state_helpers';

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

  it('leaves out the time range and refresh interval that applying fills in', () => {
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
  it('leaves out the default time range and a paused refresh interval', () => {
    const state = {
      title: 'Logs',
      panels: [],
      time_range: { ...DEFAULT_TIME_RANGE, mode: 'relative' },
      refresh_interval: { pause: true, value: 60000 },
    } as unknown as DashboardState;

    const comparableState = getComparableDashboardState(state);

    expect(comparableState).not.toHaveProperty('time_range');
    expect(comparableState).not.toHaveProperty('refresh_interval');
  });

  it('keeps a time range and refresh interval the user set', () => {
    const state = {
      title: 'Logs',
      panels: [],
      time_range: { from: 'now-7d', to: 'now' },
      refresh_interval: { pause: false, value: 60000 },
    } as unknown as DashboardState;

    expect(getComparableDashboardState(state)).toMatchObject({
      time_range: { from: 'now-7d', to: 'now' },
      refresh_interval: { pause: false, value: 60000 },
    });
  });

  it('gives a dashboard the form of the attachment that applying would give it', () => {
    const state = { title: 'Logs', panels: [] } as unknown as DashboardState;
    const data = { title: 'Logs', panels: [] } as unknown as DashboardAttachmentData;

    expect(getComparableDashboardState(state)).toEqual(getComparableAttachmentState(data));
  });
});
