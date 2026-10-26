/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedVisualization } from '../extract_visualization';
import { createVisualizationConfigValidityEvaluator } from './visualization_config_validity';

const VALID_METRIC_CONFIG = {
  type: 'metric',
  data_source: { type: 'esql', query: 'FROM kibana_sample_data_logs | STATS c = COUNT(*)' },
  metrics: [{ type: 'primary', column: 'c' }],
};

const VALID_XY_CONFIG = {
  type: 'xy',
  layers: [
    {
      type: 'bar',
      data_source: {
        type: 'esql',
        query:
          'FROM kibana_sample_data_logs | STATS c = COUNT(*) BY response.keyword | SORT c DESC | LIMIT 10',
      },
      x: { column: 'response.keyword' },
      y: [{ column: 'c' }],
    },
  ],
};

const evaluate = async (visualizations: ExtractedVisualization[]) => {
  const evaluator = createVisualizationConfigValidityEvaluator({
    visualizationExtractor: () => visualizations,
  });

  return evaluator.evaluate({
    input: { question: 'unused' },
    output: { errors: [], messages: [] },
    expected: {},
    metadata: {},
  });
};

describe('createVisualizationConfigValidityEvaluator', () => {
  it('scores 1 for a Lens metric config that matches the ESQL schema', async () => {
    const result = await evaluate([
      {
        esql: 'FROM kibana_sample_data_logs | STATS c = COUNT(*)',
        chartType: 'metric',
        renderer: 'lens',
        visualization: VALID_METRIC_CONFIG,
      },
    ]);

    expect(result.score).toBe(1);
    expect(result.label).toBe('valid');
  });

  it('scores 1 for a Lens xy config that matches the ESQL schema', async () => {
    const result = await evaluate([
      {
        esql: 'FROM kibana_sample_data_logs | STATS c = COUNT(*) BY response.keyword',
        chartType: 'xy',
        renderer: 'lens',
        visualization: VALID_XY_CONFIG,
      },
    ]);

    expect(result.score).toBe(1);
    expect(result.label).toBe('valid');
  });

  it('scores 0 when Lens config fails schema validation', async () => {
    const result = await evaluate([
      {
        esql: 'FROM a | STATS c = COUNT(*)',
        chartType: 'metric',
        renderer: 'lens',
        visualization: { type: 'metric' },
      },
    ]);

    expect(result.score).toBe(0);
    expect(result.label).toBe('invalid');
  });

  it('scores 1 for a parseable Vega-Lite spec with a visual root', async () => {
    const result = await evaluate([
      {
        esql: 'FROM a | STATS c = COUNT(*) BY host',
        renderer: 'vega',
        visualization: {
          spec: JSON.stringify({
            mark: 'bar',
            encoding: { x: { field: 'host' }, y: { field: 'c' } },
          }),
        },
      },
    ]);

    expect(result.score).toBe(1);
  });

  it('scores 0 for malformed Vega specs', async () => {
    const result = await evaluate([
      {
        esql: 'FROM a | STATS c = COUNT(*)',
        renderer: 'vega',
        visualization: { spec: '{not-json' },
      },
    ]);

    expect(result.score).toBe(0);
  });

  it('scores 0 when no visualization was produced', async () => {
    const result = await evaluate([]);

    expect(result.score).toBe(0);
    expect(result.label).toBe('no-visualization');
  });
});
