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
import { judgeVisualizationEsql } from './judge_visualization_esql';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
}));

jest.mock('./esql_instructions', () => ({
  buildEsqlAdditionalInstructions: () => 'esql-instructions',
}));

jest.mock('./judge_visualization_esql', () => ({
  judgeVisualizationEsql: jest.fn(),
}));

const mockedGenerateEsql = jest.mocked(generateEsql);
const mockedJudgeVisualizationEsql = jest.mocked(judgeVisualizationEsql);

const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger;
const events = {} as ToolEventEmitter;
const defaultModel = { connector: { connectorId: 'default-connector' } } as ScopedModel;
const getDefaultModel = jest.fn();
const modelProvider = { getDefaultModel } as unknown as ModelProvider;
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
    mockedJudgeVisualizationEsql.mockReset();
    mockedJudgeVisualizationEsql.mockResolvedValue(false);
    getDefaultModel.mockReset().mockResolvedValue(defaultModel);
  });

  it('keeps a candidate query when the judge says it already matches intent and guidance', async () => {
    mockedJudgeVisualizationEsql.mockResolvedValue(true);
    const candidate = 'FROM logs-* | STATS c = COUNT()';

    const result = await generateVisualizationEsql({
      ...params,
      candidateQuery: candidate,
      extraInstructions: 'vega-specific-rules',
    });

    expect(result).toEqual({ query: candidate });
    expect(mockedGenerateEsql).not.toHaveBeenCalled();
    expect(mockedJudgeVisualizationEsql).toHaveBeenCalledWith(
      expect.objectContaining({
        query: candidate,
        nlQuery: 'count logs by status',
        instructions: 'esql-instructions\nvega-specific-rules',
      })
    );
  });

  it('keeps an existing query when the judge says it already matches', async () => {
    mockedJudgeVisualizationEsql.mockResolvedValue(true);
    const existing = 'FROM logs-* | STATS c = COUNT()';

    const result = await generateVisualizationEsql({
      ...params,
      existingQueries: [existing],
    });

    expect(result).toEqual({ query: existing });
    expect(mockedGenerateEsql).not.toHaveBeenCalled();
  });

  it('generates when the judge throws', async () => {
    mockedJudgeVisualizationEsql.mockRejectedValue(new Error('judge unavailable'));
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | STATS c = COUNT()',
    } as Awaited<ReturnType<typeof generateEsql>>);

    const result = await generateVisualizationEsql({
      ...params,
      candidateQuery: 'FROM logs-* | STATS c = COUNT()',
    });

    expect(mockedGenerateEsql).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      query: 'FROM logs-* | STATS c = COUNT()',
      columns: undefined,
    });
  });

  it('generates when the judge says the candidate should be rewritten', async () => {
    mockedJudgeVisualizationEsql.mockResolvedValue(false);
    mockedGenerateEsql.mockResolvedValue({
      query: 'FROM logs-* | STATS c = COUNT() BY status',
    } as Awaited<ReturnType<typeof generateEsql>>);

    const result = await generateVisualizationEsql({
      ...params,
      candidateQuery: 'FROM logs-* | STATS c = COUNT()',
    });

    expect(mockedGenerateEsql).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      query: 'FROM logs-* | STATS c = COUNT() BY status',
      columns: undefined,
    });
  });

  it('does not judge when there is no current query', async () => {
    mockedGenerateEsql.mockResolvedValue({ query: 'FROM logs-*' } as Awaited<
      ReturnType<typeof generateEsql>
    >);

    await generateVisualizationEsql(params);

    expect(mockedJudgeVisualizationEsql).not.toHaveBeenCalled();
    expect(mockedGenerateEsql).toHaveBeenCalledTimes(1);
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
        additionalInstructions: 'esql-instructions',
        timeRange: { from: 'now-7d', to: 'now' },
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
