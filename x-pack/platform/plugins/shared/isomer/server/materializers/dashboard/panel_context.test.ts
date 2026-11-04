/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment-timezone';
import type { Filter } from '@kbn/es-query';
import { ESQLVariableType } from '@kbn/esql-types';
import type { DashboardConfig } from './config';
import { parseDashboardConfig } from './config';
import { dashboardControls } from './controls';
import { customTimeRange, dashboardContext, panelContext } from './panel_context';

const now = new Date('2025-01-15T12:00:00.000Z');

/**
 * How Kibana's browser resolves a range: core sets moment's default zone to `dateFormat:tz`, and
 * the time filter parses the start rounded down and the end rounded up.
 */
const browserResolve = (from: string, to: string, timeZone: string, at: Date = now) => {
  moment.tz.setDefault(timeZone);
  try {
    return {
      from: dateMath.parse(from, { forceNow: at })!.toISOString(),
      to: dateMath.parse(to, { roundUp: true, forceNow: at })!.toISOString(),
    };
  } finally {
    moment.tz.setDefault();
  }
};

const controlFilter = (key: string, meta: Filter['meta'] = {}): Filter => ({
  meta: { key, ...meta },
  query: { match_phrase: { [key]: 'value' } },
});

const config = (state: Record<string, unknown>, extra: Partial<DashboardConfig> = {}) => ({
  ...parseDashboardConfig({ title: 'Dashboard', ...state }),
  ...extra,
});

describe('dashboardContext', () => {
  it("takes the dashboard's saved time range, query and filters, resolved against now", () => {
    const dashboard = config({
      time_range: { from: 'now-7d/d', to: 'now' },
      query: { expression: 'response:200', language: 'kql' },
      filters: [
        { type: 'condition', condition: { field: 'geo.src', operator: 'is', value: 'US' } },
      ],
    });
    const context = dashboardContext(dashboard, dashboardControls(dashboard), {}, now);
    // Without a time zone in the context or `dateFormat:tz`, the range resolves as UTC.
    expect(context.timeRange).toEqual(browserResolve('now-7d/d', 'now', 'UTC'));
    expect(context.query).toEqual({ query: 'response:200', language: 'kuery' });
    expect(context.savedFilters).toHaveLength(1);
    expect(context.savedFilters[0].meta.key).toBe('geo.src');
  });

  it("rounds the saved range in the user's `dateFormat:tz`, then the context's time zone", () => {
    // 03:00 UTC on January 15 is still January 14 in New York.
    const early = new Date('2025-01-15T03:00:00.000Z');
    const saved = { time_range: { from: 'now-7d/d', to: 'now/d' } };
    const inNewYork = config(saved, {
      resolved: { controlFilters: [], unappliedControls: [], timeZone: 'America/New_York' },
    });
    expect(dashboardContext(inNewYork, [], {}, early).timeRange).toEqual(
      browserResolve('now-7d/d', 'now/d', 'America/New_York', early)
    );
    expect(dashboardContext(inNewYork, [], {}, early).timeRange).toEqual({
      from: '2025-01-07T05:00:00.000Z',
      to: '2025-01-15T04:59:59.999Z',
    });
    expect(dashboardContext(inNewYork, [], { timeZone: 'Asia/Kolkata' }, early).timeRange).toEqual(
      browserResolve('now-7d/d', 'now/d', 'Asia/Kolkata', early)
    );
  });

  it("keeps the request's time range and query over the dashboard's", () => {
    const dashboard = config({
      time_range: { from: 'now-7d/d', to: 'now' },
      query: { expression: 'response:200', language: 'kql' },
    });
    const timeRange = { from: '2025-01-01T00:00:00.000Z', to: '2025-01-02T00:00:00.000Z' };
    const context = dashboardContext(
      dashboard,
      [],
      { timeRange, query: { query: 'a', language: 'kuery' } },
      now
    );
    expect(context.timeRange).toEqual(timeRange);
    expect(context.query).toBeUndefined();
  });

  it("falls back to Kibana's default time range", () => {
    const dashboard = config(
      {},
      {
        resolved: {
          controlFilters: [],
          unappliedControls: [],
          timeDefaults: { from: 'now-15m', to: 'now' },
        },
      }
    );
    expect(dashboardContext(dashboard, [], {}, now).timeRange).toEqual({
      from: '2025-01-15T11:45:00.000Z',
      to: '2025-01-15T12:00:00.000Z',
    });
  });

  it("puts the request's ES|QL variables in place of the controls' of the same name", () => {
    const dashboard = config({
      pinned_panels: [
        {
          id: 'control',
          type: 'esql_control',
          config: {
            variable_name: 'host',
            variable_type: 'values',
            control_type: 'STATIC_VALUES',
            available_options: ['a', 'b'],
            selected_options: ['a'],
          },
        },
      ],
    });
    const requested = { key: 'host', value: 'b', type: ESQLVariableType.VALUES };
    const { esqlVariables } = dashboardContext(
      dashboard,
      dashboardControls(dashboard),
      { esqlVariables: [requested] },
      now
    );
    expect(esqlVariables).toEqual([requested]);
  });
});

describe('panelContext', () => {
  const global = controlFilter('global', { controlledBy: 'pinned' });
  const sectionA = controlFilter('a', { controlledBy: 'control-a', group: 'section-a' });
  const saved = controlFilter('saved');
  const dashboard = {
    timeRange: { from: '2025-01-08T00:00:00.000Z', to: '2025-01-15T12:00:00.000Z' },
    controlFilters: [global, sectionA],
    savedFilters: [saved],
  };

  it("applies section controls only to their section's panels, as Kibana's fetch context does", () => {
    expect(panelContext(dashboard, { id: 'p1', config: {} }).filters).toEqual([global, saved]);
    expect(
      panelContext(dashboard, { id: 'p2', sectionId: 'section-a', config: {} }).filters
    ).toEqual([global, sectionA, saved]);
  });

  it("leaves a control's own filter off its panel", () => {
    expect(
      panelContext(dashboard, { id: 'control-a', sectionId: 'section-a', config: {} }).filters
    ).toEqual([global, saved]);
  });

  it("prefers the panel's custom time range, then the time slider's, then the dashboard's", () => {
    const timeslice = { from: '2025-01-10T00:00:00.000Z', to: '2025-01-11T00:00:00.000Z' };
    const custom = { from: 'now-1h', to: 'now' };
    expect(panelContext(dashboard, { config: {} }).timeRange).toEqual(dashboard.timeRange);
    expect(panelContext({ ...dashboard, timeslice }, { config: {} }).timeRange).toEqual(timeslice);
    expect(
      panelContext({ ...dashboard, timeslice }, { config: { time_range: custom } }).timeRange
    ).toEqual(custom);
  });
});

describe('customTimeRange', () => {
  it('reads a time range only when it has both ends', () => {
    expect(customTimeRange({ time_range: { from: 'now-1h', to: 'now' } })).toEqual({
      from: 'now-1h',
      to: 'now',
    });
    expect(customTimeRange({ time_range: { from: 'now-1h' } })).toBeUndefined();
    expect(customTimeRange({})).toBeUndefined();
  });
});
