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
import { LoggerService } from '../logger_service';
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

  describe('queryResponseToRecords', () => {
    it('should convert ES|QL response to array of objects', () => {
      const mockResponse: ESQLSearchResponse = {
        columns: [
          { name: 'rule_id', type: 'keyword' },
          { name: 'alert_series_id', type: 'keyword' },
          { name: '@timestamp', type: 'date' },
        ],
        values: [
          ['rule-1', 'series-1', '2026-01-02T10:29:31.019Z'],
          ['rule-2', 'series-2', '2026-01-02T10:29:31.019Z'],
        ],
      };

      const result = esqlService.queryResponseToRecords(mockResponse);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        {
          '@timestamp': '2026-01-02T10:29:31.019Z',
          rule_id: 'rule-1',
          alert_series_id: 'series-1',
        },
        {
          '@timestamp': '2026-01-02T10:29:31.019Z',
          rule_id: 'rule-2',
          alert_series_id: 'series-2',
        },
      ]);
    });

    it('should handle missing column names in response', () => {
      const mockResponse: ESQLSearchResponse = {
        columns: [
          { name: 'rule_id', type: 'keyword' },
          { name: 'alert_series_id', type: 'keyword' },
        ],
        values: [
          ['rule-1', 'series-1', '2026-01-02T10:29:31.019Z'],
          ['rule-2', 'series-2', '2026-01-02T10:29:31.019Z'],
        ],
      };

      const result = esqlService.queryResponseToRecords(mockResponse);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        {
          rule_id: 'rule-1',
          alert_series_id: 'series-1',
        },
        {
          rule_id: 'rule-2',
          alert_series_id: 'series-2',
        },
      ]);
    });

    it('should handle empty values response', () => {
      const mockResponse: ESQLSearchResponse = {
        columns: [{ name: 'field', type: 'keyword' }],
        values: [],
      };

      const result = esqlService.queryResponseToRecords<{ field: string }>(mockResponse);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle empty columns response', () => {
      const mockResponse: ESQLSearchResponse = {
        columns: [],
        values: [['value']],
      };

      const result = esqlService.queryResponseToRecords<{ field: string }>(mockResponse);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });
});
