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
import { CLOUD_CONNECT_READ_SECURITY, CLOUD_CONNECT_MANAGE_SECURITY } from './route_security';

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

    it('should require the cloudConnect read privilege', () => {
      const getCall = mockRouter.get.mock.calls.find(
        (call) => call[0].path === '/internal/cloud_connect/config'
      );
      expect(getCall![0].security).toEqual(CLOUD_CONNECT_READ_SECURITY);
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

    it('should require the cloudConnect manage privilege', () => {
      const postCall = mockRouter.post.mock.calls.find(
        (call) => call[0].path === '/internal/cloud_connect/authenticate'
      );
      expect(postCall![0].security).toEqual(CLOUD_CONNECT_MANAGE_SECURITY);
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
        body: {
          message:
            'The API key was rejected by https://cloud.elastic.co (HTTP 401). Check that the key is valid and not expired. If it is, a proxy between Kibana and Elastic Cloud may be intercepting the request.',
        },
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

    it('should return 502 with CLOUD_API_UNREACHABLE when validation cannot reach the Cloud API', async () => {
      mockCloudConnectInstance.validateApiKeyScope.mockResolvedValue({
        isClusterScoped: false,
        hasValidScope: false,
        errorCode: 'CLOUD_API_UNREACHABLE',
        errorMessage: "Kibana couldn't reach https://cloud.elastic.co/api/v1/saas/user.",
      });

      mockRequest = { body: { apiKey: 'some-key' } };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 502,
        body: {
          message: "Kibana couldn't reach https://cloud.elastic.co/api/v1/saas/user.",
          attributes: { code: 'CLOUD_API_UNREACHABLE' },
        },
      });
    });

    it('should return 502 with CLOUD_API_UNREACHABLE when onboarding hits a network error', async () => {
      mockCloudConnectInstance.validateApiKeyScope.mockResolvedValue({
        isClusterScoped: false,
        hasValidScope: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getCurrentClusterData } = require('../lib/cluster_info');
      getCurrentClusterData.mockResolvedValue({});
      mockCloudConnectInstance.onboardClusterWithKeyGeneration.mockRejectedValue({
        isAxiosError: true,
        code: 'ECONNRESET',
        message: 'Client network socket disconnected before secure TLS connection was established',
        request: {},
        config: {
          baseURL: 'https://cloud.elastic.co/api/v1',
          url: '/cloud-connected/clusters?create_api_key=true',
        },
      });

      mockRequest = { body: { apiKey: 'some-key' } };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 502,
        body: {
          message:
            "Kibana couldn't reach https://cloud.elastic.co/api/v1/cloud-connected/clusters?create_api_key=true. Check that outbound HTTPS from the Kibana server to Elastic Cloud isn't blocked by a firewall or proxy.",
          attributes: { code: 'CLOUD_API_UNREACHABLE' },
        },
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('ECONNRESET: Client network socket disconnected'),
        expect.anything()
      );
    });

    it('should return 502 with CLOUD_API_UNREACHABLE when a proxy asks for authentication', async () => {
      mockCloudConnectInstance.validateApiKeyScope.mockResolvedValue({
        isClusterScoped: true,
        hasValidScope: true,
        clusterId: 'cluster-123',
      });
      mockCloudConnectInstance.getClusterDetails.mockRejectedValue({
        isAxiosError: true,
        message: 'Request failed with status code 407',
        request: {},
        response: { status: 407 },
        config: {
          baseURL: 'https://cloud.elastic.co/api/v1',
          url: '/cloud-connected/clusters/cluster-123',
        },
      });

      mockRequest = { body: { apiKey: 'some-key' } };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 502,
        body: {
          message:
            'A proxy between Kibana and Elastic Cloud rejected the request to https://cloud.elastic.co/api/v1/cloud-connected/clusters/cluster-123 (HTTP 407 Proxy Authentication Required). Check the proxy credentials configured for the Kibana server.',
          attributes: { code: 'CLOUD_API_UNREACHABLE' },
        },
      });
    });

    it('should not report request setup errors as unreachable', async () => {
      // validateApiKeyScope never rejects, so exercise the route's catch block through a
      // later Cloud API call instead
      mockCloudConnectInstance.validateApiKeyScope.mockResolvedValue({
        isClusterScoped: true,
        hasValidScope: true,
        clusterId: 'cluster-123',
      });
      mockCloudConnectInstance.getClusterDetails.mockRejectedValue({
        isAxiosError: true,
        code: 'ERR_BAD_REQUEST',
        message: 'Unsupported protocol ftp:',
      });

      mockRequest = { body: { apiKey: 'some-key' } };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'An error occurred while authenticating with Cloud Connect' },
      });
    });

    it('should return 502 with CLOUD_API_UNREACHABLE when a gateway returns 504', async () => {
      mockCloudConnectInstance.validateApiKeyScope.mockResolvedValue({
        isClusterScoped: false,
        hasValidScope: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getCurrentClusterData } = require('../lib/cluster_info');
      getCurrentClusterData.mockResolvedValue({});
      mockCloudConnectInstance.onboardClusterWithKeyGeneration.mockRejectedValue({
        isAxiosError: true,
        message: 'Request failed with status code 504',
        request: {},
        response: { status: 504 },
        config: {
          baseURL: 'https://cloud.elastic.co/api/v1',
          url: '/cloud-connected/clusters?create_api_key=true',
        },
      });

      mockRequest = { body: { apiKey: 'some-key' } };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 502,
        body: {
          message:
            'https://cloud.elastic.co/api/v1/cloud-connected/clusters?create_api_key=true returned HTTP 504. Elastic Cloud or a proxy between Kibana and Elastic Cloud may be unavailable. Try again later, and check the proxy if it keeps happening.',
          attributes: { code: 'CLOUD_API_UNREACHABLE' },
        },
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
