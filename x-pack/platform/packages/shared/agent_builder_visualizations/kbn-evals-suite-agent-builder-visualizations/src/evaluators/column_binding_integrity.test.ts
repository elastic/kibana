/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ExtractedVisualization } from '../extract_visualization';
import {
  checkColumnBindings,
  collectColumnBindings,
  createColumnBindingIntegrityEvaluator,
} from './column_binding_integrity';
import { createEsqlQueryRunner } from './esql_query_runner';

const XY: ExtractedVisualization = {
  esql: 'FROM logs | STATS count = COUNT(*), bytes = SUM(bytes) BY response.keyword',
  chartType: 'xy',
  renderer: 'lens',
  visualization: {
    type: 'xy',
    layers: [
      {
        type: 'bar',
        data_source: { type: 'esql', query: 'ignored' },
        x: { column: 'response.keyword' },
        y: [{ column: 'count' }, { column: 'bytes' }],
        breakdown_by: { column: 'host' },
      },
    ],
  },
};

const RESULT_COLUMNS = [
  { name: 'count', type: 'long' },
  { name: 'bytes', type: 'double' },
  { name: 'response.keyword', type: 'keyword' },
];

describe('collectColumnBindings', () => {
  it('collects Lens bindings with their roles and paths, skipping data_source', () => {
    expect(collectColumnBindings(XY)).toEqual([
      { path: 'layers[0].x', column: 'response.keyword', role: 'dimension' },
      { path: 'layers[0].y[0]', column: 'count', role: 'measure' },
      { path: 'layers[0].y[1]', column: 'bytes', role: 'measure' },
      { path: 'layers[0].breakdown_by', column: 'host', role: 'dimension' },
    ]);
  });

  it('collects chart-level metric, group_by, and tag_by bindings', () => {
    expect(
      collectColumnBindings({
        esql: 'FROM a',
        visualization: {
          type: 'pie',
          metrics: [{ column: 'c' }],
          group_by: [{ column: 'g' }],
        },
      }).map(({ column, role }) => [column, role])
    ).toEqual([
      ['c', 'measure'],
      ['g', 'dimension'],
    ]);
  });

  it('treats heatmap x and y as axes, not measures', () => {
    expect(
      collectColumnBindings({
        esql: 'FROM a',
        chartType: 'heatmap',
        visualization: {
          type: 'heatmap',
          x: { column: 'hour' },
          y: { column: 'response.keyword' },
          metric: { column: 'count' },
        },
      }).map(({ column, role }) => [column, role])
    ).toEqual([
      ['hour', 'dimension'],
      ['response.keyword', 'dimension'],
      ['count', 'measure'],
    ]);
  });

  it('collects Vega encoding fields from the spec string', () => {
    expect(
      collectColumnBindings({
        esql: 'FROM a',
        renderer: 'vega',
        visualization: {
          spec: JSON.stringify({
            mark: 'point',
            encoding: { x: { field: 'avg' }, y: { field: 'cnt' }, size: { value: 10 } },
          }),
        },
      })
    ).toEqual([
      { path: 'spec.encoding.x', column: 'avg', role: 'other' },
      { path: 'spec.encoding.y', column: 'cnt', role: 'other' },
    ]);
  });
});

describe('checkColumnBindings', () => {
  it('flags missing columns and non-numeric measures, tolerating backticks', () => {
    const checks = checkColumnBindings(
      [
        { path: 'x', column: '`response.keyword`', role: 'dimension' },
        { path: 'y[0]', column: 'count', role: 'measure' },
        { path: 'y[1]', column: 'response.keyword', role: 'measure' },
        { path: 'breakdown_by', column: 'host', role: 'dimension' },
      ],
      RESULT_COLUMNS
    );

    expect(checks.map(({ path, status }) => [path, status])).toEqual([
      ['x', 'ok'],
      ['y[0]', 'ok'],
      ['y[1]', 'non_numeric_measure'],
      ['breakdown_by', 'missing'],
    ]);
  });
});

describe('createColumnBindingIntegrityEvaluator', () => {
  const buildEsClient = (columns = RESULT_COLUMNS) =>
    ({
      esql: { query: jest.fn().mockResolvedValue({ columns, values: [] }) },
    } as unknown as ElasticsearchClient);

  const evaluate = (visualizations: ExtractedVisualization[], esClient = buildEsClient()) =>
    createColumnBindingIntegrityEvaluator({
      runQuery: createEsqlQueryRunner(esClient),
      visualizationExtractor: () => visualizations,
    }).evaluate({
      input: { question: 'q' },
      output: { errors: [], messages: [] },
      expected: {},
      metadata: {},
    });

  it('scores the fraction of bindings that resolve and lists the failures', async () => {
    const result = await evaluate([XY]);

    expect(result.score).toBe(0.75);
    expect(result.label).toBe('partial');
    expect(result.explanation).toContain(
      'layers[0].breakdown_by: column "host" is not in the query result'
    );
  });

  it('substitutes bind params before executing', async () => {
    const esClient = buildEsClient();
    await evaluate(
      [{ ...XY, esql: 'FROM logs | WHERE @timestamp >= ?_tstart | STATS count = COUNT(*)' }],
      esClient
    );

    const [[{ query }]] = (esClient.esql.query as jest.Mock).mock.calls;
    expect(query).not.toContain('?_tstart');
  });

  it('scores 0 when the query fails to execute', async () => {
    const esClient = {
      esql: { query: jest.fn().mockRejectedValue(new Error('parse error')) },
    } as unknown as ElasticsearchClient;

    const result = await evaluate([XY], esClient);

    expect(result.score).toBe(0);
    expect(result.explanation).toBe(
      '0/4 column binding(s) resolve. ES|QL execution failed: parse error'
    );
  });

  it('scores 0 when no visualization was produced', async () => {
    const result = await evaluate([]);

    expect(result.score).toBe(0);
    expect(result.label).toBe('no-visualization');
  });
});
