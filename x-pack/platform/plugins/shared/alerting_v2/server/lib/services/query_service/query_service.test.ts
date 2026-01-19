/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { loggerMock } from '@kbn/logging-mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { QueryService } from './query_service';
import { LoggerService } from '../logger_service/logger_service';
import { httpServerMock } from '@kbn/core/server/mocks';

describe('QueryService', () => {
  let mockSearchClient: jest.Mocked<IScopedSearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let mockLoggerService: LoggerService;
  let esqlService: QueryService;

  beforeEach(() => {
    // @ts-expect-error - dataPluginMock is not typed correctly
    mockSearchClient = dataPluginMock
      .createStartContract()
      .search.asScoped(httpServerMock.createKibanaRequest({}));

    mockLogger = loggerMock.create();
    mockLoggerService = new LoggerService(mockLogger);
    esqlService = new QueryService(mockSearchClient, mockLoggerService);
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

    const mockParams = [
      { _tstart: '2025-01-01T00:00:00.000Z' },
      { _tend: '2025-01-02T00:00:00.000Z' },
    ];

    const mockResponse: ESQLSearchResponse = {
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
      mockSearchClient.search.mockReturnValue(
        of({
          isRunning: false,
          rawResponse: mockResponse,
        })
      );

      const result = await esqlService.executeQuery({
        query: mockQuery,
        filter: mockFilter,
        params: mockParams,
      });

      expect(mockSearchClient.search).toHaveBeenCalledTimes(1);
      expect(mockSearchClient.search).toHaveBeenCalledWith(
        {
          params: {
            query: mockQuery,
            dropNullColumns: false,
            filter: mockFilter,
            params: mockParams,
          },
        },
        {
          strategy: 'esql',
        }
      );

      expect(result).toEqual(mockResponse);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw and log error when query execution fails', async () => {
      const error = new Error('ES|QL syntax error');
      mockSearchClient.search.mockReturnValue(throwError(() => error));

      await expect(esqlService.executeQuery({ query: mockQuery })).rejects.toThrow(
        'ES|QL syntax error'
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
