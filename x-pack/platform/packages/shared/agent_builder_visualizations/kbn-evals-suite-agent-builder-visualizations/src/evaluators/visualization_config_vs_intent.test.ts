/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedVisualization } from '../extract_visualization';
import type { VisualizationGoldConfig } from './gold_visualization_config';
import { createVisualizationConfigVsIntentEvaluator } from './visualization_config_vs_intent';

const GOLD_QUERY = `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY response.keyword`;

const evaluate = async ({
  visualizations,
  config,
  query,
}: {
  visualizations: ExtractedVisualization[];
  config?: VisualizationGoldConfig;
  query?: string;
}) => {
  const evaluator = createVisualizationConfigVsIntentEvaluator({
    visualizationExtractor: () => visualizations,
    expectedConfigExtractor: (expected) =>
      (expected as { config?: VisualizationGoldConfig } | undefined)?.config,
  });

  return evaluator.evaluate({
    input: { question: 'unused' },
    output: { errors: [], messages: [] },
    expected: { config, query },
    metadata: {},
  });
};

describe('createVisualizationConfigVsIntentEvaluator', () => {
  it('skips when no gold config is declared', async () => {
    const result = await evaluate({
      visualizations: [{ esql: GOLD_QUERY, chartType: 'xy' }],
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('skipped');
  });

  it('skips query-only gold configs', async () => {
    const result = await evaluate({
      visualizations: [{ esql: GOLD_QUERY, chartType: 'xy' }],
      config: { data_source: { type: 'esql', query: GOLD_QUERY } },
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('skipped');
  });

  it('scores 1 when xy layer type and column roles match after alias resolution', async () => {
    const result = await evaluate({
      query: GOLD_QUERY,
      config: {
        type: 'xy',
        layers: [
          {
            type: ['bar', 'bar_horizontal'],
            x: { column: 'response.keyword' },
            y: [{ column: 'Request Count' }],
          },
        ],
      },
      visualizations: [
        {
          esql: `FROM kibana_sample_data_logs
| STATS count = COUNT(*) BY response`,
          chartType: 'xy',
          renderer: 'lens',
          visualization: {
            type: 'xy',
            layers: [
              {
                type: 'bar',
                x: { column: 'response' },
                y: [{ column: 'count' }],
              },
            ],
          },
        },
      ],
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('match');
  });

  it('scores 0 when chart type mismatches', async () => {
    const result = await evaluate({
      config: { type: 'pie' },
      visualizations: [
        {
          esql: GOLD_QUERY,
          chartType: 'xy',
          visualization: { type: 'xy', layers: [] },
        },
      ],
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('mismatch');
  });

  it('scores 0 when a gold y column is missing', async () => {
    const result = await evaluate({
      query: GOLD_QUERY,
      config: {
        type: 'xy',
        layers: [
          {
            type: 'bar',
            y: [{ column: 'Request Count' }, { column: 'Total Bytes' }],
          },
        ],
      },
      visualizations: [
        {
          esql: `FROM kibana_sample_data_logs | STATS count = COUNT(*) BY response.keyword`,
          visualization: {
            type: 'xy',
            layers: [{ type: 'bar', y: [{ column: 'count' }] }],
          },
        },
      ],
    });

    expect(result.score).toBe(0);
  });

  it('allows extra actual y series beyond the gold bindings', async () => {
    const result = await evaluate({
      query: GOLD_QUERY,
      config: {
        type: 'xy',
        layers: [{ type: 'bar', y: [{ column: 'Request Count' }] }],
      },
      visualizations: [
        {
          esql: `FROM kibana_sample_data_logs
| STATS count = COUNT(*), bytes = SUM(bytes) BY response.keyword`,
          visualization: {
            type: 'xy',
            layers: [{ type: 'bar', y: [{ column: 'count' }, { column: 'bytes' }] }],
          },
        },
      ],
    });

    expect(result.score).toBe(1);
  });

  it('matches heatmap axes after alias resolution', async () => {
    const goldQuery = `FROM kibana_sample_data_logs
| EVAL hour = DATE_EXTRACT("HOUR_OF_DAY", @timestamp)
| STATS \`Request Count\` = COUNT(*) BY hour, response.keyword`;

    const result = await evaluate({
      query: goldQuery,
      config: {
        type: 'heatmap',
        x: { column: 'hour' },
        y: { column: 'response.keyword' },
        metric: { column: 'Request Count' },
      },
      visualizations: [
        {
          esql: `FROM kibana_sample_data_logs
| EVAL h = HOUR(@timestamp)
| STATS c = COUNT(*) BY h, response.keyword`,
          visualization: {
            type: 'heatmap',
            x: { column: 'h' },
            y: { column: 'response.keyword' },
            metric: { column: 'c' },
          },
        },
      ],
    });

    expect(result.score).toBe(1);
  });

  it('matches a Vega spec mark and encoding fields after alias resolution', async () => {
    const query = `FROM kibana_sample_data_logs
| STATS \`Average Bytes\` = AVG(bytes), \`Request Count\` = COUNT(*), \`Unique URLs\` = COUNT_DISTINCT(url.keyword) BY clientip`;

    const result = await evaluate({
      query,
      config: {
        spec: {
          mark: 'point',
          encoding: {
            x: { field: 'Average Bytes' },
            y: { field: 'Request Count' },
            size: { field: 'Unique URLs' },
          },
        },
      },
      visualizations: [
        {
          esql: `FROM kibana_sample_data_logs
| STATS avg_bytes = AVG(bytes), requests = COUNT(*), urls = COUNT_DISTINCT(url.keyword) BY clientip`,
          renderer: 'vega',
          visualization: {
            spec: JSON.stringify({
              mark: { type: 'circle' },
              encoding: {
                x: { field: 'avg_bytes' },
                y: { field: 'requests' },
                size: { field: 'urls' },
              },
            }),
          },
        },
      ],
    });

    expect(result.score).toBe(1);
  });

  it('scores 0 when no visualization was produced but a structural config was expected', async () => {
    const result = await evaluate({
      config: { type: 'metric', metrics: [{ column: 'Total Requests' }] },
      visualizations: [],
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('no-visualization');
  });
});
