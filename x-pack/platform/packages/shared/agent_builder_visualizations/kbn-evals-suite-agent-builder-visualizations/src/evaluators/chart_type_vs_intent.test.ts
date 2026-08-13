/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedVisualization } from '../extract_visualization';
import { createChartTypeVsIntentEvaluator } from './chart_type_vs_intent';

const evaluate = async ({
  visualizations,
  expectedChartType,
}: {
  visualizations: ExtractedVisualization[];
  expectedChartType?: string | string[];
}) => {
  const evaluator = createChartTypeVsIntentEvaluator({
    visualizationExtractor: () => visualizations,
    expectedChartTypeExtractor: (expected) =>
      (expected as { chartType?: string | string[] } | undefined)?.chartType,
  });

  return evaluator.evaluate({
    input: { question: 'unused' },
    output: { errors: [], messages: [] },
    expected: { chartType: expectedChartType },
    metadata: {},
  });
};

describe('createChartTypeVsIntentEvaluator', () => {
  it('scores 1 when every visualization matches the expected chart type', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM a', chartType: 'xy' }],
      expectedChartType: 'xy',
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('match');
  });

  it('accepts any member of an expected chart-type list', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM a', chartType: 'metric' }],
      expectedChartType: ['metric', 'gauge'],
    });

    expect(result.score).toBe(1);
  });

  it('scores 0 when chart type mismatches intent', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM a', chartType: 'pie' }],
      expectedChartType: 'xy',
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('mismatch');
  });

  it('scores 0 when no visualization was produced but a chart type was expected', async () => {
    const result = await evaluate({
      visualizations: [],
      expectedChartType: 'xy',
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('no-visualization');
  });

  it('skips when the example does not declare an expected chart type', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM a', chartType: 'xy' }],
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('skipped');
  });
});
