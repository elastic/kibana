/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptiveLens } from '../model/adaptive_lens';

import { planAdaptiveLens } from './plan_adaptive_lens';

const xyLens: AdaptiveLens = {
  id: 'lens-xy',
  title: 'Latency by region',
  chart: {
    kind: 'xy',
    mode: 'line',
    xAxis: { id: 'col-time', label: 'Time' },
    yAxis: { id: 'col-p95', label: 'p95' },
    series: [{ id: 'col-p95', label: 'p95' }],
  },
  query: {
    esql: 'FROM logs-* | STATS p95 = PERCENTILE(latency, 95) BY @timestamp',
  },
};

describe('planAdaptiveLens', () => {
  it('produces a single-panel ViewPlan with a loading-state spec', () => {
    const plan = planAdaptiveLens(xyLens);
    expect(plan.queries).toHaveLength(1);
    expect(plan.bindings.map(({ specPath }) => specPath)).toEqual([['body', 0]]);

    expect(plan.spec.type).toBe('view');
    expect(plan.spec.title).toBe('Latency by region');
    expect(plan.spec.body).toHaveLength(1);
  });

  it('attaches the lens query and chart to the queries list', () => {
    const plan = planAdaptiveLens(xyLens);
    expect(plan.queries[0]?.id).toBe(xyLens.id);
    expect(plan.queries[0]?.query.esql).toBe(xyLens.query.esql);
    expect(plan.queries[0]?.chart).toBe(xyLens.chart);
  });

  it('records a binding pointing at body[0]', () => {
    const plan = planAdaptiveLens(xyLens);
    expect(plan.bindings[0]?.specPath).toEqual(['body', 0]);
    expect(plan.bindings[0]?.queryId).toBe(xyLens.id);
  });

  it('emits an auxiliary query for metric sibling trendlines', () => {
    const metricLens: AdaptiveLens = {
      id: 'metric-with-trend',
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
    };
    const plan = planAdaptiveLens(metricLens);

    expect(plan.queries).toHaveLength(2);
    expect(plan.queries[1]?.id).toBe('metric-with-trend:trend');
    expect(plan.queries[1]?.query.esql).toContain('trend_count');
    expect(plan.bindings[0]?.auxiliaryQueryIds?.trend).toBe('metric-with-trend:trend');
  });

  it('passes through caller-supplied diagnostics', () => {
    const plan = planAdaptiveLens(xyLens, {
      diagnostics: [
        {
          level: 'info',
          code: 'test.passthrough',
          message: 'carried from lowering',
        },
      ],
    });
    expect(plan.diagnostics).toEqual([
      {
        level: 'info',
        code: 'test.passthrough',
        message: 'carried from lowering',
      },
    ]);
  });
});
