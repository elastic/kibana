/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ExtractedVisualization } from '../extract_visualization';
import {
  createChartCompatibleResultEvaluator,
  isChartCompatibleResult,
} from './chart_compatible_result';

describe('isChartCompatibleResult', () => {
  it('accepts a single numeric column for metric charts', () => {
    expect(isChartCompatibleResult('metric', [{ name: 'Total', type: 'long' }], 1).compatible).toBe(
      true
    );
  });

  it('rejects metric charts without a numeric column', () => {
    expect(
      isChartCompatibleResult('metric', [{ name: 'host', type: 'keyword' }], 1).compatible
    ).toBe(false);
  });

  it('requires a dimension and measure for xy charts', () => {
    expect(
      isChartCompatibleResult(
        'xy',
        [
          { name: 'Time', type: 'date' },
          { name: 'Bytes', type: 'long' },
        ],
        10
      ).compatible
    ).toBe(true);

    expect(isChartCompatibleResult('xy', [{ name: 'Bytes', type: 'long' }], 10).compatible).toBe(
      false
    );
  });

  it('requires category + measure for pie charts', () => {
    expect(
      isChartCompatibleResult(
        'pie',
        [
          { name: 'code', type: 'keyword' },
          { name: 'count', type: 'long' },
        ],
        5
      ).compatible
    ).toBe(true);
  });

  it('accepts heatmap results when an axis is a numeric hour extract', () => {
    expect(
      isChartCompatibleResult(
        'heatmap',
        [
          { name: 'Request Count', type: 'long' },
          { name: 'Hour of Day', type: 'long' },
          { name: 'Response Code', type: 'keyword' },
        ],
        58
      ).compatible
    ).toBe(true);
  });

  it('rejects heatmaps with fewer than three columns', () => {
    expect(
      isChartCompatibleResult(
        'heatmap',
        [
          { name: 'count', type: 'long' },
          { name: 'code', type: 'keyword' },
        ],
        5
      ).compatible
    ).toBe(false);
  });
});

describe('createChartCompatibleResultEvaluator', () => {
  const evaluate = async ({
    visualizations,
    expectedChartType,
    esResponse,
    esError,
  }: {
    visualizations: ExtractedVisualization[];
    expectedChartType?: string;
    esResponse?: { columns: Array<{ name: string; type: string }>; values: unknown[][] };
    esError?: Error;
  }) => {
    const esClient = {
      esql: {
        query: jest.fn().mockImplementation(async () => {
          if (esError) {
            throw esError;
          }
          return esResponse ?? { columns: [], values: [] };
        }),
      },
    } as unknown as ElasticsearchClient;

    const evaluator = createChartCompatibleResultEvaluator({
      esClient,
      visualizationExtractor: () => visualizations,
      expectedChartTypeExtractor: (expected) =>
        (expected as { chartType?: string } | undefined)?.chartType,
    });

    return evaluator.evaluate({
      input: { question: 'unused' },
      output: { errors: [], messages: [] },
      expected: { chartType: expectedChartType },
      metadata: {},
    });
  };

  it('scores 1 when the executed result fits the chart type', async () => {
    const result = await evaluate({
      visualizations: [
        {
          esql: 'FROM logs | STATS c = COUNT(*) BY code',
          chartType: 'xy',
          renderer: 'lens',
        },
      ],
      esResponse: {
        columns: [
          { name: 'code', type: 'keyword' },
          { name: 'c', type: 'long' },
        ],
        values: [['200', 10]],
      },
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('compatible');
  });

  it('scores 0 when the result shape does not fit the chart type', async () => {
    const result = await evaluate({
      visualizations: [
        {
          esql: 'FROM logs | STATS c = COUNT(*)',
          chartType: 'xy',
          renderer: 'lens',
        },
      ],
      expectedChartType: 'xy',
      esResponse: {
        columns: [{ name: 'c', type: 'long' }],
        values: [[10]],
      },
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('incompatible');
  });

  it('scores 0 when ES|QL execution fails', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM missing', chartType: 'metric', renderer: 'lens' }],
      esError: new Error('index_not_found'),
    });

    expect(result.score).toBe(0);
  });

  it('scores Vega results by executable columns without requiring chart_type', async () => {
    const result = await evaluate({
      visualizations: [{ esql: 'FROM logs | STATS c = COUNT(*) BY host', renderer: 'vega' }],
      esResponse: {
        columns: [
          { name: 'host', type: 'keyword' },
          { name: 'c', type: 'long' },
        ],
        values: [['a', 1]],
      },
    });

    expect(result.score).toBe(1);
  });
});
