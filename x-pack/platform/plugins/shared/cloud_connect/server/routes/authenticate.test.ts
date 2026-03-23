/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerAuthenticateRoute } from './authenticate';
import { CloudConnectClient } from '../services/cloud_connect_client';
import type { CloudConnectApiKey } from '../types';

jest.mock('../services/cloud_connect_client');
jest.mock('../lib/create_storage_service');
jest.mock('../lib/cluster_info');

describe('Authentication Routes', () => {
  let mockRouter: jest.Mocked<IRouter>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockStorageService: {
    getApiKey: jest.MockedFunction<() => Promise<CloudConnectApiKey | undefined>>;
    saveApiKey: jest.MockedFunction<(apiKey: string, clusterId: string) => Promise<void>>;
    deleteApiKey: jest.MockedFunction<() => Promise<void>>;
  };
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

  describe('GET /internal/cloud_connect/config', () => {
    let routeHandler: Function;

    beforeEach(() => {
      const mockGetStartServices = jest.fn();
      const hasEncryptedSOEnabled = true;

      registerAuthenticateRoute({
        router: mockRouter,
        logger: mockLogger,
        getStartServices: mockGetStartServices,
        hasEncryptedSOEnabled,
        cloudApiUrl: 'https://cloud.elastic.co',
      });

      // Extract the route handler for GET /config
      const getCall = mockRouter.get.mock.calls.find(
        (call) => call[0].path === '/internal/cloud_connect/config'
      );
      routeHandler = getCall![1];
    });

    it('should return config with license and cluster info on happy path', async () => {
      mockEsClient.license.get.mockResolvedValue({
        license: {
          type: 'platinum',
          uid: 'license-uid-123',
        },
      } as any);

      mockEsClient.info.mockResolvedValue({
        cluster_uuid: 'cluster-uuid-456',
        cluster_name: 'my-cluster',
        version: {
          number: '8.15.0',
        },
      } as any);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          hasEncryptedSOEnabled: true,
          license: {
            type: 'platinum',
            uid: 'license-uid-123',
          },
          cluster: {
            id: 'cluster-uuid-456',
            name: 'my-cluster',
            version: '8.15.0',
          },
        },
      });
    });

    it('should return partial response when ES calls fail', async () => {
      mockEsClient.license.get.mockRejectedValue(new Error('ES connection failed'));

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch cluster and license information',
        expect.any(Object)
      );

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          hasEncryptedSOEnabled: true,
        },
      });
    });
  });

  describe('POST /internal/cloud_connect/authenticate', () => {
    let routeHandler: Function;
    let mockCloudConnectInstance: jest.Mocked<CloudConnectClient>;

    beforeEach(() => {
      mockCloudConnectInstance = {
        validateApiKeyScope: jest.fn(),
        getClusterDetails: jest.fn(),
        onboardCluster: jest.fn(),
        onboardClusterWithKeyGeneration: jest.fn(),
        updateCluster: jest.fn(),
        deleteCluster: jest.fn(),
      } as any;

      // Mock the CloudConnectClient constructor to return our mock instance
      (CloudConnectClient as jest.MockedClass<typeof CloudConnectClient>).mockImplementation(
        () => mockCloudConnectInstance
      );

      const mockGetStartServices = jest.fn();
      const hasEncryptedSOEnabled = true;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createStorageService } = require('../lib/create_storage_service');
      createStorageService.mockResolvedValue(mockStorageService);

      registerAuthenticateRoute({
        router: mockRouter,
        logger: mockLogger,
        getStartServices: mockGetStartServices,
        hasEncryptedSOEnabled,
        cloudApiUrl: 'https://cloud.elastic.co',
      });

      // Extract the route handler for POST /authenticate
      const postCall = mockRouter.post.mock.calls.find(
        (call) => call[0].path === '/internal/cloud_connect/authenticate'
      );
      routeHandler = postCall![1];
    });

    it('should authenticate with cluster-scoped key (happy path)', async () => {
      mockCloudConnectInstance.validateApiKeyScope.mockResolvedValue({
        isClusterScoped: true,
        hasValidScope: true,
        clusterId: 'cluster-uuid-456',
      });

      mockCloudConnectInstance.getClusterDetails.mockResolvedValue({
        id: 'cluster-uuid-456',
        name: 'my-cluster',
        metadata: {
          organization_id: 'org-123',
          created_at: '2024-01-01',
          created_by: 'user@example.com',
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
      });

      mockCloudConnectInstance.onboardCluster.mockResolvedValue({
        id: 'cluster-uuid-456',
        name: 'my-cluster',
        metadata: {
          organization_id: 'org-123',
          created_at: '2024-01-01',
          created_by: 'user@example.com',
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
      });

      mockRequest = {
        body: {
          apiKey: 'test-api-key-123',
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.validateApiKeyScope).toHaveBeenCalledWith('test-api-key-123');
      expect(mockCloudConnectInstance.getClusterDetails).toHaveBeenCalledWith(
        'test-api-key-123',
        'cluster-uuid-456'
      );
      expect(mockStorageService.saveApiKey).toHaveBeenCalledWith(
        'test-api-key-123',
        'cluster-uuid-456'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          cluster_id: 'cluster-uuid-456',
          organization_id: 'org-123',
          message: 'Cluster authenticated and onboarded successfully',
        },
      });
    });

    it('should authenticate with admin key and generate cluster-scoped key', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getCurrentClusterData } = require('../lib/cluster_info');

      mockCloudConnectInstance.validateApiKeyScope.mockResolvedValue({
        isClusterScoped: false,
        hasValidScope: true,
      });

      getCurrentClusterData.mockResolvedValue({
        id: 'es-cluster-uuid',
        name: 'my-cluster',
        version: '8.15.0',
        license: {
          type: 'platinum',
          uid: 'license-uid',
        },
      });

      mockCloudConnectInstance.onboardClusterWithKeyGeneration.mockResolvedValue({
        id: 'cluster-uuid-456',
        name: 'my-cluster',
        metadata: {
          organization_id: 'org-123',
          created_at: '2024-01-01',
          created_by: 'user@example.com',
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
        key: 'generated-api-key-789',
      });

      mockRequest = {
        body: {
          apiKey: 'admin-api-key',
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.onboardClusterWithKeyGeneration).toHaveBeenCalled();
      expect(mockStorageService.saveApiKey).toHaveBeenCalledWith(
        'generated-api-key-789',
        'cluster-uuid-456'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          cluster_id: 'cluster-uuid-456',
          organization_id: 'org-123',
          message: 'Cluster authenticated and onboarded successfully',
        },
      });
    });

    it('should return 400 for invalid API key scope', async () => {
      mockCloudConnectInstance.validateApiKeyScope.mockResolvedValue({
        isClusterScoped: false,
        hasValidScope: false,
      });

      mockRequest = {
        body: {
          apiKey: 'invalid-scope-key',
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Invalid API key',
        },
      });
    });

    it('should return 401 for invalid/expired API key', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      mockCloudConnectInstance.validateApiKeyScope.mockRejectedValue(axiosError);

      mockRequest = {
        body: {
          apiKey: 'expired-key',
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.unauthorized).toHaveBeenCalledWith({
        body: { message: 'Invalid or expired API key' },
      });
    });

    it('should return 403 when terms and conditions not accepted', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };

      mockCloudConnectInstance.validateApiKeyScope.mockRejectedValue(axiosError);

      mockRequest = {
        body: {
          apiKey: 'valid-key',
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.forbidden).toHaveBeenCalledWith({
        body: {
          message:
            'Terms and Conditions not accepted or no cloud organization found. Please complete the setup in Elastic Cloud.',
        },
      });
    });

    it('should return 400 for bad request errors', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Bad request' },
        },
      };

      mockCloudConnectInstance.validateApiKeyScope.mockRejectedValue(axiosError);

      mockRequest = {
        body: {
          apiKey: 'some-key',
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: { message: 'Bad request' },
      });
    });

    it('should return 500 for general errors', async () => {
      mockCloudConnectInstance.validateApiKeyScope.mockRejectedValue(new Error('Unexpected error'));

      mockRequest = {
        body: {
          apiKey: 'some-key',
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'An error occurred while authenticating with Cloud Connect' },
      });
    });
  });
});
