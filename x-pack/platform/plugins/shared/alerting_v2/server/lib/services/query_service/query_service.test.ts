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
});
