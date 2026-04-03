/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AutomaticImportSamplesIndexService } from './index_service';
import type { AddSamplesToDataStreamParams } from './index_service';

// Mock the storage adapter
jest.mock('./storage', () => {
  const mockBulk = jest.fn().mockResolvedValue({
    took: 1,
    errors: false,
    items: [],
  });

  const mockSearch = jest.fn().mockResolvedValue({
    hits: {
      hits: [
        {
          _source: {
            log_data: 'sample log 1',
          },
        },
        {
          _source: {
            log_data: 'sample log 2',
          },
        },
      ],
    },
  });

  const mockDelete = jest.fn().mockResolvedValue({});

  const mockGetClient = jest.fn().mockReturnValue({
    bulk: mockBulk,
    search: mockSearch,
    delete: mockDelete,
  });

  return {
    automaticImportSamplesIndexName: '.kibana-automatic-import-samples',
    createIndexAdapter: jest.fn().mockReturnValue({
      getClient: mockGetClient,
    }),
    AutomaticImportSamplesIndexAdapter: jest.fn(),
    AutomaticImportSamplesProperties: jest.fn(),
  };
});

describe('AutomaticImportSamplesIndexService', () => {
  let service: AutomaticImportSamplesIndexService;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockLoggerFactory: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockLoggerFactory = loggerMock.create();

    service = new AutomaticImportSamplesIndexService(mockLoggerFactory);
    service.initialize(mockEsClient);
  });

  describe('addSamplesToDataStream', () => {
    it('should create multiple sample documents from rawSamples array', async () => {
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
        rawSamples: ['Sample log line 1', 'Sample log line 2', 'Sample log line 3'],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        createdBy: 'test-user',
      };

      await service.addSamplesToDataStream(params);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      expect(bulkClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = bulkClient.bulk.mock.calls[0][0];

      expect(callArgs.operations).toHaveLength(3);
      expect(callArgs.operations[0].index.document).toMatchObject({
        integration_id: 'integration-123',
        data_stream_id: 'data-stream-456',
        log_data: 'Sample log line 1',
        created_by: 'test-user',
        original_source: {
          source_type: 'file',
          source_value: 'logs.txt',
        },
      });
      expect(callArgs.operations[1].index.document.log_data).toBe('Sample log line 2');
      expect(callArgs.operations[2].index.document.log_data).toBe('Sample log line 3');
      expect(callArgs.operations[0].index.document.metadata).toHaveProperty('created_at');
    });

    it('should create a single sample document', async () => {
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
        rawSamples: ['Sample log line 1'],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        createdBy: 'test-user',
      };

      await service.addSamplesToDataStream(params);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      expect(bulkClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = bulkClient.bulk.mock.calls[0][0];

      expect(callArgs.operations).toHaveLength(1);
      expect(callArgs.operations[0].index.document).toMatchObject({
        integration_id: 'integration-123',
        data_stream_id: 'data-stream-456',
        log_data: 'Sample log line 1',
        created_by: 'test-user',
        original_source: {
          source_type: 'file',
          source_value: 'logs.txt',
        },
      });
    });

    it('should use createdBy for created_by field', async () => {
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
        rawSamples: ['Sample log'],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        createdBy: 'test-user',
      };

      await service.addSamplesToDataStream(params);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      const callArgs = bulkClient.bulk.mock.calls[0][0];
      const document = callArgs.operations[0].index.document;

      expect(document.created_by).toBe('test-user');
    });

    it('should generate created_at timestamp in metadata', async () => {
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
        rawSamples: ['Sample log'],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        createdBy: 'test-user',
      };

      await service.addSamplesToDataStream(params);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      const callArgs = bulkClient.bulk.mock.calls[0][0];
      const document = callArgs.operations[0].index.document;

      expect(document.metadata.created_at).toBeDefined();
      expect(typeof document.metadata.created_at).toBe('string');
      expect(new Date(document.metadata.created_at).toISOString()).toBe(
        document.metadata.created_at
      );
    });

    it('should handle empty rawSamples array', async () => {
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
        rawSamples: [],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        createdBy: 'test-user',
      };

      await service.addSamplesToDataStream(params);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      expect(bulkClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = bulkClient.bulk.mock.calls[0][0];
      expect(callArgs.operations).toHaveLength(0);
    });

    it('should handle special characters in log data', async () => {
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
        rawSamples: ['Log with "quotes" and \\backslashes\\ and \nnewlines'],
        originalSource: { sourceType: 'file', sourceValue: 'logs with spaces.txt' },
        createdBy: 'test-user',
      };

      await service.addSamplesToDataStream(params);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      const callArgs = bulkClient.bulk.mock.calls[0][0];
      const document = callArgs.operations[0].index.document;

      expect(document.log_data).toBe('Log with "quotes" and \\backslashes\\ and \nnewlines');
      expect(document.original_source).toEqual({
        source_type: 'file',
        source_value: 'logs with spaces.txt',
      });
    });
  });

  describe('getSamplesForDataStream', () => {
    it('should retrieve samples for a data stream', async () => {
      const samples = await service.getSamplesForDataStream('integration-123', 'data-stream-456');

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const searchClient = adapterInstance.getClient();

      expect(searchClient.search).toHaveBeenCalledTimes(1);
      expect(searchClient.search).toHaveBeenCalledWith({
        query: {
          bool: {
            must: [
              { term: { integration_id: 'integration-123' } },
              { term: { data_stream_id: 'data-stream-456' } },
            ],
          },
        },
        size: 500,
        track_total_hits: false,
      });

      expect(samples).toEqual(['sample log 1', 'sample log 2']);
    });
  });

  describe('deleteSamplesForDataStream', () => {
    it('should delete all samples for a data stream in a single deleteByQuery call', async () => {
      mockEsClient.deleteByQuery.mockResolvedValue({ deleted: 3 } as any);

      const result = await service.deleteSamplesForDataStream('integration-123', 'data-stream-456');

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: expect.any(String),
        query: {
          bool: {
            must: [
              { term: { integration_id: 'integration-123' } },
              { term: { data_stream_id: 'data-stream-456' } },
            ],
          },
        },
        refresh: true,
        ignore_unavailable: true,
        conflicts: 'proceed',
      });

      expect(result).toEqual({ deleted: 3 });
    });

    it('should delete many samples in one deleteByQuery call', async () => {
      mockEsClient.deleteByQuery.mockResolvedValue({ deleted: 1500 } as any);

      const result = await service.deleteSamplesForDataStream('integration-123', 'data-stream-456');

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ deleted: 1500 });
    });

    it('should return zero deleted count when no samples exist', async () => {
      mockEsClient.deleteByQuery.mockResolvedValue({ deleted: 0 } as any);

      const result = await service.deleteSamplesForDataStream('integration-123', 'data-stream-456');

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ deleted: 0 });
    });

    it('should propagate errors from deleteByQuery', async () => {
      mockEsClient.deleteByQuery.mockRejectedValue(new Error('Delete by query failed'));

      await expect(
        service.deleteSamplesForDataStream('integration-123', 'data-stream-456')
      ).rejects.toThrow('Delete by query failed');
    });

    it('should use correct index name and query parameters for filtering', async () => {
      const { automaticImportSamplesIndexName } = jest.requireActual('./storage');
      mockEsClient.deleteByQuery.mockResolvedValue({ deleted: 0 } as any);

      await service.deleteSamplesForDataStream('test-integration', 'test-datastream');

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: automaticImportSamplesIndexName,
        query: {
          bool: {
            must: [
              { term: { integration_id: 'test-integration' } },
              { term: { data_stream_id: 'test-datastream' } },
            ],
          },
        },
        refresh: true,
        ignore_unavailable: true,
        conflicts: 'proceed',
      });
    });

    it('should coerce missing deleted count to zero', async () => {
      mockEsClient.deleteByQuery.mockResolvedValue({} as any);

      const result = await service.deleteSamplesForDataStream('integration-123', 'data-stream-456');

      expect(result).toEqual({ deleted: 0 });
    });
  });

  describe('constructor', () => {
    it('should initialize with logger factory', () => {
      expect(mockLoggerFactory.get).toHaveBeenCalledWith('samplesIndexService');
    });
  });
});
