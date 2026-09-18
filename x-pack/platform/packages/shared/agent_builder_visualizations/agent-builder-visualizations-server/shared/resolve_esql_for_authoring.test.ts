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
import { resolveEsqlForAuthoring } from './resolve_esql_for_authoring';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
  buildTimeRangeParams: jest.fn((range?: { from: string; to: string }) =>
    range ? [{ _tstart: range.from }, { _tend: range.to }] : undefined
  ),
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

const params = {
  nlQuery: 'count logs by status',
  index: 'logs-*',
  modelProvider,
  events,
  logger,
  esClient,
};

const authoringExecuteOptions = {
  dropNullColumns: false,
  limit: 1,
  params: [{ _tstart: 'now-24h' }, { _tend: 'now' }],
  esClient: asCurrentUser,
};

describe('resolveEsqlForAuthoring', () => {
  beforeEach(() => {
    mockedExecuteEsql.mockReset();
    mockedGenerate.mockReset();
  });

  it('returns columns from a provided query that executes and does not generate', async () => {
    mockedExecuteEsql.mockResolvedValue({ columns: COLUMNS, values: [] } as Awaited<
      ReturnType<typeof executeEsql>
    >);

    const providedQuery = 'FROM logs-* | STATS count = COUNT(*) BY status';
    const result = await resolveEsqlForAuthoring({
      ...params,
      providedQuery,
    });

    expect(result).toEqual({ query: providedQuery, columns: COLUMNS });
    expect(mockedExecuteEsql).toHaveBeenCalledWith({
      query: providedQuery,
      ...authoringExecuteOptions,
    });
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it('regenerates when the provided query fails to execute', async () => {
    mockedExecuteEsql.mockRejectedValue(new Error('unknown column foo'));
    mockedGenerate.mockResolvedValue({
      query: 'FROM logs-* | STATS count = COUNT(*)',
      columns: COLUMNS,
    });

    const result = await resolveEsqlForAuthoring({
      ...params,
      providedQuery: 'FROM logs-* | STATS COUNT(*) BY foo',
    });

    expect(result).toEqual({
      query: 'FROM logs-* | STATS count = COUNT(*)',
      columns: COLUMNS,
    });
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it('generates a query when none is provided', async () => {
    mockedGenerate.mockResolvedValue({
      query: 'FROM logs-* | STATS count = COUNT(*) BY status',
      columns: COLUMNS,
    });

    const result = await resolveEsqlForAuthoring({ ...params, providedQuery: '' });

    expect(mockedExecuteEsql).not.toHaveBeenCalled();
    expect(result).toEqual({
      query: 'FROM logs-* | STATS count = COUNT(*) BY status',
      columns: COLUMNS,
    });
  });

  it('executes the generated query when generation returns no columns', async () => {
    mockedGenerate.mockResolvedValue({
      query: 'FROM logs-* | STATS count = COUNT(*)',
    });
    mockedExecuteEsql.mockResolvedValue({ columns: COLUMNS, values: [] } as Awaited<
      ReturnType<typeof executeEsql>
    >);

    const result = await resolveEsqlForAuthoring({ ...params, providedQuery: '' });

    expect(mockedExecuteEsql).toHaveBeenCalledWith({
      query: 'FROM logs-* | STATS count = COUNT(*)',
      ...authoringExecuteOptions,
    });
    expect(result).toEqual({
      query: 'FROM logs-* | STATS count = COUNT(*)',
      columns: COLUMNS,
    });
  });

  it('returns the generation error when no usable query is produced', async () => {
    mockedGenerate.mockResolvedValue({ error: 'no such index [logs-*]' });

    const result = await resolveEsqlForAuthoring({ ...params, providedQuery: '' });

    expect(result).toEqual({ error: 'no such index [logs-*]' });
    expect(mockedExecuteEsql).not.toHaveBeenCalled();
  });

  it('forwards existing queries and extra instructions without a time range', async () => {
    mockedGenerate.mockResolvedValue({ query: 'FROM logs-*' });
    mockedExecuteEsql.mockResolvedValue({ columns: [], values: [] } as Awaited<
      ReturnType<typeof executeEsql>
    >);

    await resolveEsqlForAuthoring({
      ...params,
      providedQuery: '',
      existingQueries: ['FROM logs-* | STATS c = COUNT()'],
      extraInstructions: 'vega-specific-rules',
    });

    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        nlQuery: 'count logs by status',
        index: 'logs-*',
        existingQueries: ['FROM logs-* | STATS c = COUNT()'],
        extraInstructions: 'vega-specific-rules',
        modelProvider,
        events,
        logger,
        esClient,
      })
    );
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.not.objectContaining({ timeRange: expect.anything() })
    );
  });
});
