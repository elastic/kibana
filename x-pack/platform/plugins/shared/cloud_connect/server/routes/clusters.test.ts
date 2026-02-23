/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerClustersRoute } from './clusters';
import { CloudConnectClient } from '../services/cloud_connect_client';
import type { CloudConnectApiKey } from '../types';

jest.mock('../services/cloud_connect_client');
jest.mock('../lib/create_storage_service');
jest.mock('../services/inference_ccm');

describe('Clusters Routes', () => {
  let mockRouter: jest.Mocked<IRouter>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockStorageService: {
    getApiKey: jest.MockedFunction<() => Promise<CloudConnectApiKey | undefined>>;
    saveApiKey: jest.MockedFunction<(apiKey: string, clusterId: string) => Promise<void>>;
    deleteApiKey: jest.MockedFunction<() => Promise<void>>;
  };
  let mockCloudConnectInstance: jest.Mocked<CloudConnectClient>;
  let mockContext: any;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = loggingSystemMock.createLogger();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

    mockStorageService = {
      getApiKey: jest.fn(),
      saveApiKey: jest.fn(),
      deleteApiKey: jest.fn(),
    };

    mockCloudConnectInstance = {
      validateApiKeyScope: jest.fn(),
      getClusterDetails: jest.fn(),
      onboardCluster: jest.fn(),
      onboardClusterWithKeyGeneration: jest.fn(),
      updateCluster: jest.fn(),
      deleteCluster: jest.fn(),
      getOrganizationSubscription: jest.fn(),
    } as any;

    // Mock the CloudConnectClient constructor to return our mock instance
    (CloudConnectClient as jest.MockedClass<typeof CloudConnectClient>).mockImplementation(
      () => mockCloudConnectInstance
    );

    mockRouter = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockContext = {
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: mockEsClient,
          },
        },
        savedObjects: {
          getClient: jest.fn(),
        },
      }),
    };

    mockResponse = {
      ok: jest.fn((params) => params),
      badRequest: jest.fn((params) => params),
      unauthorized: jest.fn((params) => params),
      forbidden: jest.fn((params) => params),
      notFound: jest.fn((params) => params),
      customError: jest.fn((params) => params),
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createStorageService } = require('../lib/create_storage_service');
    createStorageService.mockResolvedValue(mockStorageService);
  });

  describe('GET /internal/cloud_connect/cluster_details', () => {
    let routeHandler: Function;

    beforeEach(() => {
      const mockGetStartServices = jest.fn();

      registerClustersRoute({
        router: mockRouter,
        logger: mockLogger,
        getStartServices: mockGetStartServices,
        hasEncryptedSOEnabled: true,
        cloudApiUrl: 'https://cloud.elastic.co',
      });

      // Extract the route handler for GET /cluster_details
      const getCall = mockRouter.get.mock.calls.find(
        (call) => call[0].path === '/internal/cloud_connect/cluster_details'
      );
      routeHandler = getCall![1];
    });

    it('should return cluster details with subscription state on happy path', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const mockClusterDetails = {
        id: 'cluster-uuid-456',
        name: 'my-cluster',
        metadata: {
          created_at: '2024-01-01',
          created_by: 'user@example.com',
          organization_id: 'org-123',
        },
        self_managed_cluster: {
          id: 'es-cluster-uuid',
          name: 'my-cluster',
          version: '8.15.0',
        },
        license: {
          type: 'platinum',
          uid: 'license-uid',
        },
        services: {
          eis: { enabled: false, supported: true },
        },
      };

      const mockSubscription = {
        state: 'active',
      };

      mockCloudConnectInstance.getClusterDetails.mockResolvedValue(mockClusterDetails);
      mockCloudConnectInstance.getOrganizationSubscription.mockResolvedValue(mockSubscription);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockStorageService.getApiKey).toHaveBeenCalled();
      expect(mockCloudConnectInstance.getClusterDetails).toHaveBeenCalledWith(
        'test-api-key-123',
        'cluster-uuid-456'
      );
      expect(mockCloudConnectInstance.getOrganizationSubscription).toHaveBeenCalledWith(
        'test-api-key-123',
        'org-123'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          ...mockClusterDetails,
          metadata: {
            ...mockClusterDetails.metadata,
            subscription: 'active',
          },
        },
      });
    });

    it('should return 503 when no API key found in storage', async () => {
      mockStorageService.getApiKey.mockResolvedValue(undefined);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: {
          message: 'Failed to retrieve API key from saved object',
        },
      });
    });

    it('should return 500 for invalid/expired API key', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'expired-key',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      mockCloudConnectInstance.getClusterDetails.mockRejectedValue(axiosError);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Unauthorized' },
      });
    });

    it('should return 403 for insufficient permissions', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'valid-key',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };

      mockCloudConnectInstance.getClusterDetails.mockRejectedValue(axiosError);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: { message: 'Forbidden' },
      });
    });

    it('should return 404 when cluster not found', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'valid-key',
        clusterId: 'non-existent-cluster',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      };

      mockCloudConnectInstance.getClusterDetails.mockRejectedValue(axiosError);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 404,
        body: { message: 'Not found' },
      });
    });

    it('should return 400 for bad request errors', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'valid-key',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Bad request' },
        },
      };

      mockCloudConnectInstance.getClusterDetails.mockRejectedValue(axiosError);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: { message: 'Bad request' },
      });
    });

    it('should return 429 for rate limit errors', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'valid-key',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 429,
          data: {
            errors: [
              {
                code: 'clusters.get_cluster.rate_limit_exceeded',
                message: 'User-rate limit exceeded',
              },
            ],
          },
        },
      };

      mockCloudConnectInstance.getClusterDetails.mockRejectedValue(axiosError);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 429,
        body: { message: 'User-rate limit exceeded' },
      });
    });

    it('should extract error message from errors array in API response', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'valid-key',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            errors: [
              {
                code: 'clusters.get_cluster.forbidden',
                message: 'request is not authorized',
              },
            ],
          },
        },
      };

      mockCloudConnectInstance.getClusterDetails.mockRejectedValue(axiosError);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: { message: 'request is not authorized' },
      });
    });

    it('should return cluster details without subscription when subscription fetch fails', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const mockClusterDetails = {
        id: 'cluster-uuid-456',
        name: 'my-cluster',
        metadata: {
          created_at: '2024-01-01',
          created_by: 'user@example.com',
          organization_id: 'org-123',
        },
        self_managed_cluster: {
          id: 'es-cluster-uuid',
          name: 'my-cluster',
          version: '8.15.0',
        },
        license: {
          type: 'platinum',
          uid: 'license-uid',
        },
        services: {
          eis: { enabled: false, supported: true },
        },
      };

      mockCloudConnectInstance.getClusterDetails.mockResolvedValue(mockClusterDetails);
      mockCloudConnectInstance.getOrganizationSubscription.mockRejectedValue(
        new Error('Subscription API unavailable')
      );

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.getClusterDetails).toHaveBeenCalledWith(
        'test-api-key-123',
        'cluster-uuid-456'
      );
      expect(mockCloudConnectInstance.getOrganizationSubscription).toHaveBeenCalledWith(
        'test-api-key-123',
        'org-123'
      );
      // Should return cluster details without subscription field
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: mockClusterDetails,
      });
    });

    it('should return 500 for general errors', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'valid-key',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const testError = new Error('Unexpected error');
      mockCloudConnectInstance.getClusterDetails.mockRejectedValue(testError);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: testError },
      });
    });
  });

  describe('DELETE /internal/cloud_connect/cluster', () => {
    let routeHandler: Function;

    beforeEach(() => {
      const mockGetStartServices = jest.fn();

      registerClustersRoute({
        router: mockRouter,
        logger: mockLogger,
        getStartServices: mockGetStartServices,
        hasEncryptedSOEnabled: true,
        cloudApiUrl: 'https://cloud.elastic.co',
      });

      // Extract the route handler for DELETE /cluster
      const deleteCall = mockRouter.delete.mock.calls.find(
        (call) => call[0].path === '/internal/cloud_connect/cluster'
      );
      routeHandler = deleteCall![1];
    });

    it('should disconnect cluster on happy path', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      mockCloudConnectInstance.deleteCluster.mockResolvedValue(undefined);
      mockStorageService.deleteApiKey.mockResolvedValue(undefined);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.deleteCluster).toHaveBeenCalledWith(
        'test-api-key-123',
        'cluster-uuid-456'
      );
      expect(mockStorageService.deleteApiKey).toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          message: 'Cluster disconnected successfully',
        },
      });
    });

    it('should return 503 when no API key found', async () => {
      mockStorageService.getApiKey.mockResolvedValue(undefined);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.deleteCluster).not.toHaveBeenCalled();
      expect(mockStorageService.deleteApiKey).not.toHaveBeenCalled();
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: {
          message: 'Failed to retrieve API key from saved object',
        },
      });
    });

    it('should return error when Cloud API deletion fails', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };

      mockCloudConnectInstance.deleteCluster.mockRejectedValue(axiosError);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.deleteCluster).toHaveBeenCalled();
      expect(mockStorageService.deleteApiKey).not.toHaveBeenCalled();
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Internal server error' },
      });
    });

    it('should return 500 for general errors', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const testError = new Error('Unexpected error');
      mockCloudConnectInstance.deleteCluster.mockRejectedValue(testError);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'An error occurred while disconnecting the cluster' },
      });
    });
  });

  describe('PUT /internal/cloud_connect/cluster_details', () => {
    let routeHandler: Function;

    beforeEach(() => {
      const mockGetStartServices = jest.fn();

      registerClustersRoute({
        router: mockRouter,
        logger: mockLogger,
        getStartServices: mockGetStartServices,
        hasEncryptedSOEnabled: true,
        cloudApiUrl: 'https://cloud.elastic.co',
      });

      // Extract the route handler for PUT /cluster_details
      const putCall = mockRouter.put.mock.calls.find(
        (call) => call[0].path === '/internal/cloud_connect/cluster_details'
      );
      routeHandler = putCall![1];
    });

    it('should update services on happy path', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const mockUpdatedCluster = {
        id: 'cluster-uuid-456',
        name: 'my-cluster',
        metadata: {
          created_at: '2024-01-01',
          created_by: 'user@example.com',
          organization_id: 'org-123',
        },
        self_managed_cluster: {
          id: 'es-cluster-uuid',
          name: 'my-cluster',
          version: '8.15.0',
        },
        license: {
          type: 'platinum',
          uid: 'license-uid',
        },
        services: {
          auto_ops: { enabled: true, supported: true },
        },
      };

      mockCloudConnectInstance.updateCluster.mockResolvedValue(mockUpdatedCluster);

      mockRequest = {
        body: {
          services: {
            auto_ops: { enabled: true },
          },
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.updateCluster).toHaveBeenCalledWith(
        'test-api-key-123',
        'cluster-uuid-456',
        {
          services: {
            auto_ops: { enabled: true },
          },
        }
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
        },
      });
    });

    it('should enable EIS and configure inference on happy path', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { enableInferenceCCM } = require('../services/inference_ccm');

      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const mockUpdatedCluster = {
        id: 'cluster-uuid-456',
        name: 'my-cluster',
        metadata: {
          created_at: '2024-01-01',
          created_by: 'user@example.com',
          organization_id: 'org-123',
        },
        self_managed_cluster: {
          id: 'es-cluster-uuid',
          name: 'my-cluster',
          version: '8.15.0',
        },
        license: {
          type: 'platinum',
          uid: 'license-uid',
        },
        services: {
          eis: {
            enabled: true,
            supported: true,
          },
        },
        keys: {
          eis: 'eis-inference-key-789',
        },
      };

      mockCloudConnectInstance.updateCluster.mockResolvedValue(mockUpdatedCluster);
      enableInferenceCCM.mockResolvedValue(undefined);

      mockRequest = {
        body: {
          services: {
            eis: { enabled: true },
          },
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.updateCluster).toHaveBeenCalled();
      expect(enableInferenceCCM).toHaveBeenCalledWith(
        mockEsClient,
        'eis-inference-key-789',
        mockLogger
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
        },
      });
    });

    it('should return 503 when no API key found', async () => {
      mockStorageService.getApiKey.mockResolvedValue(undefined);

      mockRequest = {
        body: {
          services: {
            eis: { enabled: true },
          },
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: {
          message: 'Failed to retrieve API key from saved object',
        },
      });
    });

    it('should rollback when EIS enabled but no key returned', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      // First call: enable EIS but no key in response
      const mockBadResponse = {
        id: 'cluster-uuid-456',
        name: 'my-cluster',
        metadata: {
          created_at: '2024-01-01',
          created_by: 'user@example.com',
          organization_id: 'org-123',
        },
        self_managed_cluster: {
          id: 'es-cluster-uuid',
          name: 'my-cluster',
          version: '8.15.0',
        },
        license: {
          type: 'platinum',
          uid: 'license-uid',
        },
        services: {
          eis: {
            enabled: true,
            supported: true,
            // No api_key in metadata!
          },
        },
      };

      mockCloudConnectInstance.updateCluster
        .mockResolvedValueOnce(mockBadResponse)
        .mockResolvedValueOnce({} as any); // Rollback call

      mockRequest = {
        body: {
          services: {
            eis: { enabled: true },
          },
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.updateCluster).toHaveBeenCalledTimes(2);
      expect(mockCloudConnectInstance.updateCluster).toHaveBeenNthCalledWith(
        2,
        'test-api-key-123',
        'cluster-uuid-456',
        { services: { eis: { enabled: false } } }
      );
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'EIS was enabled but Cloud API did not return an API key' },
      });
    });

    it('should rollback when inference configuration fails', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { enableInferenceCCM } = require('../services/inference_ccm');

      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const mockUpdatedCluster = {
        id: 'cluster-uuid-456',
        name: 'my-cluster',
        metadata: {
          created_at: '2024-01-01',
          created_by: 'user@example.com',
          organization_id: 'org-123',
        },
        self_managed_cluster: {
          id: 'es-cluster-uuid',
          name: 'my-cluster',
          version: '8.15.0',
        },
        license: {
          type: 'platinum',
          uid: 'license-uid',
        },
        services: {
          eis: {
            enabled: true,
            supported: true,
          },
        },
        keys: {
          eis: 'eis-inference-key-789',
        },
      };

      mockCloudConnectInstance.updateCluster
        .mockResolvedValueOnce(mockUpdatedCluster)
        .mockResolvedValueOnce({} as any); // Rollback call

      enableInferenceCCM.mockRejectedValue(new Error('ES inference configuration failed'));

      mockRequest = {
        body: {
          services: {
            eis: { enabled: true },
          },
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.updateCluster).toHaveBeenCalledTimes(2);
      expect(mockCloudConnectInstance.updateCluster).toHaveBeenNthCalledWith(
        2,
        'test-api-key-123',
        'cluster-uuid-456',
        { services: { eis: { enabled: false } } }
      );
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'ES inference configuration failed' },
      });
    });

    it('should return dual error when both inference and rollback fail', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { enableInferenceCCM } = require('../services/inference_ccm');

      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const mockUpdatedCluster = {
        id: 'cluster-uuid-456',
        name: 'my-cluster',
        metadata: {
          created_at: '2024-01-01',
          created_by: 'user@example.com',
          organization_id: 'org-123',
        },
        self_managed_cluster: {
          id: 'es-cluster-uuid',
          name: 'my-cluster',
          version: '8.15.0',
        },
        license: {
          type: 'platinum',
          uid: 'license-uid',
        },
        services: {
          eis: {
            enabled: true,
            supported: true,
          },
        },
        keys: {
          eis: 'eis-inference-key-789',
        },
      };

      mockCloudConnectInstance.updateCluster
        .mockResolvedValueOnce(mockUpdatedCluster)
        .mockRejectedValueOnce(new Error('Rollback failed'));

      enableInferenceCCM.mockRejectedValue(new Error('Inference failed'));

      mockRequest = {
        body: {
          services: {
            eis: { enabled: true },
          },
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to update Cloud Connect inference settings and rollback also failed',
          attributes: {
            inferenceError: 'Inference failed',
            rollbackError: 'Rollback failed',
          },
        },
      });
    });

    it('should return 500 for axios errors', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Invalid service configuration' },
        },
      };

      mockCloudConnectInstance.updateCluster.mockRejectedValue(axiosError);

      mockRequest = {
        body: {
          services: {
            invalid_service: { enabled: true },
          },
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Invalid service configuration' },
      });
    });

    it('should return 500 for general errors', async () => {
      mockStorageService.getApiKey.mockResolvedValue({
        apiKey: 'test-api-key-123',
        clusterId: 'cluster-uuid-456',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      mockCloudConnectInstance.updateCluster.mockRejectedValue(new Error('Unexpected error'));

      mockRequest = {
        body: {
          services: {
            eis: { enabled: true },
          },
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'An error occurred while updating cluster services' },
      });
    });
  });
});
