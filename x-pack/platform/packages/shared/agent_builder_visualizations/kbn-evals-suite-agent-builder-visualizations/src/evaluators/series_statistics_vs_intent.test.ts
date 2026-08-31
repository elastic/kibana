/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedVisualization } from '../extract_visualization';
import {
  createSeriesStatisticsVsIntentEvaluator,
  XY_LEGEND_STATISTIC_OPTIONS,
} from './series_statistics_vs_intent';

const evaluate = async ({
  visualizations,
  legendStatistics,
  esqlAggregations,
}: {
  visualizations: ExtractedVisualization[];
  legendStatistics?: string[];
  esqlAggregations?: string[];
}) => {
  const evaluator = createSeriesStatisticsVsIntentEvaluator({
    visualizationExtractor: () => visualizations,
    expectedLegendStatisticsExtractor: (expected) =>
      (expected as { legendStatistics?: string[] } | undefined)?.legendStatistics,
    expectedEsqlAggregationsExtractor: (expected) =>
      (expected as { esqlAggregations?: string[] } | undefined)?.esqlAggregations,
  });

  return evaluator.evaluate({
    input: { question: 'unused' },
    output: { errors: [], messages: [] },
    expected: { legendStatistics, esqlAggregations },
    metadata: {},
  });
};

const volumeOverTimeEsql =
  'FROM kibana_sample_data_logs | STATS `Request Count` = COUNT(*) BY `Time Bucket` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';

const averageBytesOverTimeEsql =
  'FROM kibana_sample_data_logs | STATS `Average Bytes` = AVG(bytes) BY `Time Bucket` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';

const xyWithLegendStatistics = (statistics: string[]): ExtractedVisualization => ({
  esql: volumeOverTimeEsql,
  chartType: 'xy',
  renderer: 'lens',
  visualization: {
    type: 'xy',
    legend: { visibility: 'visible', statistics },
  },
});

describe('createSeriesStatisticsVsIntentEvaluator', () => {
  it('scores 1 when legend statistics stay off ES|QL and on the config', async () => {
    const result = await evaluate({
      visualizations: [xyWithLegendStatistics(['avg', 'min', 'max'])],
      legendStatistics: ['avg', 'min', 'max'],
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('match');
  });

  it('scores 0 when legend statistics leak into ES|QL as AVG/MIN/MAX', async () => {
    const result = await evaluate({
      visualizations: [
        {
          ...xyWithLegendStatistics(['avg', 'min', 'max']),
          esql: 'FROM logs | STATS c = COUNT(*), avg = AVG(c), mn = MIN(c), mx = MAX(c) BY bucket',
        },
      ],
      legendStatistics: ['avg', 'min', 'max'],
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('mismatch');
    expect(result.explanation).toContain('ES|QL');
  });

  it('accepts any official legend.statistics option on the config', async () => {
    const result = await evaluate({
      visualizations: [xyWithLegendStatistics(['median', 'last_value', 'standard_deviation'])],
      legendStatistics: ['median', 'last_value', 'standard_deviation'],
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('match');
  });

  it('scores 0 when a non-avg legend statistic leaks as an ES|QL aggregation', async () => {
    const result = await evaluate({
      visualizations: [
        {
          ...xyWithLegendStatistics(['median', 'distinct_count']),
          esql: 'FROM logs | STATS c = COUNT(*), mid = MEDIAN(bytes), uniques = COUNT_DISTINCT(url) BY bucket',
        },
      ],
      legendStatistics: ['median', 'distinct_count'],
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('mismatch');
    expect(result.explanation).toContain('MEDIAN');
  });

  it('rejects expected legend statistics that are not XY options', async () => {
    const result = await evaluate({
      visualizations: [xyWithLegendStatistics(['avg'])],
      legendStatistics: ['average'],
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('error');
    expect(result.explanation).toContain('last_non_null_value');
  });

  it('scores 0 when the config is missing the requested legend statistics', async () => {
    const result = await evaluate({
      visualizations: [
        {
          esql: volumeOverTimeEsql,
          chartType: 'xy',
          visualization: { type: 'xy', legend: { visibility: 'auto' } },
        },
      ],
      legendStatistics: ['avg', 'min', 'max'],
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('mismatch');
    expect(result.explanation).toContain('legend.statistics');
  });

  it('scores 1 when a measure-over-time query uses the expected aggregation', async () => {
    const result = await evaluate({
      visualizations: [{ esql: averageBytesOverTimeEsql, chartType: 'xy' }],
      esqlAggregations: ['AVG'],
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('match');
  });

  it('scores 0 when a measure-over-time query omits the expected aggregation', async () => {
    const result = await evaluate({
      visualizations: [{ esql: volumeOverTimeEsql, chartType: 'xy' }],
      esqlAggregations: ['AVG'],
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('mismatch');
  });

  it('is sourced from every XY legend.statistics option', () => {
    expect(XY_LEGEND_STATISTIC_OPTIONS).toEqual([
      'min',
      'max',
      'avg',
      'median',
      'range',
      'last_value',
      'last_non_null_value',
      'first_value',
      'first_non_null_value',
      'difference',
      'difference_percentage',
      'count',
      'total',
      'standard_deviation',
      'variance',
      'distinct_count',
      'current_and_last_value',
    ]);
  });

  it('skips when the example does not declare a series-statistics expectation', async () => {
    const result = await evaluate({
      visualizations: [{ esql: volumeOverTimeEsql, chartType: 'xy' }],
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('skipped');
  });
});
