/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { generateVisualizationEsql } from './generate_visualization_esql';
import { runResolveEsqlNode } from './run_resolve_esql_node';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
  buildTimeRangeParams: jest.fn((range?: { from: string; to: string }) =>
    range ? [{ _tstart: range.from }, { _tend: range.to }] : undefined
  ),
  DEFAULT_ESQL_TIME_RANGE: { from: 'now-24h', to: 'now' },
}));

jest.mock('./generate_visualization_esql', () => ({
  generateVisualizationEsql: jest.fn(),
}));

const mockedExecuteEsql = jest.mocked(executeEsql);
const mockedGenerate = jest.mocked(generateVisualizationEsql);

const COLUMNS = [
  { name: 'count', type: 'long' as const },
  { name: 'status', type: 'keyword' as const },
];

const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger;
const events = {} as ToolEventEmitter;
const modelProvider = {} as ModelProvider;
const asCurrentUser = { name: 'current-user' };
const esClient = { asCurrentUser } as unknown as IScopedClusterClient;

const PROVIDED_QUERY = 'FROM logs-* | STATS count = COUNT(*) BY status';

const params = {
  esqlQuery: PROVIDED_QUERY,
  nlQuery: 'count logs by status',
  index: 'logs-*',
  existingQueries: ['FROM logs-*'],
  extraInstructions: 'vega-rules',
  modelProvider,
  events,
  logger,
  esClient,
};

describe('runResolveEsqlNode', () => {
  beforeEach(() => {
    mockedExecuteEsql.mockReset();
    mockedGenerate.mockReset();
    jest.mocked(logger.warn).mockClear();
    jest.mocked(logger.error).mockClear();
  });

  it('probes a provided query for columns with the schema request shape and does not generate', async () => {
    mockedExecuteEsql.mockResolvedValue({ columns: COLUMNS, values: [] } as Awaited<
      ReturnType<typeof executeEsql>
    >);

    const result = await runResolveEsqlNode(params);

    expect(mockedExecuteEsql).toHaveBeenCalledWith({
      query: PROVIDED_QUERY,
      dropNullColumns: false,
      limit: 1,
      params: [{ _tstart: 'now-24h' }, { _tend: 'now' }],
      esClient: asCurrentUser,
    });
    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(result).toEqual({
      esqlQuery: PROVIDED_QUERY,
      columns: COLUMNS,
      actions: [{ type: 'generate_esql', success: true, query: PROVIDED_QUERY, columns: COLUMNS }],
    });
  });

  it('keeps a provided query without columns when the probe fails', async () => {
    mockedExecuteEsql.mockRejectedValue(new Error('verification_exception: unknown column foo'));

    const result = await runResolveEsqlNode(params);

    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('verification_exception: unknown column foo')
    );
    expect(result).toEqual({
      esqlQuery: PROVIDED_QUERY,
      columns: undefined,
      actions: [
        { type: 'generate_esql', success: true, query: PROVIDED_QUERY, columns: undefined },
      ],
    });
  });

  it('generates a query when none is provided and trusts its schema-run columns', async () => {
    mockedGenerate.mockResolvedValue({ query: PROVIDED_QUERY, columns: COLUMNS });

    const result = await runResolveEsqlNode({ ...params, esqlQuery: '' });

    expect(mockedExecuteEsql).not.toHaveBeenCalled();
    expect(mockedGenerate).toHaveBeenCalledWith({
      nlQuery: params.nlQuery,
      index: params.index,
      existingQueries: params.existingQueries,
      extraInstructions: params.extraInstructions,
      modelProvider,
      events,
      logger,
      esClient,
    });
    expect(result).toEqual({
      esqlQuery: PROVIDED_QUERY,
      columns: COLUMNS,
      actions: [{ type: 'generate_esql', success: true, query: PROVIDED_QUERY, columns: COLUMNS }],
    });
  });

  it('maps a generation error onto a failed generate_esql action', async () => {
    mockedGenerate.mockResolvedValue({ error: 'no such index [logs-*]' });

    const result = await runResolveEsqlNode({ ...params, esqlQuery: '' });

    expect(result).toEqual({
      esqlQuery: '',
      columns: undefined,
      actions: [{ type: 'generate_esql', success: false, error: 'no such index [logs-*]' }],
    });
  });

  it('maps a thrown generation error onto a failed generate_esql action', async () => {
    mockedGenerate.mockRejectedValue(new Error('connector unavailable'));

    const result = await runResolveEsqlNode({ ...params, esqlQuery: '' });

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to resolve ES|QL query: connector unavailable'
    );
    expect(result).toEqual({
      esqlQuery: '',
      columns: undefined,
      actions: [{ type: 'generate_esql', success: false, error: 'connector unavailable' }],
    });
  });
});
