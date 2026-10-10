/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider, ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import { buildEsqlEditContext, generateVisualizationEsql } from './generate_visualization_esql';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
}));

jest.mock('./esql_instructions', () => ({
  buildEsqlAdditionalInstructions: () => 'esql-instructions',
}));

const mockedGenerateEsql = jest.mocked(generateEsql);

const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger;
const events = {} as ToolEventEmitter;
const defaultModel = { connector: { connectorId: 'default-connector' } } as ScopedModel;
const getDefaultModel = jest.fn();
const modelProvider = { getDefaultModel } as unknown as ModelProvider;
const fieldCaps = jest.fn();
const asCurrentUser = { name: 'current-user-client', fieldCaps };
const asInternalUser = { name: 'internal-user-client' };
const esClient = { asCurrentUser, asInternalUser } as unknown as IScopedClusterClient;

const mockDateFields = (fieldNames: string[]) =>
  fieldCaps.mockResolvedValue({
    fields: Object.fromEntries(fieldNames.map((name) => [name, { date: { type: 'date' } }])),
  });

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
    getDefaultModel.mockReset().mockResolvedValue(defaultModel);
    fieldCaps.mockReset();
    mockDateFields(['@timestamp']);
  });

  it('returns the query and result columns when generation succeeds', async () => {
    const columns = [{ name: 'status', type: 'keyword' }];
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | STATS c = COUNT() BY status',
      results: { columns, values: [] },
    } as Awaited<ReturnType<typeof generateEsql>>);

    const result = await generateVisualizationEsql(params);

    expect(result).toEqual({
      query: 'FROM logs-* | STATS c = COUNT() BY status',
      columns,
    });
  });

  it('returns an error when no query is generated', async () => {
    mockedGenerateEsql.mockResolvedValue({} as Awaited<ReturnType<typeof generateEsql>>);

    const result = await generateVisualizationEsql(params);

    expect(result).toEqual({ error: 'No queries generated' });
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
        internalEsClient: asInternalUser,
        additionalInstructions: 'esql-instructions',
        timeRange: { from: 'now-7d', to: 'now' },
        execute: 'schema',
      })
    );
  });

  it('appends renderer-specific extra instructions to the shared ones', async () => {
    mockedGenerateEsql.mockResolvedValue({ query: 'FROM logs-*' } as Awaited<
      ReturnType<typeof generateEsql>
    >);

    await generateVisualizationEsql({ ...params, extraInstructions: 'vega-specific-rules' });

    expect(mockedGenerateEsql).toHaveBeenCalledWith(
      expect.objectContaining({
        additionalInstructions: 'esql-instructions\nvega-specific-rules',
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

  it('passes the request through unchanged when there are no existing queries', async () => {
    mockedGenerateEsql.mockResolvedValue({ query: 'FROM logs-*' } as Awaited<
      ReturnType<typeof generateEsql>
    >);

    await generateVisualizationEsql(params);

    expect(mockedGenerateEsql).toHaveBeenCalledWith(
      expect.objectContaining({ nlQuery: 'count logs by status' })
    );
  });

  it('seeds the request with a single existing query as edit context', async () => {
    mockedGenerateEsql.mockResolvedValue({ query: 'FROM logs-*' } as Awaited<
      ReturnType<typeof generateEsql>
    >);

    await generateVisualizationEsql({
      ...params,
      existingQueries: ['FROM logs-* | STATS c = COUNT()'],
    });

    const { nlQuery } = mockedGenerateEsql.mock.calls[0][0];
    expect(nlQuery).toContain('Existing esql query to modify: "FROM logs-* | STATS c = COUNT()"');
    expect(nlQuery).toContain('User query: count logs by status');
  });

  describe('default-model fallback', () => {
    it('runs on the low-effort model with two attempts and does not fall back on success', async () => {
      mockedGenerateEsql.mockResolvedValue({ query: 'FROM logs-*' } as Awaited<
        ReturnType<typeof generateEsql>
      >);

      const result = await generateVisualizationEsql(params);

      expect(result).toEqual({ query: 'FROM logs-*', columns: undefined });
      expect(mockedGenerateEsql).toHaveBeenCalledTimes(1);
      expect(mockedGenerateEsql).toHaveBeenCalledWith(
        expect.objectContaining({ modelProvider, maxRetries: 2 })
      );
      expect(getDefaultModel).not.toHaveBeenCalled();
    });

    it('falls back to the default model with the failing attempt as context', async () => {
      const columns = [{ name: 'status', type: 'keyword' }];
      mockedGenerateEsql
        .mockResolvedValueOnce({
          query: 'FROM logs-* | STATS c = COUNT() BY status.keyword',
          error: 'Unknown column [status.keyword]',
        } as Awaited<ReturnType<typeof generateEsql>>)
        .mockResolvedValueOnce({
          query: 'FROM logs-* | STATS c = COUNT() BY status',
          results: { columns },
        } as Awaited<ReturnType<typeof generateEsql>>);

      const result = await generateVisualizationEsql(params);

      expect(result).toEqual({ query: 'FROM logs-* | STATS c = COUNT() BY status', columns });
      expect(mockedGenerateEsql).toHaveBeenCalledTimes(2);
      const fallbackCall = mockedGenerateEsql.mock.calls[1][0];
      expect(fallbackCall).toEqual(expect.objectContaining({ model: defaultModel, maxRetries: 1 }));
      expect(fallbackCall.additionalContext).toContain(
        'FROM logs-* | STATS c = COUNT() BY status.keyword'
      );
      expect(fallbackCall.additionalContext).toContain('Unknown column [status.keyword]');
    });

    it('returns the fallback error when the fallback also fails', async () => {
      mockedGenerateEsql
        .mockResolvedValueOnce({ error: 'first error' } as Awaited<ReturnType<typeof generateEsql>>)
        .mockResolvedValueOnce({ error: 'second error' } as Awaited<
          ReturnType<typeof generateEsql>
        >);

      const result = await generateVisualizationEsql(params);

      expect(result).toEqual({ error: 'second error' });
      expect(mockedGenerateEsql).toHaveBeenCalledTimes(2);
    });

    it('falls back when the query ignores the time picker on a source without @timestamp', async () => {
      mockDateFields(['order_date']);
      mockedGenerateEsql
        .mockResolvedValueOnce({ query: 'FROM orders | STATS c = COUNT()' } as Awaited<
          ReturnType<typeof generateEsql>
        >)
        .mockResolvedValueOnce({
          query:
            'FROM orders | WHERE order_date >= ?_tstart AND order_date < ?_tend | STATS c = COUNT()',
        } as Awaited<ReturnType<typeof generateEsql>>);

      const result = await generateVisualizationEsql({ ...params, index: 'orders' });

      expect(result.query).toContain('order_date >= ?_tstart');
      expect(mockedGenerateEsql).toHaveBeenCalledTimes(2);
      const { additionalContext } = mockedGenerateEsql.mock.calls[1][0];
      expect(additionalContext).toContain('FROM orders | STATS c = COUNT()');
      expect(additionalContext).toContain('"orders" has no @timestamp field');
    });

    it('accepts a fallback query without a time filter rather than failing the chart', async () => {
      mockDateFields(['order_date']);
      mockedGenerateEsql.mockResolvedValue({ query: 'FROM orders | STATS c = COUNT()' } as Awaited<
        ReturnType<typeof generateEsql>
      >);

      const result = await generateVisualizationEsql({ ...params, index: 'orders' });

      expect(result).toEqual({ query: 'FROM orders | STATS c = COUNT()', columns: undefined });
      expect(mockedGenerateEsql).toHaveBeenCalledTimes(2);
      expect(fieldCaps).toHaveBeenCalledTimes(1);
    });

    it('propagates a thrown error without falling back', async () => {
      mockedGenerateEsql.mockRejectedValueOnce(new Error('connector unavailable'));

      await expect(generateVisualizationEsql(params)).rejects.toThrow('connector unavailable');
      expect(mockedGenerateEsql).toHaveBeenCalledTimes(1);
      expect(getDefaultModel).not.toHaveBeenCalled();
    });
  });
});

describe('buildEsqlEditContext', () => {
  it('returns the request unchanged when no existing queries are given', () => {
    expect(buildEsqlEditContext('count logs')).toBe('count logs');
    expect(buildEsqlEditContext('count logs', [])).toBe('count logs');
  });

  it('formats a single existing query as a modify instruction', () => {
    expect(buildEsqlEditContext('exclude 503s', ['FROM logs-* | STATS c = COUNT()'])).toBe(
      'Existing esql query to modify: "FROM logs-* | STATS c = COUNT()"\n\nUser query: exclude 503s'
    );
  });

  it('formats multiple existing queries as per-layer context', () => {
    const result = buildEsqlEditContext('add a trend line', [
      'FROM a | STATS x',
      'FROM b | STATS y',
    ]);

    expect(result).toContain('Existing esql queries from multiple layers:');
    expect(result).toContain('Layer 1: "FROM a | STATS x"');
    expect(result).toContain('Layer 2: "FROM b | STATS y"');
    expect(result).toContain('User query: add a trend line');
  });
});
