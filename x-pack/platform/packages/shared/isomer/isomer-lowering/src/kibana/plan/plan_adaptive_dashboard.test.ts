/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptiveDashboard } from '../model/adaptive_dashboard';

import { planAdaptiveDashboard } from './plan_adaptive_dashboard';
import { isDashboardGrid } from '../adaptive_nodes';

const dashboard: AdaptiveDashboard = {
  id: 'dash-1',
  title: 'Checkout health',
  timeRange: { from: 'now-24h', to: 'now' },
  panels: [
    {
      type: 'lens',
      lens: {
        id: 'panel-1',
        title: 'Requests',
        chart: {
          kind: 'metric',
          primary: { id: 'requests', label: 'Requests' },
        },
        query: { esql: 'FROM logs-* | STATS requests = COUNT(*)' },
      },
    },
    {
      type: 'lens',
      lens: {
        id: 'panel-2',
        title: 'Errors',
        chart: { kind: 'metric', primary: { id: 'errors', label: 'Errors' } },
        query: { esql: 'FROM logs-* | STATS errors = COUNT(*)' },
      },
    },
    {
      type: 'markdown',
      title: 'Note',
      body: 'Window is the last 24 hours.',
    },
  ],
  layoutHint: {
    rows: [[0, 1], [2]],
    grid: {
      columns: 24,
      rowHeight: 20,
      items: [
        { panelIndex: 0, x: 0, y: 0, w: 12, h: 4 },
        { panelIndex: 1, x: 12, y: 0, w: 12, h: 4 },
        { panelIndex: 2, x: 0, y: 4, w: 24, h: 6 },
      ],
    },
  },
};

describe('planAdaptiveDashboard', () => {
  it('emits one query/binding per Lens panel and surfaces non-Lens panels inline', () => {
    const plan = planAdaptiveDashboard(dashboard, { layout: 'rows' });

    expect(plan.queries).toHaveLength(2);
    expect(plan.bindings).toHaveLength(2);

    // Row layout: body[0] is a row with two half-width items.
    expect(plan.spec.body[0]?.type).toBe('row');
    const [row] = plan.spec.body as Array<{ items?: Array<{ width?: string }> }>;
    expect(row?.items).toHaveLength(2);
    expect(row?.items?.[0]?.width).toBe('half');

    // body[1] is the markdown panel rendered through the markdown-capable text primitive.
    expect(plan.spec.body[1]?.type).toBe('text');
    if (plan.spec.body[1]?.type === 'text') {
      expect(plan.spec.body[1].format).toBe('markdown');
    }

    // Bindings target the row items.
    expect(plan.bindings[0]?.specPath).toEqual(['body', 0, 'items', 0, 'node']);
    expect(plan.bindings[1]?.specPath).toEqual(['body', 0, 'items', 1, 'node']);

    // Time range is merged into the per-panel query params.
    expect(plan.queries[0]?.query.params?.['_tstart']).toBe('now-24h');
    expect(plan.queries[1]?.query.params?.['_tend']).toBe('now');
  });

  it('injects dashboard-level ES|QL filters into each panel query', () => {
    const filtered: AdaptiveDashboard = {
      ...dashboard,
      filters: [
        { label: 'prod', esql: '`env` == "prod"' },
        {
          label: 'kql',
          kql: 'service.name: "checkout"',
          esql: '`service.name` == "checkout"',
        },
      ],
    };
    const plan = planAdaptiveDashboard(filtered, { layout: 'flat' });
    expect(plan.queries[0]?.query.esql).toContain(
      '| WHERE (`env` == "prod") AND (`service.name` == "checkout") | STATS'
    );
    expect(plan.queries[1]?.query.esql).toContain('`env` == "prod"');
  });

  it('leaves a panel that opted out of global filters unfiltered', () => {
    // `FormBasedLayer.ignoreGlobalFilters` was modelled and read by nothing,
    // so a layer authored to ignore dashboard context still received every
    // dashboard predicate and returned different numbers after conversion.
    const filtered: AdaptiveDashboard = {
      ...dashboard,
      filters: [{ label: 'prod', esql: '`env` == "prod"' }],
      panels: dashboard.panels.map((panel, index) =>
        index === 1 && panel.type === 'lens'
          ? {
              ...panel,
              lens: {
                ...panel.lens,
                query: { ...panel.lens.query, ignoreGlobalFilters: true },
              },
            }
          : panel
      ),
    };
    const plan = planAdaptiveDashboard(filtered, { layout: 'flat' });

    expect(plan.queries[0]?.query.esql).toContain('`env` == "prod"');
    expect(plan.queries[1]?.query.esql).not.toContain('`env` == "prod"');
    // The time range is a separate Kibana control and still applies.
    expect(plan.queries[1]?.query.params?.['_tstart']).toBe('now-24h');
  });

  it('can preserve Kibana grid geometry for adaptive dashboard rendering', () => {
    const plan = planAdaptiveDashboard(dashboard, { layout: 'auto' });

    expect(plan.spec.body[0]?.type).toBe('dashboardGrid');
    if (isDashboardGrid(plan.spec.body[0])) {
      expect(plan.spec.body[0].mode).toBe('auto');
      expect(plan.spec.body[0].columns).toBe(24);
      expect(plan.spec.body[0].rowHeight).toBe(20);
      expect(plan.spec.body[0].items.map(({ x, y, w, h }) => ({ x, y, w, h }))).toEqual([
        { x: 0, y: 0, w: 12, h: 4 },
        { x: 12, y: 0, w: 12, h: 4 },
        { x: 0, y: 4, w: 24, h: 6 },
      ]);
    }
    expect(plan.bindings.map((binding) => binding.specPath)).toEqual([
      ['body', 0, 'items', 0, 'node'],
      ['body', 0, 'items', 1, 'node'],
    ]);
  });

  it('can force grid-ordered panels into vertical flow', () => {
    const plan = planAdaptiveDashboard(dashboard, { layout: 'flow' });

    expect(plan.spec.body[0]?.type).toBe('dashboardGrid');
    if (isDashboardGrid(plan.spec.body[0])) {
      expect(plan.spec.body[0].mode).toBe('flow');
      expect(plan.spec.body[0].items.map((item) => item.x)).toEqual([0, 12, 0]);
    }
  });

  it('threads each Lens panel`s number format through the dashboard plan', () => {
    const formatted: AdaptiveDashboard = {
      id: 'dash-format',
      title: 'Conversion rate',
      timeRange: { from: 'now-24h', to: 'now' },
      panels: [
        {
          type: 'lens',
          lens: {
            id: 'panel-pct',
            title: 'Delayed',
            chart: {
              kind: 'metric',
              primary: { id: 'pct', label: 'Delayed' },
            },
            query: { esql: 'FROM flights | STATS pct = AVG(delayed)' },
            format: { kind: 'percent', precision: 1 },
          },
        },
      ],
    };
    const plan = planAdaptiveDashboard(formatted);
    expect(plan.queries[0]?.format).toEqual({ kind: 'percent', precision: 1 });
  });

  it('preserves metric trend auxiliary queries for Lens panels', () => {
    const trended: AdaptiveDashboard = {
      id: 'dash-trend',
      title: 'Orders',
      panels: [
        {
          type: 'lens',
          lens: {
            id: 'orders',
            title: 'Orders',
            chart: {
              kind: 'metric',
              primary: { id: 'count', label: 'Orders' },
              trend: {
                id: 'trend_count',
                label: 'Hourly orders',
                query: {
                  esql: 'FROM orders-* | STATS trend_count = COUNT(*) BY hour = BUCKET(@timestamp, 1h)',
                },
              },
            },
            query: { esql: 'FROM orders-* | STATS count = COUNT(*)' },
          },
        },
      ],
    };
    const plan = planAdaptiveDashboard(trended);
    expect(plan.queries.map((query) => query.id)).toEqual(['orders', 'orders:trend']);
    expect(plan.bindings[0]?.auxiliaryQueryIds).toEqual({
      trend: 'orders:trend',
    });
  });

  it('falls back to flat layout when layoutHint is missing', () => {
    const { layoutHint: _unused, ...rest } = dashboard;
    void _unused;
    const flatDashboard: AdaptiveDashboard = {
      ...rest,
      panels: dashboard.panels.slice(0, 2),
    };
    const plan = planAdaptiveDashboard(flatDashboard, { layout: 'flat' });
    expect(plan.spec.body.every((node) => node.type !== 'row')).toBe(true);
    expect(plan.bindings.map((b) => b.specPath)).toEqual([
      ['body', 0],
      ['body', 1],
    ]);
  });
});
