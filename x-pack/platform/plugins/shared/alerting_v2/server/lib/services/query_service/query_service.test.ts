/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { QueryService } from './query_service';
import { createQueryService } from './query_service.mock';

describe('QueryService', () => {
  let mockEsClient: DeeplyMockedApi<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let queryService: QueryService;

  beforeEach(() => {
    const mocks = createQueryService();
    mockEsClient = mocks.mockEsClient;
    mockLogger = mocks.mockLogger;
    queryService = mocks.queryService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeQuery', () => {
    const mockQuery = 'FROM .alerts-* | LIMIT 10';
    const mockFilter = {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: '2025-01-01T00:00:00.000Z',
                lte: '2025-01-02T00:00:00.000Z',
              },
            },
          },
        ],
      },
    };

    const mockResponse: EsqlQueryResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'rule_id', type: 'keyword' },
      ],
      values: [
        [new Date().toISOString(), 'rule-1'],
        [new Date().toISOString(), 'rule-2'],
      ],
    };

    it('should successfully execute ES|QL query', async () => {
      mockEsClient.esql.query.mockResolvedValue(mockResponse);

      const result = await queryService.executeQuery({
        query: mockQuery,
        filter: mockFilter,
      });

      expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
      expect(mockEsClient.esql.query).toHaveBeenCalledWith(
        {
          query: mockQuery,
          drop_null_columns: false,
          filter: mockFilter,
          params: undefined,
        },
        { signal: undefined }
      );

      expect(result).toEqual(mockResponse);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should pass abort signal to ES client', async () => {
      mockEsClient.esql.query.mockResolvedValue(mockResponse);
      const abortController = new AbortController();

      await queryService.executeQuery({
        query: mockQuery,
        abortSignal: abortController.signal,
      });

      expect(mockEsClient.esql.query).toHaveBeenCalledWith(expect.any(Object), {
        signal: abortController.signal,
      });
    });

    it('should throw and log error when query execution fails', async () => {
      const error = new Error('ES|QL syntax error');
      mockEsClient.esql.query.mockRejectedValue(error);

      await expect(queryService.executeQuery({ query: mockQuery })).rejects.toThrow(
        'ES|QL syntax error'
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('executeQueryStream', () => {
    const mockQuery = 'FROM .alerts-* | LIMIT 10';

    it('yields rows from JSON fallback response', async () => {
      const mockResponse: EsqlQueryResponse = {
        columns: [
          { name: 'host', type: 'keyword' },
          { name: 'count', type: 'integer' },
        ],
        values: [
          ['host-a', 1],
          ['host-b', 2],
        ],
      };

      mockEsClient.esql.query.mockResolvedValue(mockResponse);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual([
        { host: 'host-a', count: 1 },
        { host: 'host-b', count: 2 },
      ]);
    });

    it('coerces BigInt values to Number in streamed rows', async () => {
      mockEsClient.esql.query.mockResolvedValue({
        columns: [
          { name: 'host', type: 'keyword' },
          { name: 'cpu', type: 'long' },
          { name: 'memory', type: 'long' },
        ],
        values: [
          ['host-a', BigInt(80), BigInt(1024)],
          ['host-b', BigInt(45), BigInt(2048)],
        ],
      } as unknown as EsqlQueryResponse);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual([
        { host: 'host-a', cpu: 80, memory: 1024 },
        { host: 'host-b', cpu: 45, memory: 2048 },
      ]);

      // Verify the values are Numbers, not BigInts
      for (const row of batches[0]) {
        expect(typeof row.cpu).toBe('number');
        expect(typeof row.memory).toBe('number');
      }
    });

    it('produces JSON-serializable rows when source contains BigInt', async () => {
      mockEsClient.esql.query.mockResolvedValue({
        columns: [
          { name: 'host', type: 'keyword' },
          { name: 'count', type: 'long' },
        ],
        values: [['host-a', BigInt(99)]],
      } as unknown as EsqlQueryResponse);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      // Should not throw "Do not know how to serialize a BigInt"
      expect(() => JSON.stringify(batches[0])).not.toThrow();
      expect(JSON.parse(JSON.stringify(batches[0]))).toEqual([{ host: 'host-a', count: 99 }]);
    });

    it('passes abort signal to ES client', async () => {
      const mockResponse: EsqlQueryResponse = {
        columns: [{ name: 'host', type: 'keyword' }],
        values: [['host-a']],
      };

      mockEsClient.esql.query.mockResolvedValue(mockResponse);
      const abortController = new AbortController();

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({
        query: mockQuery,
        abortSignal: abortController.signal,
      })) {
        batches.push(batch);
      }

      expect(mockEsClient.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'arrow' }),
        expect.objectContaining({ signal: abortController.signal })
      );
    });

    it('throws and logs error when query fails', async () => {
      mockEsClient.esql.query.mockRejectedValue(new Error('ES query failed'));

      const batches: Array<Record<string, unknown>[]> = [];

      await expect(async () => {
        for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
          batches.push(batch);
        }
      }).rejects.toThrow('ES query failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('logs debug instead of error when cancelled', async () => {
      const { RuleExecutionCancellationError } = jest.requireActual('../../execution_context');
      mockEsClient.esql.query.mockRejectedValue(
        new RuleExecutionCancellationError('Streaming query aborted')
      );

      await expect(async () => {
        for await (const _batch of queryService.executeQueryStream({ query: mockQuery })) {
          // consume
        }
      }).rejects.toThrow(/aborted/i);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
