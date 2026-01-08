/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { EsqlService } from './esql_service';
import { LoggerService } from './logger_service';

describe('EsqlService', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let mockLoggerService: LoggerService;
  let esqlService: EsqlService;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockLogger = loggerMock.create();
    mockLoggerService = new LoggerService(mockLogger);
    esqlService = new EsqlService(mockEsClient, mockLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeQuery', () => {
    const mockQuery = 'FROM .alerts-* | LIMIT 10';

    const mockResponse: EsqlEsqlResult = {
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
      mockEsClient.esql.query = jest.fn().mockResolvedValue(mockResponse);

      const result = await esqlService.executeQuery({ query: mockQuery });

      expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
      expect(mockEsClient.esql.query).toHaveBeenCalledWith({
        query: mockQuery,
        drop_null_columns: false,
      });

      expect(result).toEqual(mockResponse);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw and log error when query execution fails', async () => {
      const error = new Error('ES|QL syntax error');
      mockEsClient.esql.query = jest.fn().mockRejectedValue(error);

      await expect(esqlService.executeQuery({ query: mockQuery })).rejects.toThrow(
        'ES|QL syntax error'
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('queryResponseToObject', () => {
    it('should convert ES|QL response to array of objects', () => {
      const mockResponse: EsqlEsqlResult = {
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

      const result = esqlService.queryResponseToObject(mockResponse);

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
      const mockResponse: EsqlEsqlResult = {
        columns: [
          { name: 'rule_id', type: 'keyword' },
          { name: 'alert_series_id', type: 'keyword' },
        ],
        values: [
          ['rule-1', 'series-1', '2026-01-02T10:29:31.019Z'],
          ['rule-2', 'series-2', '2026-01-02T10:29:31.019Z'],
        ],
      };

      const result = esqlService.queryResponseToObject(mockResponse);

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
      const mockResponse: EsqlEsqlResult = {
        columns: [{ name: 'field', type: 'keyword' }],
        values: [],
      };

      const result = esqlService.queryResponseToObject<{ field: string }>(mockResponse);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle empty columns response', () => {
      const mockResponse: EsqlEsqlResult = {
        columns: [],
        values: [['value']],
      };

      const result = esqlService.queryResponseToObject<{ field: string }>(mockResponse);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });
});
