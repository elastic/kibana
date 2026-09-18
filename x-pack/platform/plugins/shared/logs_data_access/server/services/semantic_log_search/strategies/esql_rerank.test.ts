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

  it('returns strategy esql_rerank when the query succeeds', async () => {
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

    expect(result).toEqual({ patterns: [], strategy: 'esql_rerank' });
  });

  it('reports unavailable and warns when the query fails', async () => {
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

    expect(result).toEqual({ patterns: [], unavailable: true });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('verification_exception'));
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

    it('handles missing optional columns', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
        ],
        values: [['Error pattern', 25]],
      };

      const patterns = parseEsqlPatternResponse(response);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern).toBe('Error pattern');
      expect(patterns[0].count).toBe(25);
      expect(patterns[0].sample).toEqual({ message: '' });
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
        ],
        values: [
          [null, 10], // null pattern - should be filtered
          ['Valid', null], // null count - should be filtered
          ['Valid', 5], // valid - should be included
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
          { name: '_score', type: 'double' },
        ],
        values: [
          ['Error pattern', 10, 3.46],
          ['Warning pattern', 5, -2.15],
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
        ],
        values: [['Error pattern', 10]],
      };

      const patterns = parseEsqlPatternResponse(response);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]).not.toHaveProperty('relevanceScore');
    });
  });
});
