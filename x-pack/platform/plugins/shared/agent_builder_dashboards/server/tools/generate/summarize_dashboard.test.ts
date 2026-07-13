/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { summarizeDashboard } from './summarize_dashboard';

const grid = { x: 0, y: 0, w: 24, h: 12 };

describe('summarizeDashboard', () => {
  it('includes compact semantic identity for Lens and Vega panels', () => {
    const dashboard: DashboardAttachmentData = {
      title: 'Service health',
      panels: [
        {
          id: 'metric-1',
          type: LENS_EMBEDDABLE_TYPE,
          grid,
          config: {
            type: 'metric',
            title: 'Error rate',
            description: 'Failed requests as a percentage',
            data_source: {
              type: 'esql',
              query: 'FROM logs-* | STATS error_rate = AVG(is_error)',
            },
          },
        },
        {
          id: 'vega-1',
          type: VEGA_VIS_TYPE,
          grid: { ...grid, x: 24 },
          config: {
            spec: JSON.stringify({
              title: { text: 'Latency distribution' },
              data: {
                url: {
                  '%type%': 'esql',
                  query: 'FROM logs-* | STATS p95 = PERCENTILE(duration, 95)',
                },
              },
              mark: 'bar',
            }),
          },
        },
      ],
    };

    expect(summarizeDashboard(dashboard).panels).toEqual([
      expect.objectContaining({
        id: 'metric-1',
        renderer: 'lens',
        chartType: 'metric',
        title: 'Error rate',
        description: 'Failed requests as a percentage',
        esql: ['FROM logs-* | STATS error_rate = AVG(is_error)'],
      }),
      expect.objectContaining({
        id: 'vega-1',
        renderer: 'vega',
        title: 'Latency distribution',
        esql: ['FROM logs-* | STATS p95 = PERCENTILE(duration, 95)'],
      }),
    ]);
  });

  it('keeps query context bounded and tolerates an invalid Vega spec', () => {
    const longQuery = `FROM logs-* | ${'EVAL value = 1 | '.repeat(80)}`;
    const dashboard: DashboardAttachmentData = {
      title: 'Bounded',
      panels: [
        {
          id: 'xy-1',
          type: LENS_EMBEDDABLE_TYPE,
          grid,
          config: {
            type: 'xy',
            layers: [
              { data_source: { type: 'esql', query: longQuery } },
              { data_source: { type: 'esql', query: 'FROM metrics-* | LIMIT 10' } },
              { data_source: { type: 'esql', query: 'FROM ignored-* | LIMIT 10' } },
            ],
          },
        },
        { id: 'vega-broken', type: VEGA_VIS_TYPE, grid, config: { spec: '{' } },
      ],
    };

    const [xySummary, vegaSummary] = summarizeDashboard(dashboard).panels;
    const esql = 'esql' in xySummary ? xySummary.esql : undefined;
    expect(esql).toHaveLength(2);
    expect(esql?.[0]).toHaveLength(512);
    expect(vegaSummary).toEqual(expect.objectContaining({ id: 'vega-broken', renderer: 'vega' }));
  });
});
