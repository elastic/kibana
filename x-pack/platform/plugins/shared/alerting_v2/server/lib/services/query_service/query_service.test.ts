/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { errors } from '@elastic/elasticsearch';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { QueryService } from './query_service';
import { createQueryService } from './query_service.mock';
import {
  createMockArrowReader,
  mockHelpersEsqlArrowBatches,
  mockHelpersEsqlToArrowReader,
  type MockArrowReader,
} from '../../test_utils';

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
    const mockQuery = 'FROM .alerting-* | LIMIT 10';
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
          drop_null_columns: true,
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

  describe('executeQueryRows', () => {
    const mockQuery = 'FROM .alerting-* | LIMIT 10';

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

    it('should return typed rows from ES|QL response', async () => {
      mockEsClient.esql.query.mockResolvedValue(mockResponse);

      const result = await queryService.executeQueryRows<{ host: string; count: number }>({
        query: mockQuery,
      });

      expect(result).toEqual([
        { host: 'host-a', count: 1 },
        { host: 'host-b', count: 2 },
      ]);
    });

    it('should coerce BigInt values to Number', async () => {
      mockEsClient.esql.query.mockResolvedValue({
        columns: [
          { name: 'host', type: 'keyword' },
          { name: 'cpu', type: 'long' },
        ],
        values: [['host-a', BigInt(80)]],
      } as unknown as EsqlQueryResponse);

      const result = await queryService.executeQueryRows<{ host: string; cpu: number }>({
        query: mockQuery,
      });

      expect(result).toEqual([{ host: 'host-a', cpu: 80 }]);
      expect(typeof result[0].cpu).toBe('number');
    });

    it('should return empty array when no rows exist', async () => {
      mockEsClient.esql.query.mockResolvedValue({
        columns: [{ name: 'host', type: 'keyword' }],
        values: [],
      });

      const result = await queryService.executeQueryRows({ query: mockQuery });

      expect(result).toEqual([]);
    });

    it('should pass query parameters to ES client', async () => {
      mockEsClient.esql.query.mockResolvedValue(mockResponse);
      const abortController = new AbortController();
      const filter = { bool: { filter: [] } };

      await queryService.executeQueryRows({
        query: mockQuery,
        filter,
        abortSignal: abortController.signal,
      });

      expect(mockEsClient.esql.query).toHaveBeenCalledWith(
        {
          query: mockQuery,
          drop_null_columns: true,
          filter,
          params: undefined,
        },
        { signal: abortController.signal }
      );
    });

    it('should throw an error when query fails', async () => {
      mockEsClient.esql.query.mockRejectedValue(new Error('Query failed'));

      await expect(queryService.executeQueryRows({ query: mockQuery })).rejects.toThrow(
        'Query failed'
      );
    });
  });

  describe('executeQueryStream (arrow)', () => {
    const mockQuery = 'FROM .alerting-* | LIMIT 10';

    beforeEach(() => {
      const mocks = createQueryService('arrow');
      mockEsClient = mocks.mockEsClient;
      mockLogger = mocks.mockLogger;
      queryService = mocks.queryService;
    });

    it('yields rows from the Arrow stream reader', async () => {
      mockHelpersEsqlArrowBatches(mockEsClient, [
        {
          numRows: 2,
          rows: [
            { host: 'host-a', count: 1 },
            { host: 'host-b', count: 2 },
          ],
        },
      ]);

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

    it('yields multiple batches in order', async () => {
      mockHelpersEsqlArrowBatches(mockEsClient, [
        { numRows: 1, rows: [{ host: 'host-a' }] },
        { numRows: 1, rows: [{ host: 'host-b' }] },
      ]);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toEqual([[{ host: 'host-a' }], [{ host: 'host-b' }]]);
    });

    it('skips empty batches', async () => {
      mockHelpersEsqlArrowBatches(mockEsClient, [
        { numRows: 0, rows: [] },
        { numRows: 1, rows: [{ host: 'host-a' }] },
      ]);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toEqual([[{ host: 'host-a' }]]);
    });

    it('coerces BigInt values to Number in streamed rows', async () => {
      mockHelpersEsqlArrowBatches(mockEsClient, [
        {
          numRows: 2,
          rows: [
            { host: 'host-a', cpu: BigInt(80), memory: BigInt(1024) },
            { host: 'host-b', cpu: BigInt(45), memory: BigInt(2048) },
          ],
        },
      ]);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual([
        { host: 'host-a', cpu: 80, memory: 1024 },
        { host: 'host-b', cpu: 45, memory: 2048 },
      ]);

      for (const row of batches[0]) {
        expect(typeof row.cpu).toBe('number');
        expect(typeof row.memory).toBe('number');
      }
    });

    it('produces JSON-serializable rows when source contains BigInt', async () => {
      mockHelpersEsqlArrowBatches(mockEsClient, [
        {
          numRows: 1,
          rows: [{ host: 'host-a', count: BigInt(99) }],
        },
      ]);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(() => JSON.stringify(batches[0])).not.toThrow();
      expect(JSON.parse(JSON.stringify(batches[0]))).toEqual([{ host: 'host-a', count: 99 }]);
    });

    it('truncates date_nanos columns to integer epoch millis (parity with the JSON path)', async () => {
      // Arrow decodes date_nanos to fractional millis; the JSON path yields
      // integer millis via Date.parse. Both must agree.
      const fractionalMillis = 1787580092123.4568;
      mockHelpersEsqlArrowBatches(mockEsClient, [
        {
          numRows: 1,
          rows: [{ bucket: fractionalMillis, host: 'host-a' }],
          timestampColumns: ['bucket'],
        },
      ]);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toEqual([[{ bucket: 1787580092123, host: 'host-a' }]]);
      expect(Number.isInteger(batches[0][0].bucket)).toBe(true);
    });

    it('truncates multivalue timestamp columns element-wise', async () => {
      mockHelpersEsqlArrowBatches(mockEsClient, [
        {
          numRows: 1,
          rows: [{ bucket: [1787580092123.4568, 1787580095123.99] }],
          timestampColumns: ['bucket'],
        },
      ]);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toEqual([[{ bucket: [1787580092123, 1787580095123] }]]);
    });

    it('leaves fractional non-timestamp numeric columns untouched', async () => {
      mockHelpersEsqlArrowBatches(mockEsClient, [{ numRows: 1, rows: [{ ratio: 12.75 }] }]);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toEqual([[{ ratio: 12.75 }]]);
    });

    it('passes the query and abort signal to the ES|QL Arrow helper', async () => {
      const reader = createMockArrowReader([{ numRows: 1, rows: [{ host: 'host-a' }] }]);
      const toArrowReader = jest.fn().mockResolvedValue(reader);
      mockHelpersEsqlToArrowReader(mockEsClient, toArrowReader);

      const abortController = new AbortController();
      const filter = { bool: { filter: [] } };

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({
        query: mockQuery,
        filter,
        abortSignal: abortController.signal,
      })) {
        batches.push(batch);
      }

      expect(mockEsClient.helpers.esql).toHaveBeenCalledWith(
        {
          query: mockQuery,
          drop_null_columns: true,
          filter,
          params: undefined,
        },
        { signal: abortController.signal }
      );
      expect(toArrowReader).toHaveBeenCalledTimes(1);
    });

    it('throws and logs error when the helper rejects', async () => {
      mockHelpersEsqlToArrowReader(
        mockEsClient,
        jest.fn().mockRejectedValue(new Error('ES query failed'))
      );

      await expect(async () => {
        for await (const _batch of queryService.executeQueryStream({ query: mockQuery })) {
          // consume
        }
      }).rejects.toThrow('ES query failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('propagates ResponseError from the helper unchanged (e.g. unsupported ES|QL types)', async () => {
      /*
       * Simulates the upstream fix in elasticsearch-js 9.4.0 where the helper
       * surfaces server-side JSON errors as a ResponseError instead of a
       * misleading Arrow parse error.
       * See https://github.com/elastic/elasticsearch-js/pull/3276
       */
      class FakeResponseError extends Error {
        public readonly statusCode = 400;
        public readonly body = {
          error: {
            type: 'illegal_argument_exception',
            reason: 'ES|QL type [date_range] is not supported by the Arrow format',
          },
        };
      }

      const responseError = new FakeResponseError(
        'illegal_argument_exception: ES|QL type [date_range] is not supported by the Arrow format'
      );
      mockHelpersEsqlToArrowReader(mockEsClient, jest.fn().mockRejectedValue(responseError));

      await expect(async () => {
        for await (const _batch of queryService.executeQueryStream({ query: mockQuery })) {
          // consume
        }
      }).rejects.toBe(responseError);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('wraps mid-stream Arrow parse failures with a descriptive error', async () => {
      const reader: MockArrowReader = {
        closed: false,
        cancel: jest.fn().mockResolvedValue(undefined),
        async *[Symbol.asyncIterator]() {
          throw new Error('Expected to read 1919230334 metadata bytes, but only read 8');
        },
      };
      mockHelpersEsqlToArrowReader(mockEsClient, jest.fn().mockResolvedValue(reader));

      await expect(async () => {
        for await (const _batch of queryService.executeQueryStream({ query: mockQuery })) {
          // consume
        }
      }).rejects.toThrow(/Failed to parse ES\|QL response/);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('logs debug instead of error when cancelled', async () => {
      const { RuleExecutionCancellationError } = jest.requireActual('../../execution_context');
      mockHelpersEsqlToArrowReader(
        mockEsClient,
        jest.fn().mockRejectedValue(new RuleExecutionCancellationError('Streaming query aborted'))
      );

      await expect(async () => {
        for await (const _batch of queryService.executeQueryStream({ query: mockQuery })) {
          // consume
        }
      }).rejects.toThrow(/aborted/i);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('does not call cancel on the reader after a successful iteration', async () => {
      const reader = mockHelpersEsqlArrowBatches(mockEsClient, [
        { numRows: 1, rows: [{ host: 'host-a' }] },
      ]);

      for await (const _batch of queryService.executeQueryStream({ query: mockQuery })) {
        // consume
      }

      expect(reader.closed).toBe(true);
      expect(reader.cancel).not.toHaveBeenCalled();
    });

    it('cancels the reader when iteration throws', async () => {
      const reader: MockArrowReader = {
        closed: false,
        cancel: jest.fn().mockImplementation(async function (this: MockArrowReader) {
          this.closed = true;
        }),
        async *[Symbol.asyncIterator]() {
          throw new Error('mid-stream failure');
        },
      };
      mockHelpersEsqlToArrowReader(mockEsClient, jest.fn().mockResolvedValue(reader));

      await expect(async () => {
        for await (const _batch of queryService.executeQueryStream({ query: mockQuery })) {
          // consume
        }
      }).rejects.toThrow();

      expect(reader.cancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeQueryStream (json)', () => {
    const mockQuery = 'FROM .alerting-* | LIMIT 10';

    it('runs the JSON query and yields all rows as a single batch', async () => {
      mockEsClient.esql.query.mockResolvedValue({
        columns: [
          { name: 'host', type: 'keyword' },
          { name: 'count', type: 'integer' },
        ],
        values: [
          ['host-a', 1],
          ['host-b', 2],
        ],
      });

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(mockEsClient.helpers.esql).not.toHaveBeenCalled();
      expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual([
        { host: 'host-a', count: 1 },
        { host: 'host-b', count: 2 },
      ]);
    });

    it('yields nothing when the result set is empty', async () => {
      mockEsClient.esql.query.mockResolvedValue({
        columns: [{ name: 'host', type: 'keyword' }],
        values: [],
      });

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toEqual([]);
    });

    it('coerces BigInt values to Number in streamed rows', async () => {
      mockEsClient.esql.query.mockResolvedValue({
        columns: [
          { name: 'host', type: 'keyword' },
          { name: 'cpu', type: 'long' },
        ],
        values: [['host-a', BigInt(80)]],
      } as unknown as EsqlQueryResponse);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toEqual([[{ host: 'host-a', cpu: 80 }]]);
      expect(typeof batches[0][0].cpu).toBe('number');
    });

    it('passes the query, filter and abort signal to the JSON helper', async () => {
      mockEsClient.esql.query.mockResolvedValue({
        columns: [{ name: 'host', type: 'keyword' }],
        values: [['host-a']],
      });

      const abortController = new AbortController();
      const filter = { bool: { filter: [] } };

      for await (const _batch of queryService.executeQueryStream({
        query: mockQuery,
        filter,
        abortSignal: abortController.signal,
      })) {
        // consume
      }

      expect(mockEsClient.esql.query).toHaveBeenCalledWith(
        {
          query: mockQuery,
          drop_null_columns: true,
          filter,
          params: undefined,
        },
        { signal: abortController.signal }
      );
    });

    it('forwards maxResponseSize to the transport options', async () => {
      mockEsClient.esql.query.mockResolvedValue({
        columns: [{ name: 'host', type: 'keyword' }],
        values: [['host-a']],
      });

      const maxResponseSize = 1024;

      for await (const _batch of queryService.executeQueryStream({
        query: mockQuery,
        maxResponseSize,
      })) {
        /** do nothing */
      }

      expect(mockEsClient.esql.query).toHaveBeenCalledWith(
        {
          query: mockQuery,
          drop_null_columns: true,
          filter: undefined,
          params: undefined,
        },
        expect.objectContaining({ maxResponseSize })
      );
    });

    it('throws and logs error when the query fails', async () => {
      mockEsClient.esql.query.mockRejectedValue(new Error('ES query failed'));

      await expect(async () => {
        for await (const _batch of queryService.executeQueryStream({ query: mockQuery })) {
          // consume
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

    it('logs debug instead of error when the transport aborts mid-flight', async () => {
      const abortController = new AbortController();
      mockEsClient.esql.query.mockImplementation(async () => {
        abortController.abort();
        throw new errors.RequestAbortedError('Request aborted');
      });

      await expect(async () => {
        for await (const _batch of queryService.executeQueryStream({
          query: mockQuery,
          abortSignal: abortController.signal,
        })) {
          // consume
        }
      }).rejects.toThrow(errors.RequestAbortedError);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('coerces date columns from ISO-8601 strings to epoch millis', async () => {
      const iso = '2026-08-24T14:01:32.000Z';
      mockEsClient.esql.query.mockResolvedValue({
        columns: [
          { name: 'bucket', type: 'date' },
          { name: 'metric_value', type: 'long' },
        ],
        values: [[iso, 42]],
      });

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toEqual([[{ bucket: Date.parse(iso), metric_value: 42 }]]);
      expect(typeof batches[0][0].bucket).toBe('number');
    });

    it('coerces date_nanos columns to epoch millis', async () => {
      const iso = '2026-08-24T14:01:32.123456789Z';
      mockEsClient.esql.query.mockResolvedValue({
        columns: [{ name: 'bucket', type: 'date_nanos' }],
        values: [[iso]],
      });

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      // `date_nanos` is truncated to millisecond precision; `.456789` is dropped
      expect(batches).toEqual([[{ bucket: 1787580092123 }]]);
    });

    it('maps multivalue date columns element-wise to epoch millis', async () => {
      const first = '2026-08-24T14:01:32.000Z';
      const second = '2026-08-24T15:01:32.000Z';
      mockEsClient.esql.query.mockResolvedValue({
        columns: [{ name: 'bucket', type: 'date' }],
        values: [[[first, second]]],
      } as unknown as EsqlQueryResponse);

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toEqual([[{ bucket: [Date.parse(first), Date.parse(second)] }]]);
    });

    it('leaves non-date columns untouched when normalizing dates', async () => {
      const iso = '2026-08-24T14:01:32.000Z';
      mockEsClient.esql.query.mockResolvedValue({
        columns: [
          { name: 'bucket', type: 'date' },
          { name: 'label', type: 'keyword' },
          { name: 'count', type: 'integer' },
        ],
        values: [[iso, '2026-08-24T14:01:32.000Z', 7]],
      });

      const batches: Array<Record<string, unknown>[]> = [];
      for await (const batch of queryService.executeQueryStream({ query: mockQuery })) {
        batches.push(batch);
      }

      expect(batches).toEqual([
        [{ bucket: Date.parse(iso), label: '2026-08-24T14:01:32.000Z', count: 7 }],
      ]);
    });
  });
});
