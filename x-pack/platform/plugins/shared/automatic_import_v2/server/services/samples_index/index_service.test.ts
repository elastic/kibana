/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AutomaticImportSamplesIndexService } from './index_service';
import type { IndexSamples } from '../../../common';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

// Mock the storage adapter
jest.mock('./storage', () => {
  const mockBulk = jest.fn().mockResolvedValue({
    took: 1,
    errors: false,
    items: [],
  });

  const mockGetClient = jest.fn().mockReturnValue({
    bulk: mockBulk,
  });

  return {
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
  let mockSecurity: jest.Mocked<SecurityPluginStart>;
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockLoggerFactory = loggerMock.create();
    mockRequest = httpServerMock.createKibanaRequest();

    mockSecurity = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue({
          username: 'test-user',
          roles: [],
        }),
      },
    } as any;

    service = new AutomaticImportSamplesIndexService(
      mockLoggerFactory,
      Promise.resolve(mockEsClient),
      Promise.resolve(mockSecurity)
    );

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  describe('createSamplesDocs', () => {
    it('should create a single sample document with snake_case properties', async () => {
      const docs: IndexSamples[] = [
        {
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
          projectId: 'project-789',
          logData: 'Sample log line 1',
          createdBy: 'user-1',
          createdAt: '2024-01-01T00:00:00Z',
          originalFilename: 'logs.txt',
        },
      ];

      await service.createSamplesDocs(mockRequest, docs);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      expect(bulkClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = bulkClient.bulk.mock.calls[0][0];

      expect(callArgs.operations).toHaveLength(1);
      expect(callArgs.operations[0].index.document).toMatchObject({
        integration_id: 'integration-123',
        data_stream_id: 'data-stream-456',
        project_id: 'project-789',
        log_data: 'Sample log line 1',
        created_by: 'test-user',
        original_filename: 'logs.txt',
      });
      expect(callArgs.operations[0].index.document.metadata).toHaveProperty('created_at');
    });

    it('should create multiple sample documents', async () => {
      const docs: IndexSamples[] = [
        {
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
          projectId: 'project-789',
          logData: 'Sample log line 1',
          createdBy: 'user-1',
          createdAt: '2024-01-01T00:00:00Z',
          originalFilename: 'logs.txt',
        },
        {
          integrationId: 'integration-456',
          dataStreamId: 'data-stream-789',
          logData: 'Sample log line 2',
          createdBy: 'user-2',
          createdAt: '2024-01-02T00:00:00Z',
          originalFilename: 'logs2.txt',
        },
      ];

      await service.createSamplesDocs(mockRequest, docs);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      expect(bulkClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = bulkClient.bulk.mock.calls[0][0];

      expect(callArgs.operations).toHaveLength(2);
      expect(callArgs.operations[0].index.document.integration_id).toBe('integration-123');
      expect(callArgs.operations[1].index.document.integration_id).toBe('integration-456');
    });

    it('should handle documents without optional projectId field', async () => {
      const docs: IndexSamples[] = [
        {
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
          logData: 'Sample log line without project',
          createdBy: 'user-1',
          createdAt: '2024-01-01T00:00:00Z',
          originalFilename: 'logs.txt',
        },
      ];

      await service.createSamplesDocs(mockRequest, docs);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      const callArgs = bulkClient.bulk.mock.calls[0][0];
      const document = callArgs.operations[0].index.document;

      expect(document).not.toHaveProperty('project_id');
      expect(document.integration_id).toBe('integration-123');
      expect(document.data_stream_id).toBe('data-stream-456');
    });

    it('should use authenticated user for created_by field', async () => {
      const docs: IndexSamples[] = [
        {
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
          logData: 'Sample log',
          createdBy: 'original-user', // This should be ignored
          createdAt: '2024-01-01T00:00:00Z',
          originalFilename: 'logs.txt',
        },
      ];

      await service.createSamplesDocs(mockRequest, docs);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      const callArgs = bulkClient.bulk.mock.calls[0][0];
      const document = callArgs.operations[0].index.document;

      expect(document.created_by).toBe('test-user');
      expect(mockSecurity.authc.getCurrentUser).toHaveBeenCalledWith(mockRequest);
    });

    it('should throw error when user is not authenticated', async () => {
      mockSecurity.authc.getCurrentUser = jest.fn().mockReturnValue(null);

      const docs: IndexSamples[] = [
        {
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
          logData: 'Sample log',
          createdBy: 'user-1',
          createdAt: '2024-01-01T00:00:00Z',
          originalFilename: 'logs.txt',
        },
      ];

      await expect(service.createSamplesDocs(mockRequest, docs)).rejects.toThrow(
        'No user authenticated'
      );
    });

    it('should generate created_at timestamp in metadata', async () => {
      const docs: IndexSamples[] = [
        {
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
          logData: 'Sample log',
          createdBy: 'user-1',
          createdAt: '2024-01-01T00:00:00Z',
          originalFilename: 'logs.txt',
        },
      ];

      await service.createSamplesDocs(mockRequest, docs);

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

    it('should handle empty array of documents', async () => {
      const docs: IndexSamples[] = [];

      await service.createSamplesDocs(mockRequest, docs);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      expect(bulkClient.bulk).toHaveBeenCalledTimes(1);
      const callArgs = bulkClient.bulk.mock.calls[0][0];
      expect(callArgs.operations).toHaveLength(0);
    });

    it('should handle documents with special characters', async () => {
      const docs: IndexSamples[] = [
        {
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
          projectId: 'project-with-special-chars-@#$',
          logData: 'Log with "quotes" and \\backslashes\\ and \nnewlines',
          createdBy: 'user-1',
          createdAt: '2024-01-01T00:00:00Z',
          originalFilename: 'logs with spaces.txt',
        },
      ];

      await service.createSamplesDocs(mockRequest, docs);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      const callArgs = bulkClient.bulk.mock.calls[0][0];
      const document = callArgs.operations[0].index.document;

      expect(document.project_id).toBe('project-with-special-chars-@#$');
      expect(document.log_data).toBe('Log with "quotes" and \\backslashes\\ and \nnewlines');
      expect(document.original_filename).toBe('logs with spaces.txt');
    });

    it('should handle mixed documents with and without projectId', async () => {
      const docs: IndexSamples[] = [
        {
          integrationId: 'integration-1',
          dataStreamId: 'data-stream-1',
          projectId: 'project-1',
          logData: 'Log with project',
          createdBy: 'user-1',
          createdAt: '2024-01-01T00:00:00Z',
          originalFilename: 'file1.txt',
        },
        {
          integrationId: 'integration-2',
          dataStreamId: 'data-stream-2',
          logData: 'Log without project',
          createdBy: 'user-2',
          createdAt: '2024-01-02T00:00:00Z',
          originalFilename: 'file2.txt',
        },
      ];

      await service.createSamplesDocs(mockRequest, docs);

      const { createIndexAdapter } = jest.requireMock('./storage');
      const adapterInstance = createIndexAdapter.mock.results[0].value;
      const bulkClient = adapterInstance.getClient();

      const callArgs = bulkClient.bulk.mock.calls[0][0];
      expect(callArgs.operations[0].index.document).toHaveProperty('project_id', 'project-1');
      expect(callArgs.operations[1].index.document).not.toHaveProperty('project_id');
    });

    it('should throw error when samplesIndexAdapter is not initialized', async () => {
      const uninitializedService = new AutomaticImportSamplesIndexService(
        mockLoggerFactory,
        new Promise(() => {}), // Never resolves
        Promise.resolve(mockSecurity)
      );

      const docs: IndexSamples[] = [
        {
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
          logData: 'Sample log',
          createdBy: 'user-1',
          createdAt: '2024-01-01T00:00:00Z',
          originalFilename: 'logs.txt',
        },
      ];

      await expect(uninitializedService.createSamplesDocs(mockRequest, docs)).rejects.toThrow(
        'Samples index adapter not initialized'
      );
    });
  });

  describe('constructor', () => {
    it('should initialize with logger factory, ES client promise, and security promise', () => {
      const { createIndexAdapter } = jest.requireMock('./storage');

      expect(createIndexAdapter).toHaveBeenCalled();
      expect(mockLoggerFactory.get).toHaveBeenCalledWith('samplesIndexService');
    });
  });
});
