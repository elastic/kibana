/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import { generateVisualizationEsql } from './generate_visualization_esql';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
}));

jest.mock('./esql_instructions', () => ({
  esqlAdditionalInstructions: 'esql-instructions',
}));

const mockedGenerateEsql = jest.mocked(generateEsql);

const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger;
const events = {} as ToolEventEmitter;
const modelProvider = {} as ModelProvider;
const asCurrentUser = { name: 'current-user-client' };
const esClient = { asCurrentUser } as unknown as IScopedClusterClient;

const params = {
  nlQuery: 'count logs by status',
  index: 'logs-*',
  modelProvider,
  events,
  logger,
  esClient,
};

describe('generateVisualizationEsql', () => {
  beforeEach(() => {
    mockedGenerateEsql.mockReset();
  });

  it('returns the query and result columns when generation succeeds with rows', async () => {
    const columns = [{ name: 'status', type: 'keyword' }];
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | STATS c = COUNT() BY status',
      results: { columns },
    } as Awaited<ReturnType<typeof generateEsql>>);

    const result = await generateVisualizationEsql(params);

    expect(result).toEqual({
      query: 'FROM logs-* | STATS c = COUNT() BY status',
      columns,
    });
  });

  it('returns an undefined columns list when the query was not executed with rows', async () => {
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | STATS c = COUNT() BY status',
    } as Awaited<ReturnType<typeof generateEsql>>);

    const result = await generateVisualizationEsql(params);

    expect(result).toEqual({
      query: 'FROM logs-* | STATS c = COUNT() BY status',
      columns: undefined,
    });
  });

  it('returns an error when no query is generated', async () => {
    mockedGenerateEsql.mockResolvedValue({} as Awaited<ReturnType<typeof generateEsql>>);

    const result = await generateVisualizationEsql(params);

    expect(result).toEqual({ error: 'No queries generated' });
  });

  it('treats a query flagged with an execution error as a failure', async () => {
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | EVAL x = half_ms * 1 millisecond',
      error: 'verification_exception: type mismatch',
    } as Awaited<ReturnType<typeof generateEsql>>);

    const result = await generateVisualizationEsql(params);

    expect(result).toEqual({ error: 'verification_exception: type mismatch' });
  });

  it('forwards the current-user client, shared instructions, and time range', async () => {
    mockedGenerateEsql.mockResolvedValue({ query: 'FROM logs-*' } as Awaited<
      ReturnType<typeof generateEsql>
    >);

    await generateVisualizationEsql({ ...params, timeRange: { from: 'now-7d', to: 'now' } });

    expect(mockedGenerateEsql).toHaveBeenCalledWith(
      expect.objectContaining({
        nlQuery: 'count logs by status',
        index: 'logs-*',
        esClient: asCurrentUser,
        additionalInstructions: 'esql-instructions',
        timeRange: { from: 'now-7d', to: 'now' },
      })
    );
  });

  it('omits the time range when none is provided', async () => {
    mockedGenerateEsql.mockResolvedValue({ query: 'FROM logs-*' } as Awaited<
      ReturnType<typeof generateEsql>
    >);

    await generateVisualizationEsql(params);

    expect(mockedGenerateEsql).toHaveBeenCalledWith(
      expect.not.objectContaining({ timeRange: expect.anything() })
    );
  });
});
