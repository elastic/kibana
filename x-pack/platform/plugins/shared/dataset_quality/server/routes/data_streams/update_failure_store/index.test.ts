/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { updateFailureStore } from '.';

describe('updateFailureStore', () => {
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('success scenarios', () => {
    it('should enable failure store with custom retention period in non-serverless', async () => {
      const mockResponse = { acknowledged: true };
      mockEsClient.indices.putDataStreamOptions.mockResolvedValue(mockResponse);

      await updateFailureStore({
        esClient: mockEsClient,
        dataStream: 'logs-test-default',
        failureStoreEnabled: true,
        customRetentionPeriod: '30d',
        isServerless: false,
      });

      expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
        {
          name: 'logs-test-default',
          failure_store: {
            enabled: true,
            lifecycle: {
              data_retention: '30d',
              enabled: true,
            },
          },
        },
        { meta: true }
      );
    });

    it('should enable failure store with custom retention period in serverless', async () => {
      const mockResponse = { acknowledged: true };
      mockEsClient.indices.putDataStreamOptions.mockResolvedValue(mockResponse);

      await updateFailureStore({
        esClient: mockEsClient,
        dataStream: 'logs-test-default',
        failureStoreEnabled: true,
        customRetentionPeriod: '30d',
        isServerless: true,
      });

      expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
        {
          name: 'logs-test-default',
          failure_store: {
            enabled: true,
            lifecycle: {
              data_retention: '30d',
            },
          },
        },
        { meta: true }
      );
    });

    it('should disable failure store in non-serverless', async () => {
      const mockResponse = { acknowledged: true };
      mockEsClient.indices.putDataStreamOptions.mockResolvedValue(mockResponse);

      await updateFailureStore({
        esClient: mockEsClient,
        dataStream: 'logs-test-default',
        failureStoreEnabled: false,
        customRetentionPeriod: undefined,
        isServerless: false,
      });

      expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
        {
          name: 'logs-test-default',
          failure_store: {
            enabled: false,
            lifecycle: {
              data_retention: undefined,
              enabled: false,
            },
          },
        },
        { meta: true }
      );
    });

    it('should disable failure store in serverless', async () => {
      const mockResponse = { acknowledged: true };
      mockEsClient.indices.putDataStreamOptions.mockResolvedValue(mockResponse);

      await updateFailureStore({
        esClient: mockEsClient,
        dataStream: 'metrics-system-default',
        failureStoreEnabled: false,
        customRetentionPeriod: undefined,
        isServerless: true,
      });

      expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
        {
          name: 'metrics-system-default',
          failure_store: {
            enabled: false,
            lifecycle: {
              data_retention: undefined,
            },
          },
        },
        { meta: true }
      );
    });

    it('should enable failure store without custom retention period', async () => {
      const mockResponse = { acknowledged: true };
      mockEsClient.indices.putDataStreamOptions.mockResolvedValue(mockResponse);

      await updateFailureStore({
        esClient: mockEsClient,
        dataStream: 'logs-test-default',
        failureStoreEnabled: true,
        customRetentionPeriod: undefined,
        isServerless: false,
      });

      expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
        {
          name: 'logs-test-default',
          failure_store: {
            enabled: true,
            lifecycle: {
              data_retention: undefined,
              enabled: true,
            },
          },
        },
        { meta: true }
      );
    });

    it('should include enabled field in lifecycle for non-serverless when enabling', async () => {
      const mockResponse = { acknowledged: true };
      mockEsClient.indices.putDataStreamOptions.mockResolvedValue(mockResponse);

      await updateFailureStore({
        esClient: mockEsClient,
        dataStream: 'logs-test-default',
        failureStoreEnabled: true,
        customRetentionPeriod: '30d',
        isServerless: false,
      });

      expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
        {
          name: 'logs-test-default',
          failure_store: {
            enabled: true,
            lifecycle: {
              data_retention: '30d',
              enabled: true,
            },
          },
        },
        { meta: true }
      );
    });

    it('should include enabled field in lifecycle for non-serverless when disabling', async () => {
      const mockResponse = { acknowledged: true };
      mockEsClient.indices.putDataStreamOptions.mockResolvedValue(mockResponse);

      await updateFailureStore({
        esClient: mockEsClient,
        dataStream: 'logs-test-default',
        failureStoreEnabled: false,
        customRetentionPeriod: '30d',
        isServerless: false,
      });

      expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
        {
          name: 'logs-test-default',
          failure_store: {
            enabled: false,
            lifecycle: {
              data_retention: '30d',
              enabled: false,
            },
          },
        },
        { meta: true }
      );
    });

    it('should not include enabled field in lifecycle for serverless', async () => {
      const mockResponse = { acknowledged: true };
      mockEsClient.indices.putDataStreamOptions.mockResolvedValue(mockResponse);

      await updateFailureStore({
        esClient: mockEsClient,
        dataStream: 'logs-test-default',
        failureStoreEnabled: true,
        customRetentionPeriod: '30d',
        isServerless: true,
      });

      expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
        {
          name: 'logs-test-default',
          failure_store: {
            enabled: true,
            lifecycle: {
              data_retention: '30d',
            },
          },
        },
        { meta: true }
      );
    });
  });

  describe('error handling', () => {
    it('should throw badRequest error when elasticsearch client throws an error', async () => {
      const elasticsearchError = new Error('Mocked ES error');
      mockEsClient.indices.putDataStreamOptions.mockRejectedValue(elasticsearchError);

      await expect(
        updateFailureStore({
          esClient: mockEsClient,
          dataStream: 'logs-test-default',
          failureStoreEnabled: true,
          customRetentionPeriod: '30d',
          isServerless: false,
        })
      ).rejects.toThrow(
        'Failed to update failure store for data stream "logs-test-default": Error: Mocked ES error'
      );
    });
  });
});
