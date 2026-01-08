/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { StorageService } from './storage_service';
import { LoggerService } from './logger_service';

describe('StorageService', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let mockLoggerService: LoggerService;
  let storageService: StorageService;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockLogger = loggerMock.create();
    mockLoggerService = new LoggerService(mockLogger);
    storageService = new StorageService(mockEsClient, mockLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkIndexDocs', () => {
    const index = 'my-index';
    const mockDocs = [
      { '@timestamp': '2024-01-01T00:00:00Z', rule_id: 'rule-1', alert_series_id: 'series-1' },
      { '@timestamp': '2024-01-01T00:01:00Z', rule_id: 'rule-2', alert_series_id: 'series-2' },
    ];

    it('should return early when docs array is empty', async () => {
      await storageService.bulkIndexDocs({ index, docs: [] });

      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('should successfully bulk index documents', async () => {
      const mockBulkResponse = {
        items: [{ index: { _id: '1', status: 201 } }, { index: { _id: '2', status: 201 } }],
        errors: false,
      };

      // @ts-expect-error - not all fields are used
      mockEsClient.bulk.mockResolvedValue(mockBulkResponse);

      await storageService.bulkIndexDocs({ index, docs: mockDocs });

      expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _index: index } },
          mockDocs[0],
          { index: { _index: index } },
          mockDocs[1],
        ],
        refresh: 'wait_for',
      });
    });

    it('should format operations correctly for bulk indexing', async () => {
      const mockBulkResponse = {
        items: [{ index: { _id: '1', status: 201 } }],
        errors: false,
      };

      // @ts-expect-error - not all fields are used
      mockEsClient.bulk.mockResolvedValue(mockBulkResponse);

      const docs = [mockDocs[0]];
      await storageService.bulkIndexDocs({ index, docs });

      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        operations: [{ index: { _index: index } }, docs[0]],
        refresh: 'wait_for',
      });
    });

    it('should log error when bulk response contains errors', async () => {
      const mockBulkResponse = {
        items: [
          { index: { _id: '1', status: 201 } },
          {
            index: {
              _id: '2',
              status: 400,
              error: {
                type: 'mapper_parsing_exception',
                reason: 'failed to parse',
                status: 400,
              },
            },
          },
        ],
        errors: true,
      };

      // @ts-expect-error - not all fields are used
      mockEsClient.bulk.mockResolvedValue(mockBulkResponse);

      await storageService.bulkIndexDocs({ index, docs: mockDocs });

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle bulk response with errors but no error items gracefully', async () => {
      const mockBulkResponse = {
        items: [{ index: { _id: '1', status: 201 } }],
        errors: true,
        took: 5,
      };

      // @ts-expect-error - not all fields are used
      mockEsClient.bulk.mockResolvedValue(mockBulkResponse);

      await storageService.bulkIndexDocs({ index, docs: [mockDocs[0]] });

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw error and log when bulk operation fails', async () => {
      const error = new Error('Elasticsearch connection failed');
      mockEsClient.bulk.mockRejectedValue(error);

      await expect(storageService.bulkIndexDocs({ index, docs: mockDocs })).rejects.toThrow(
        'Elasticsearch connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
