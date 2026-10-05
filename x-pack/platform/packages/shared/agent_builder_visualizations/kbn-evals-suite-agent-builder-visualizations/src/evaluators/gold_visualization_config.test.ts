/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractGoldChartForm,
  extractGoldChartType,
  extractGoldQuery,
  extractGoldRenderer,
  hasStructuralGoldConfig,
  type VisualizationGoldConfig,
} from './gold_visualization_config';

const QUERY = `FROM kibana_sample_data_logs
| STATS \`Request Count\` = COUNT(*) BY response.keyword`;

describe('extractGoldQuery', () => {
  it('reads data_source.query from a chart-level gold config', () => {
    expect(
      extractGoldQuery({
        config: {
          type: 'metric',
          data_source: { type: 'esql', query: QUERY },
        },
      })
    ).toBe(QUERY);
  });

  it('reads the first layer data_source.query for xy configs', () => {
    expect(
      extractGoldQuery({
        config: {
          type: 'xy',
          layers: [
            {
              type: 'bar',
              data_source: { type: 'esql', query: QUERY },
              x: { column: 'response.keyword' },
            },
          ],
        },
      })
    ).toBe(QUERY);
  });

  it('returns an empty string when no gold query is present', () => {
    expect(extractGoldQuery({ config: { type: 'metric' } })).toBe('');
  });
});

describe('extractGoldChartType', () => {
  it('reads config.type', () => {
    expect(extractGoldChartType({ config: { type: 'pie' } })).toBe('pie');
  });

  it('is undefined when the config has no type', () => {
    expect(extractGoldChartType({ config: { metrics: [] } })).toBeUndefined();
  });
});

describe('extractGoldChartForm', () => {
  it('collects chart type and per-layer types from a Lens gold', () => {
    expect(
      extractGoldChartForm({
        config: {
          type: 'xy',
          layers: [{ type: ['bar', 'bar_horizontal'], x: { column: 'a' } }],
        },
      })
    ).toEqual({ chartType: 'xy', layerTypes: [['bar', 'bar_horizontal']] });
  });

  it('collects the mark from a Vega gold', () => {
    expect(extractGoldChartForm({ config: { spec: { mark: 'point' } } })).toEqual({
      mark: 'point',
    });
    expect(extractGoldChartForm({ config: { spec: { mark: { type: 'circle' } } } })).toEqual({
      mark: 'circle',
    });
  });

  it('returns undefined for a query-only gold', () => {
    expect(
      extractGoldChartForm({ config: { data_source: { type: 'esql', query: QUERY } } })
    ).toBeUndefined();
  });
});

describe('extractGoldRenderer', () => {
  it('uses an explicit renderer', () => {
    expect(extractGoldRenderer({ renderer: 'vega', config: { type: 'xy' } })).toBe('vega');
  });

  it('infers vega from a gold spec', () => {
    expect(extractGoldRenderer({ config: { spec: { mark: 'point' } } })).toBe('vega');
  });

  it('does not infer lens when no renderer is declared', () => {
    expect(extractGoldRenderer({ config: { type: 'metric' } })).toBeUndefined();
  });
});

describe('hasStructuralGoldConfig', () => {
  it('is false when gold is only a data_source', () => {
    const gold = {
      data_source: { type: 'esql', query: QUERY },
    } satisfies VisualizationGoldConfig;
    expect(hasStructuralGoldConfig(gold)).toBe(false);
  });

  it('is true when gold declares anything besides data_source', () => {
    const metricGold = {
      type: 'metric',
      data_source: { type: 'esql', query: QUERY },
    } satisfies VisualizationGoldConfig;
    const vegaGold = {
      spec: { mark: 'point' },
    } satisfies VisualizationGoldConfig;
    expect(hasStructuralGoldConfig(metricGold)).toBe(true);
    expect(hasStructuralGoldConfig(vegaGold)).toBe(true);
  });
});

describe('VisualizationGoldConfig', () => {
  it('accepts a partial of each visualization type used by the suite', () => {
    const golds = [
      {
        type: 'xy',
        layers: [
          {
            type: ['bar', 'bar_horizontal'],
            x: { column: 'response.keyword' },
            y: [{ column: 'Request Count' }],
          },
        ],
      },
      { type: 'metric', metrics: [{ column: 'c' }] },
      { type: 'pie', metrics: [{ column: 'c' }], group_by: [{ column: 'd' }] },
      { type: 'tag_cloud', metric: { column: 'c' }, tag_by: { column: 'e' } },
      { type: 'data_table', rows: [{ column: 'e' }], metrics: [{ column: 'c' }] },
      { type: 'heatmap', x: { column: 'h' }, y: { column: 'r' }, metric: { column: 'c' } },
      { type: 'treemap', metrics: [{ column: 'c' }], group_by: [{ column: 'h' }] },
      { type: 'gauge', metric: { column: 'c' } },
      { data_source: { type: 'esql', query: QUERY } },
      {
        data_source: { type: 'esql', query: QUERY },
        spec: {
          mark: 'point',
          encoding: {
            x: { field: 'Average Bytes' },
            y: { field: 'Request Count' },
            size: { field: 'Unique URLs' },
          },
        },
      },
    ] as const satisfies readonly VisualizationGoldConfig[];

    expect(golds).toHaveLength(10);
    expect(hasStructuralGoldConfig(golds[8])).toBe(false);
  });
});
