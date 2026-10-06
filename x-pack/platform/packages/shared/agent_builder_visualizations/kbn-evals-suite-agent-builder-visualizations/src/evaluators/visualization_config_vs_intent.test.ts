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

  // Gold ES|QL lives inside the config; tests pass it separately for brevity.
  const gold = query === undefined ? config : { ...config, data_source: { type: 'esql', query } };

  return evaluator.evaluate({
    input: { question: 'unused' },
    output: { errors: [], messages: [] },
    expected: { config: gold },
    metadata: {},
  });
};

const mismatchesOf = (result: { metadata?: Record<string, unknown> }) =>
  (result.metadata?.visualizations as Array<{ mismatches: string[] }>).flatMap(
    (detail) => detail.mismatches
  );

describe('createVisualizationConfigVsIntentEvaluator', () => {
  it('skips when no gold config is declared', async () => {
    const result = await evaluate({
      visualizations: [{ esql: GOLD_QUERY, chartType: 'xy' }],
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('skips query-only gold configs', async () => {
    const result = await evaluate({
      visualizations: [{ esql: GOLD_QUERY, chartType: 'xy' }],
      config: { data_source: { type: 'esql', query: GOLD_QUERY } },
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('skips gold configs that only declare type and mark, which the chart-form judge owns', async () => {
    const lens = await evaluate({
      visualizations: [{ esql: GOLD_QUERY, chartType: 'xy', visualization: { type: 'pie' } }],
      config: { type: 'xy', layers: [{ type: 'bar' }] },
    });
    const vega = await evaluate({
      visualizations: [
        { esql: GOLD_QUERY, renderer: 'vega', visualization: { spec: '{"mark":"bar"}' } },
      ],
      config: { spec: { mark: 'point' } },
    });

    expect(lens.label).toBe('skipped');
    expect(vega.label).toBe('skipped');
  });

  it('scores 1 when column roles match after alias resolution', async () => {
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
            layers: [{ type: 'line', x: { column: 'response' }, y: [{ column: 'count' }] }],
          },
        },
      ],
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('match');
    expect(result.metadata).toEqual(expect.objectContaining({ checkedLeaves: 2 }));
  });

  it('gives partial credit when one gold y column is missing', async () => {
    const result = await evaluate({
      query: GOLD_QUERY,
      config: {
        type: 'xy',
        layers: [{ type: 'bar', y: [{ column: 'Request Count' }, { column: 'Total Bytes' }] }],
      },
      visualizations: [
        {
          esql: `FROM kibana_sample_data_logs | STATS count = COUNT(*) BY response.keyword`,
          visualization: { type: 'xy', layers: [{ type: 'bar', y: [{ column: 'count' }] }] },
        },
      ],
    });

    expect(result.score).toBe(0.5);
    expect(result.label).toBe('partial');
    expect(result.metadata).toEqual(
      expect.objectContaining({ matchedLeaves: 1, checkedLeaves: 2 })
    );
    expect(mismatchesOf(result)).toEqual(['layers[0].y[1]: missing column']);
  });

  it('fails a column bound to a different aggregation', async () => {
    const result = await evaluate({
      query: GOLD_QUERY,
      config: { type: 'xy', layers: [{ y: [{ column: 'Request Count' }] }] },
      visualizations: [
        {
          esql: `FROM kibana_sample_data_logs | STATS total = SUM(bytes) BY response.keyword`,
          visualization: { type: 'xy', layers: [{ type: 'bar', y: [{ column: 'total' }] }] },
        },
      ],
    });

    expect(result.score).toBe(0);
    expect(mismatchesOf(result)).toEqual([
      'layers[0].y[0]: expected Request Count (count(*)), got total (sum(bytes))',
    ]);
  });

  it('reports every gold leaf when the actual config has no layers', async () => {
    const result = await evaluate({
      query: GOLD_QUERY,
      config: {
        type: 'xy',
        layers: [{ x: { column: 'response.keyword' }, y: [{ column: 'Request Count' }] }],
      },
      visualizations: [{ esql: GOLD_QUERY, visualization: { type: 'xy' } }],
    });

    expect(result.score).toBe(0);
    expect(mismatchesOf(result)).toEqual([
      'layers[0].x: missing column',
      'layers[0].y[0]: missing column',
    ]);
  });

  it('allows extra actual y series beyond the gold bindings', async () => {
    const result = await evaluate({
      query: GOLD_QUERY,
      config: { type: 'xy', layers: [{ y: [{ column: 'Request Count' }] }] },
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

  it('matches Vega encoding fields and types after alias resolution and ignores the mark', async () => {
    const query = `FROM kibana_sample_data_logs
| STATS \`Average Bytes\` = AVG(bytes), \`Request Count\` = COUNT(*), \`Unique URLs\` = COUNT_DISTINCT(url.keyword) BY clientip`;

    const result = await evaluate({
      query,
      config: {
        spec: {
          mark: 'point',
          encoding: {
            x: { field: 'Average Bytes', type: 'quantitative' },
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
              mark: { type: 'bar' },
              encoding: {
                x: { field: 'avg_bytes', type: 'quantitative' },
                y: { field: 'requests' },
                size: { field: 'urls' },
              },
            }),
          },
        },
      ],
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(expect.objectContaining({ checkedLeaves: 4 }));
  });

  it('compares plain strings exactly', async () => {
    const result = await evaluate({
      config: { type: 'metric', title: 'Total Requests', metrics: [{ column: 'Total Requests' }] },
      visualizations: [
        {
          esql: `FROM kibana_sample_data_logs | STATS \`Total Requests\` = COUNT(*)`,
          visualization: {
            type: 'metric',
            title: 'total requests',
            metrics: [{ column: 'Total Requests' }],
          },
        },
      ],
    });

    expect(result.score).toBe(0.5);
    expect(mismatchesOf(result)).toEqual([
      'title: expected "Total Requests", got "total requests"',
    ]);
  });

  it('asserts boolean and numeric gold leaves with strict equality', async () => {
    const config: VisualizationGoldConfig = {
      type: 'metric',
      sampling: 1,
      ignore_global_filters: false,
    };

    const matching = await evaluate({
      config,
      visualizations: [
        {
          esql: GOLD_QUERY,
          visualization: { type: 'metric', sampling: 1, ignore_global_filters: false },
        },
      ],
    });
    expect(matching.score).toBe(1);
    expect(matching.metadata).toEqual(expect.objectContaining({ checkedLeaves: 2 }));

    const mismatching = await evaluate({
      config,
      visualizations: [
        {
          esql: GOLD_QUERY,
          visualization: { type: 'metric', sampling: '1', ignore_global_filters: true },
        },
      ],
    });
    expect(mismatching.score).toBe(0);
    expect(mismatchesOf(mismatching)).toEqual([
      'sampling: expected 1, got "1"',
      'ignore_global_filters: expected false, got true',
    ]);
  });

  it('counts a primitive gold leaf as failed when the actual key is absent', async () => {
    const result = await evaluate({
      config: {
        type: 'metric',
        metrics: [{ column: 'Total Requests' }],
        ignore_global_filters: false,
      },
      visualizations: [
        {
          esql: `FROM kibana_sample_data_logs | STATS \`Total Requests\` = COUNT(*)`,
          visualization: { type: 'metric', metrics: [{ column: 'Total Requests' }] },
        },
      ],
    });

    expect(result.score).toBe(0.5);
    expect(mismatchesOf(result)).toEqual(['ignore_global_filters: expected false, got undefined']);
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
