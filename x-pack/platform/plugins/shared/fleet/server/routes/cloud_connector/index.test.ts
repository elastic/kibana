/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { FleetRequestHandlerContext } from '../../types';
import type {
  CloudProvider,
  CloudConnectorResponse,
} from '../../../common/types/models/cloud_connector';

import { cloudConnectorService } from '../../services';

import { registerRoutes } from '.';
import { createCloudConnectorHandler, getCloudConnectorsHandler } from './handlers';

// Mock dependencies
jest.mock('../../services/app_context', () => ({
  appContextService: {
    getLogger: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
      }),
    }),
    getConfig: jest.fn().mockReturnValue({
      internal: {
        fleetServerStandalone: false,
      },
    }),
  },
}));

jest.mock('../../services', () => ({
  cloudConnectorService: {
    create: jest.fn(),
    getList: jest.fn(),
  },
}));

describe('Cloud Connector API', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  const mockCloudConnectorService = cloudConnectorService as jest.Mocked<
    typeof cloudConnectorService
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    context = {
      fleet: Promise.resolve({
        internalSoClient: {
          create: jest.fn(),
          find: jest.fn(),
        },
      }),
    } as any;
    response = httpServerMock.createResponseFactory();
  });

  describe('Handler Input Validation', () => {
    describe('POST /api/fleet/cloud_connectors', () => {
      it('should handle missing request body', async () => {
        const request = httpServerMock.createKibanaRequest({
          body: undefined,
        });

        await createCloudConnectorHandler(context, request, response);

        // Should still call the service, which will handle the undefined body
        expect(mockCloudConnectorService.create).toHaveBeenCalledWith(
          expect.any(Object), // internalSoClient
          {}
        );
      });

      it('should handle malformed request body', async () => {
        const request = httpServerMock.createKibanaRequest({
          body: {
            name: '', // Empty string
            cloudProvider: 'INVALID_PROVIDER',
            vars: null,
          },
        });

        await createCloudConnectorHandler(context, request, response);

        // Should still call the service, which will handle validation
        expect(mockCloudConnectorService.create).toHaveBeenCalled();
      });

      it('should accept valid AWS cloud provider', async () => {
        const mockCloudConnector: CloudConnectorResponse = {
          id: 'test-id',
          name: 'test-connector',
          cloudProvider: 'aws' as CloudProvider,
          vars: {},
          packagePolicyCount: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        };

        mockCloudConnectorService.create.mockResolvedValue(mockCloudConnector);

        const request = httpServerMock.createKibanaRequest({
          body: {
            name: 'test-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123:role/TestRole', type: 'text' },
              external_id: { value: { isSecretRef: true, id: 'secret-123' }, type: 'password' },
            },
          },
        });

        await createCloudConnectorHandler(context, request, response);

        expect(response.ok).toHaveBeenCalledWith({
          body: mockCloudConnector,
        });
      });
    });

    describe('GET /api/fleet/cloud_connectors', () => {
      it('should validate query parameters', async () => {
        const request = httpServerMock.createKibanaRequest({
          query: {
            page: 'invalid', // Should be a number string
            perPage: 'invalid', // Should be a number string
          },
        });

        await getCloudConnectorsHandler(context, request, response);

        // Should still work as query params are optional
        expect(mockCloudConnectorService.getList).toHaveBeenCalled();
      });

      it('should handle valid query parameters', async () => {
        const mockCloudConnectors: CloudConnectorResponse[] = [
          {
            id: 'test-id',
            name: 'test-connector',
            cloudProvider: 'aws' as CloudProvider,
            vars: {},
            packagePolicyCount: 1,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        ];

        mockCloudConnectorService.getList.mockResolvedValue(mockCloudConnectors);

        const request = httpServerMock.createKibanaRequest({
          query: {
            page: '1',
            perPage: '20',
          },
        });

        await getCloudConnectorsHandler(context, request, response);

        expect(response.ok).toHaveBeenCalledWith({
          body: mockCloudConnectors,
        });
      });
    });
  });

  describe('CREATE Cloud Connector', () => {
    it('should create cloud connector successfully', async () => {
      const mockCloudConnector: CloudConnectorResponse = {
        id: 'test-id',
        name: 'test-connector',
        cloudProvider: 'aws' as CloudProvider,
        vars: {
          role_arn: { value: 'arn:aws:iam::123:role/TestRole', type: 'text' },
          external_id: {
            value: { isSecretRef: true, id: 'secret-123' },
            type: 'password' as const,
          },
        },
        packagePolicyCount: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockCloudConnectorService.create.mockResolvedValue(mockCloudConnector);

      const request = httpServerMock.createKibanaRequest({
        body: {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: { value: 'arn:aws:iam::123:role/TestRole', type: 'text' },
            external_id: { value: { isSecretRef: true, id: 'secret-123' }, type: 'password' },
          },
        },
      });

      await createCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.create).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        {
          name: 'test-connector',
          cloudProvider: 'aws' as CloudProvider,
          vars: {
            role_arn: { value: 'arn:aws:iam::123:role/TestRole', type: 'text' },
            external_id: { value: { isSecretRef: true, id: 'secret-123' }, type: 'password' },
          },
        }
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: mockCloudConnector,
      });
    });

    it('should handle missing required variables', async () => {
      const error = new Error('AWS package policy must contain role_arn variable');
      mockCloudConnectorService.create.mockRejectedValue(error);

      const request = httpServerMock.createKibanaRequest({
        body: {
          name: 'test-connector',
          cloudProvider: 'aws' as CloudProvider,
          vars: {
            // Missing role_arn
            external_id: { value: { isSecretRef: true, id: 'secret-123' }, type: 'password' },
          },
        },
      });

      await createCloudConnectorHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'AWS package policy must contain role_arn variable',
        },
      });
    });
  });

  describe('GET Cloud Connectors', () => {
    it('should get cloud connectors list successfully', async () => {
      const mockCloudConnectors: CloudConnectorResponse[] = [
        {
          id: 'connector-1',
          name: 'aws-connector',
          cloudProvider: 'aws' as CloudProvider,
          vars: {
            role_arn: { value: 'arn:aws:iam::123:role/TestRole', type: 'text' as const },
            external_id: {
              value: { isSecretRef: true, id: 'secret-123' },
              type: 'password' as const,
            },
          },
          packagePolicyCount: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockCloudConnectorService.getList.mockResolvedValue(mockCloudConnectors);

      const request = httpServerMock.createKibanaRequest({
        query: {},
      });

      await getCloudConnectorsHandler(context, request, response);

      expect(mockCloudConnectorService.getList).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        {
          page: undefined,
          perPage: undefined,
        }
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: mockCloudConnectors,
      });
    });

    it('should return empty list when no connectors exist', async () => {
      const mockCloudConnectors: CloudConnectorResponse[] = [];

      mockCloudConnectorService.getList.mockResolvedValue(mockCloudConnectors);

      const request = httpServerMock.createKibanaRequest({
        query: {},
      });

      await getCloudConnectorsHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: [],
      });
    });

    it('should handle service failure with pagination parameters', async () => {
      const mockError = new Error(
        'CloudConnectorService Failed to get cloud connectors list: Invalid pagination parameters'
      );
      mockCloudConnectorService.getList.mockRejectedValue(mockError);

      const request = httpServerMock.createKibanaRequest({
        query: {
          page: '2',
          perPage: '10',
        },
      });

      await getCloudConnectorsHandler(context, request, response);

      expect(mockCloudConnectorService.getList).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        {
          page: 2,
          perPage: 10,
        }
      );

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message:
            'CloudConnectorService Failed to get cloud connectors list: Invalid pagination parameters',
        },
      });
    });
  });

  describe('Route Registration', () => {
    it('should register cloud connector routes', () => {
      const mockRouter = {
        versioned: {
          post: jest.fn().mockReturnThis(),
          get: jest.fn().mockReturnThis(),
          addVersion: jest.fn().mockReturnThis(),
        },
      };

      registerRoutes(mockRouter as any);

      expect(mockRouter.versioned.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.any(String),
          security: expect.any(Object),
          summary: 'Create cloud connector',
        })
      );

      expect(mockRouter.versioned.get).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.any(String),
          security: expect.any(Object),
          summary: 'Get cloud connectors',
        })
      );
    });
  });
});
