/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { panelNeedsPrettify } from './panel_needs_prettify';

describe('panelNeedsPrettify', () => {
  it('skips chart types with no prettifyRules', () => {
    expect(
      panelNeedsPrettify(SupportedChartType.Pie, {
        type: 'pie',
        layers: [{ data_source: { type: 'esql', query: 'FROM logs' } }],
      })
    ).toBe(false);
    expect(
      panelNeedsPrettify(SupportedChartType.Gauge, {
        type: 'gauge',
        data_source: { type: 'esql', query: 'FROM logs' },
      })
    ).toBe(false);
  });

  it('skips metrics that already omit auto color and use right alignment', () => {
    expect(
      panelNeedsPrettify(SupportedChartType.Metric, {
        type: 'metric',
        metrics: [{ type: 'primary', operation: 'count', column: 'count' }],
      })
    ).toBe(false);
  });

  it('refreshes metrics with redundant auto color', () => {
    expect(
      panelNeedsPrettify(SupportedChartType.Metric, {
        type: 'metric',
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            column: 'count',
            color: { type: 'auto' },
          },
        ],
      })
    ).toBe(true);
  });

  it('refreshes metrics with non-right value alignment', () => {
    expect(
      panelNeedsPrettify(SupportedChartType.Metric, {
        type: 'metric',
        metrics: [{ type: 'primary', operation: 'count', column: 'count' }],
        styling: { metric: { value: { alignment: 'left' } } },
      })
    ).toBe(true);
  });

  it('skips XY layers without explicit color overrides', () => {
    expect(
      panelNeedsPrettify(SupportedChartType.XY, {
        type: 'xy',
        layers: [
          {
            type: 'series',
            x: { column: '@timestamp' },
            y: [{ column: 'count' }],
          },
        ],
      })
    ).toBe(false);
  });

  it('refreshes XY layers with explicit series or breakdown colors', () => {
    expect(
      panelNeedsPrettify(SupportedChartType.XY, {
        type: 'xy',
        layers: [
          {
            type: 'series',
            x: { column: '@timestamp' },
            y: [{ column: 'count', color: { type: 'static', color: '#000' } }],
          },
        ],
      })
    ).toBe(true);

    expect(
      panelNeedsPrettify(SupportedChartType.XY, {
        type: 'xy',
        layers: [
          {
            type: 'series',
            x: { column: '@timestamp' },
            y: [{ column: 'count' }],
            breakdown_by: {
              column: 'service',
              color: { type: 'categorical' },
            },
          },
        ],
      })
    ).toBe(true);
  });
});
