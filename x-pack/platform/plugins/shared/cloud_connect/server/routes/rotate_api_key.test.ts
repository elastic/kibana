/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerRotateApiKeyRoute } from './rotate_api_key';
import { CloudConnectClient } from '../services/cloud_connect_client';

jest.mock('../services/cloud_connect_client');
jest.mock('../lib/create_storage_service');
jest.mock('../services/inference_ccm');

describe('Rotate API Key Routes', () => {
  let mockRouter: jest.Mocked<IRouter>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockStorageService: {
    getApiKey: jest.MockedFunction<() => Promise<any>>;
    saveApiKey: jest.MockedFunction<(apiKey: string, clusterId: string) => Promise<void>>;
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
    };

    mockCloudConnectInstance = {
      rotateClusterApiKey: jest.fn(),
      rotateServiceApiKey: jest.fn(),
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
      customError: jest.fn((params) => params),
    };
  });

  describe('POST /internal/cloud_connect/cluster/rotate_api_key', () => {
    let routeHandler: Function;

    beforeEach(() => {
      const mockGetStartServices = jest.fn();

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getApiKeyData } = require('../lib/create_storage_service');
      getApiKeyData.mockResolvedValue({
        apiKeyData: {
          apiKey: 'test-api-key-123',
          clusterId: 'cluster-uuid-456',
        },
        storageService: mockStorageService,
      });

      registerRotateApiKeyRoute({
        router: mockRouter,
        logger: mockLogger,
        getStartServices: mockGetStartServices,
        cloudApiUrl: 'https://cloud.elastic.co',
      });

      // Extract the route handler for POST /cluster/rotate_api_key
      const postCalls = mockRouter.post.mock.calls;
      const rotateCall = postCalls.find(
        (call) => call[0].path === '/internal/cloud_connect/cluster/rotate_api_key'
      );
      routeHandler = rotateCall![1];
    });

    it('should rotate cluster API key and save new key', async () => {
      mockCloudConnectInstance.rotateClusterApiKey.mockResolvedValue({
        key: 'new-rotated-api-key-789',
      });
      mockStorageService.saveApiKey.mockResolvedValue(undefined);

      mockRequest = {};

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.rotateClusterApiKey).toHaveBeenCalledWith(
        'test-api-key-123',
        'cluster-uuid-456'
      );
      expect(mockStorageService.saveApiKey).toHaveBeenCalledWith(
        'new-rotated-api-key-789',
        'cluster-uuid-456'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          message: 'API key rotated successfully',
        },
      });
    });
  });

  describe('POST /internal/cloud_connect/cluster/{service_key}/rotate_api_key', () => {
    let routeHandler: Function;

    beforeEach(() => {
      const mockGetStartServices = jest.fn();

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getApiKeyData } = require('../lib/create_storage_service');
      getApiKeyData.mockResolvedValue({
        apiKeyData: {
          apiKey: 'test-api-key-123',
          clusterId: 'cluster-uuid-456',
        },
        storageService: mockStorageService,
      });

      registerRotateApiKeyRoute({
        router: mockRouter,
        logger: mockLogger,
        getStartServices: mockGetStartServices,
        cloudApiUrl: 'https://cloud.elastic.co',
      });

      // Extract the route handler for POST /cluster/{service_key}/rotate_api_key
      const postCalls = mockRouter.post.mock.calls;
      const rotateCall = postCalls.find(
        (call) => call[0].path === '/internal/cloud_connect/cluster/{service_key}/rotate_api_key'
      );
      routeHandler = rotateCall![1];
    });

    it('should rotate EIS service API key and update inference CCM', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { enableInferenceCCM } = require('../services/inference_ccm');

      mockCloudConnectInstance.rotateServiceApiKey.mockResolvedValue({
        key: 'new-eis-api-key-789',
      });
      enableInferenceCCM.mockResolvedValue(undefined);

      mockRequest = {
        params: {
          service_key: 'eis',
        },
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockCloudConnectInstance.rotateServiceApiKey).toHaveBeenCalledWith(
        'test-api-key-123',
        'cluster-uuid-456',
        'eis'
      );
      expect(enableInferenceCCM).toHaveBeenCalledWith(
        mockEsClient,
        'new-eis-api-key-789',
        mockLogger
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          message: 'Service API key rotated successfully',
        },
      });
    });
  });
});
