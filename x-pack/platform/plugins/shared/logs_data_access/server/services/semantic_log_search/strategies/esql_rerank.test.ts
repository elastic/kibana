/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { loggerMock } from '@kbn/logging-mocks';
import type { SemanticLogSearchParams } from '../../../../common/services/semantic_log_search/types';
import { parseEsqlPatternResponse, searchWithEsqlRerank } from './esql_rerank';

describe('searchWithEsqlRerank', () => {
  const emptyResponse: ESQLSearchResponse = { columns: [], values: [] };

  const runQuery = async (overrides: Partial<SemanticLogSearchParams> = {}) => {
    const query = jest.fn().mockResolvedValue(emptyResponse);
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;

    await searchWithEsqlRerank(
      {
        esClient,
        target: 'logs-*',
        nlQuery: 'connection failures',
        timeRange: { start: 1704067200000, end: 1704153600000 },
        ...overrides,
      },
      loggerMock.create()
    );

    return query.mock.calls[0][0];
  };

  it('sends the time range as reserved named params instead of inlining it', async () => {
    const request = await runQuery();

    expect(request.query).toContain('WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend');
    expect(request.params).toEqual([
      { _tstart: '2024-01-01T00:00:00.000Z' },
      { _tend: '2024-01-02T00:00:00.000Z' },
    ]);
  });

  it('categorizes, keeps the rank window, then reranks by the natural language query', async () => {
    const { query } = await runQuery();

    expect(query).toContain(
      'BY pattern = CATEGORIZE(message, {"output_format": "tokens", "similarity_threshold": 70})'
    );
    expect(query).toContain('SORT count DESC | LIMIT 500');
    expect(query).toContain('RERANK "connection failures" ON pattern, `sample`');
    expect(query).toMatch(/SORT _score DESC \| LIMIT 10$/);
  });

  it('applies maxPatterns as the final limit', async () => {
    const { query } = await runQuery({ maxPatterns: 3 });

    expect(query).toMatch(/SORT _score DESC \| LIMIT 3$/);
  });

  it('omits the KQL clause when no filter is given', async () => {
    const { query } = await runQuery();

    expect(query).not.toContain('KQL(');
  });

  it('escapes quotes in the KQL filter so it cannot terminate the string literal', async () => {
    const { query } = await runQuery({ kqlFilter: 'service.name:"checkout" | DROP message' });

    expect(query).toContain('WHERE KQL("service.name:\\"checkout\\" | DROP message")');
  });

  it('fails closed on partial results and sets the request timeout', async () => {
    const logger = loggerMock.create();
    const query = jest.fn().mockResolvedValue({ ...emptyResponse, is_partial: true });
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;

    const result = await searchWithEsqlRerank(
      {
        esClient,
        target: 'logs-*',
        nlQuery: 'connection failures',
        timeRange: { start: 1704067200000, end: 1704153600000 },
      },
      logger
    );

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ allow_partial_results: false }),
      expect.objectContaining({ requestTimeout: 30_000 })
    );
    expect(result).toEqual({ status: 'error', reason: 'execution' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('partial results'));
  });

  it('returns success when the query succeeds', async () => {
    const esClient = {
      esql: { query: jest.fn().mockResolvedValue(emptyResponse) },
    } as unknown as ElasticsearchClient;

    const result = await searchWithEsqlRerank(
      {
        esClient,
        target: 'logs-*',
        nlQuery: 'connection failures',
        timeRange: { start: 1704067200000, end: 1704153600000 },
      },
      loggerMock.create()
    );

    expect(result).toEqual({ status: 'success', patterns: [] });
  });

  it('returns execution error and warns when the query fails', async () => {
    const logger = loggerMock.create();
    const esClient = {
      esql: { query: jest.fn().mockRejectedValue(new Error('verification_exception')) },
    } as unknown as ElasticsearchClient;

    const result = await searchWithEsqlRerank(
      {
        esClient,
        target: 'logs-*',
        nlQuery: 'connection failures',
        timeRange: { start: 1704067200000, end: 1704153600000 },
      },
      logger
    );

    expect(result).toEqual({ status: 'error', reason: 'execution' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('verification_exception'));
  });

  it('returns timeout for a transport timeout', async () => {
    const timeoutError = new Error('request timed out');
    timeoutError.name = 'TimeoutError';
    const esClient = {
      esql: { query: jest.fn().mockRejectedValue(timeoutError) },
    } as unknown as ElasticsearchClient;

    const result = await searchWithEsqlRerank(
      {
        esClient,
        target: 'logs-*',
        nlQuery: 'connection failures',
        timeRange: { start: 1704067200000, end: 1704153600000 },
      },
      loggerMock.create()
    );

    expect(result).toEqual({ status: 'error', reason: 'timeout' });
  });

  it('returns cancelled and forwards the abort signal', async () => {
    const abortController = new AbortController();
    const abortError = new Error('request aborted');
    abortError.name = 'RequestAbortedError';
    const query = jest.fn().mockRejectedValue(abortError);
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;

    const result = await searchWithEsqlRerank(
      {
        esClient,
        target: 'logs-*',
        nlQuery: 'connection failures',
        timeRange: { start: 1704067200000, end: 1704153600000 },
        abortSignal: abortController.signal,
      },
      loggerMock.create()
    );

    expect(query.mock.calls[0][1]).toEqual(
      expect.objectContaining({ signal: abortController.signal })
    );
    expect(result).toEqual({ status: 'error', reason: 'cancelled' });
  });
});

describe('esql rerank helpers', () => {
  describe('parseEsqlPatternResponse', () => {
    it('parses ES|QL response with all columns', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
          { name: 'first_seen', type: 'date' },
          { name: 'last_seen', type: 'date' },
          { name: 'sample', type: 'keyword' },
        ],
        values: [
          [
            'Connection to timed out',
            100,
            '2024-01-01T00:00:00.000Z',
            '2024-01-01T12:00:00.000Z',
            'Connection to db-server timed out',
          ],
          [
            'User logged in',
            50,
            '2024-01-01T00:00:00.000Z',
            '2024-01-01T06:00:00.000Z',
            'User admin logged in',
          ],
        ],
      };

      const patterns = parseEsqlPatternResponse(response, 'message');

      expect(patterns).toHaveLength(2);
      expect(patterns[0]).toEqual({
        field: 'message',
        pattern: 'Connection to timed out',
        count: 100,
        firstSeen: '2024-01-01T00:00:00.000Z',
        lastSeen: '2024-01-01T12:00:00.000Z',
        sample: { message: 'Connection to db-server timed out' },
      });
      expect(patterns[1]).toEqual({
        field: 'message',
        pattern: 'User logged in',
        count: 50,
        firstSeen: '2024-01-01T00:00:00.000Z',
        lastSeen: '2024-01-01T06:00:00.000Z',
        sample: { message: 'User admin logged in' },
      });
    });

    it('filters out rows missing required columns', () => {
      const response: ESQLSearchResponse = {
        columns: [{ name: 'other', type: 'keyword' }],
        values: [['value']],
      };

      const patterns = parseEsqlPatternResponse(response);
      expect(patterns).toEqual([]);
    });

    it('filters out rows missing timestamp columns', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
        ],
        values: [['Error pattern', 25]],
      };

      const patterns = parseEsqlPatternResponse(response);

      expect(patterns).toEqual([]);
    });

    it('handles empty response', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
        ],
        values: [],
      };

      const patterns = parseEsqlPatternResponse(response);
      expect(patterns).toEqual([]);
    });

    it('handles numeric timestamps', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
          { name: 'first_seen', type: 'date' },
          { name: 'last_seen', type: 'date' },
        ],
        values: [['Pattern', 10, 1704067200000, 1704153600000]],
      };

      const patterns = parseEsqlPatternResponse(response);

      expect(patterns[0].firstSeen).toBe('2024-01-01T00:00:00.000Z');
      expect(patterns[0].lastSeen).toBe('2024-01-02T00:00:00.000Z');
    });

    it('filters out null pattern or count', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
          { name: 'first_seen', type: 'date' },
          { name: 'last_seen', type: 'date' },
        ],
        values: [
          [null, 10, 1704067200000, 1704153600000],
          ['Valid', null, 1704067200000, 1704153600000],
          ['Valid', 5, 1704067200000, 1704153600000],
        ],
      };

      const patterns = parseEsqlPatternResponse(response);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern).toBe('Valid');
      expect(patterns[0].count).toBe(5);
    });

    it('maps _score to relevanceScore when present', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
          { name: 'first_seen', type: 'date' },
          { name: 'last_seen', type: 'date' },
          { name: '_score', type: 'double' },
        ],
        values: [
          ['Error pattern', 10, 1704067200000, 1704153600000, 3.46],
          ['Warning pattern', 5, 1704067200000, 1704153600000, -2.15],
        ],
      };

      const patterns = parseEsqlPatternResponse(response);

      expect(patterns).toHaveLength(2);
      expect(patterns[0].relevanceScore).toBe(3.46);
      expect(patterns[1].relevanceScore).toBe(-2.15);
    });

    it('omits relevanceScore when _score is not present', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
          { name: 'first_seen', type: 'date' },
          { name: 'last_seen', type: 'date' },
        ],
        values: [['Error pattern', 10, 1704067200000, 1704153600000]],
      };

      const patterns = parseEsqlPatternResponse(response);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]).not.toHaveProperty('relevanceScore');
    });
  });
});
