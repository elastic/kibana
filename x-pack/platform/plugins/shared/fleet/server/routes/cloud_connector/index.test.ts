/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { FleetRequestHandlerContext } from '../../types';
import type { CloudProvider, CloudConnector } from '../../../common/types/models/cloud_connector';

import { cloudConnectorService } from '../../services';

import { packagePolicyService } from '../../services';

import { registerRoutes } from '.';
import {
  createCloudConnectorHandler,
  getCloudConnectorsHandler,
  getCloudConnectorHandler,
  updateCloudConnectorHandler,
  deleteCloudConnectorHandler,
  getCloudConnectorUsageHandler,
} from './handlers';

// Mock dependencies
jest.mock('../../services/app_context', () => ({
  appContextService: {
    getLogger: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
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
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  packagePolicyService: {
    list: jest.fn(),
  },
}));

describe('Cloud Connector API', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  const mockCloudConnectorService = cloudConnectorService as jest.Mocked<
    typeof cloudConnectorService
  >;
  const mockPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;

  beforeEach(() => {
    jest.clearAllMocks();
    context = {
      fleet: Promise.resolve({
        internalSoClient: {
          create: jest.fn(),
          find: jest.fn(),
        },
      }),
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asInternalUser: {},
          },
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
        const mockCloudConnector: CloudConnector = {
          id: 'test-id',
          name: 'test-connector',
          cloudProvider: 'aws' as CloudProvider,
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/test', type: 'text' },
            external_id: { value: { id: 'test-secret-id', isSecretRef: true }, type: 'password' },
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

        expect(response.ok).toHaveBeenCalledWith({
          body: { item: mockCloudConnector },
        });
      });

      it('should accept valid Azure cloud provider', async () => {
        const mockCloudConnector: CloudConnector = {
          id: 'test-id',
          name: 'test-connector',
          cloudProvider: 'azure' as CloudProvider,
          vars: {
            tenant_id: {
              value: { id: 'azure-tenant-secret', isSecretRef: true },
              type: 'password',
            },
            client_id: {
              value: { id: 'azure-client-secret', isSecretRef: true },
              type: 'password',
            },
            azure_credentials_cloud_connector_id: {
              value: 'azure-connector-123',
              type: 'text',
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
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                value: { id: 'azure-tenant-secret', isSecretRef: true },
                type: 'password',
              },
              client_id: {
                value: { id: 'azure-client-secret', isSecretRef: true },
                type: 'password',
              },
              azure_credentials_cloud_connector_id: {
                value: 'azure-connector-123',
                type: 'text',
              },
            },
          },
        });

        await createCloudConnectorHandler(context, request, response);

        expect(response.ok).toHaveBeenCalledWith({
          body: { item: mockCloudConnector },
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
        const mockCloudConnectors: CloudConnector[] = [
          {
            id: 'test-id',
            name: 'test-connector',
            cloudProvider: 'aws' as CloudProvider,
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test', type: 'text' },
              external_id: { value: { id: 'test-secret-id', isSecretRef: true }, type: 'password' },
            },
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
          body: { items: mockCloudConnectors },
        });
      });
    });
  });

  describe('CREATE Cloud Connector', () => {
    it('should create AWS cloud connector successfully', async () => {
      const mockCloudConnector: CloudConnector = {
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
        body: { item: mockCloudConnector },
      });
    });

    it('should create Azure cloud connector successfully', async () => {
      const mockCloudConnector: CloudConnector = {
        id: 'test-id',
        name: 'test-connector',
        cloudProvider: 'azure' as CloudProvider,
        vars: {
          tenant_id: {
            value: { isSecretRef: true, id: 'tenant-secret-123' },
            type: 'password' as const,
          },
          client_id: {
            value: { isSecretRef: true, id: 'client-secret-456' },
            type: 'password' as const,
          },
          azure_credentials_cloud_connector_id: {
            value: 'azure-connector-789',
            type: 'text' as const,
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
          cloudProvider: 'azure',
          vars: {
            tenant_id: { value: { isSecretRef: true, id: 'tenant-secret-123' }, type: 'password' },
            client_id: { value: { isSecretRef: true, id: 'client-secret-456' }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'azure-connector-789',
              type: 'text',
            },
          },
        },
      });

      await createCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.create).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        {
          name: 'test-connector',
          cloudProvider: 'azure' as CloudProvider,
          vars: {
            tenant_id: { value: { isSecretRef: true, id: 'tenant-secret-123' }, type: 'password' },
            client_id: { value: { isSecretRef: true, id: 'client-secret-456' }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'azure-connector-789',
              type: 'text',
            },
          },
        }
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: mockCloudConnector },
      });
    });

    it('should handle missing required AWS variables', async () => {
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

    it('should handle missing required Azure variables', async () => {
      const error = new Error('Azure package policy must contain tenant_id variable');
      mockCloudConnectorService.create.mockRejectedValue(error);

      const request = httpServerMock.createKibanaRequest({
        body: {
          name: 'test-connector',
          cloudProvider: 'azure' as CloudProvider,
          vars: {
            // Missing tenant_id
            client_id: { value: { isSecretRef: true, id: 'client-secret-456' }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'azure-connector-789',
              type: 'text',
            },
          },
        },
      });

      await createCloudConnectorHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'Azure package policy must contain tenant_id variable',
        },
      });
    });
  });

  describe('GET Cloud Connectors', () => {
    it('should get cloud connectors list successfully', async () => {
      const mockCloudConnectors: CloudConnector[] = [
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
        body: { items: mockCloudConnectors },
      });
    });

    it('should return empty list when no connectors exist', async () => {
      const mockCloudConnectors: CloudConnector[] = [];

      mockCloudConnectorService.getList.mockResolvedValue(mockCloudConnectors);

      const request = httpServerMock.createKibanaRequest({
        query: {},
      });

      await getCloudConnectorsHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: { items: [] },
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

  describe('GET Cloud Connector by ID', () => {
    it('should get AWS cloud connector by ID successfully', async () => {
      const mockCloudConnector: CloudConnector = {
        id: 'connector-123',
        name: 'aws-connector',
        namespace: '*',
        cloudProvider: 'aws' as CloudProvider,
        vars: {
          role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' as const },
          external_id: {
            value: { isSecretRef: true, id: 'ABCDEFGHIJKLMNOPQRST' },
            type: 'password' as const,
          },
        },
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockCloudConnectorService.getById.mockResolvedValue(mockCloudConnector);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
      });

      await getCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.getById).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        'connector-123'
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: mockCloudConnector },
      });
    });

    it('should get Azure cloud connector by ID successfully', async () => {
      const mockCloudConnector: CloudConnector = {
        id: 'connector-456',
        name: 'azure-connector',
        namespace: '*',
        cloudProvider: 'azure' as CloudProvider,
        vars: {
          tenant_id: {
            value: { isSecretRef: true, id: 'azure-tenant-id-secret' },
            type: 'password' as const,
          },
          client_id: {
            value: { isSecretRef: true, id: 'azure-client-id-secret' },
            type: 'password' as const,
          },
          azure_credentials_cloud_connector_id: {
            value: 'azure-connector-id',
            type: 'text' as const,
          },
        },
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockCloudConnectorService.getById.mockResolvedValue(mockCloudConnector);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-456',
        },
      });

      await getCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.getById).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        'connector-456'
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: mockCloudConnector },
      });
    });

    it('should handle cloud connector not found error', async () => {
      const error = new Error('Saved object [cloud-connector/non-existent-id] not found');
      mockCloudConnectorService.getById.mockRejectedValue(error);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'non-existent-id',
        },
      });

      await getCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.getById).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        'non-existent-id'
      );

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'Saved object [cloud-connector/non-existent-id] not found',
        },
      });
    });

    it('should handle missing cloud connector ID parameter', async () => {
      const request = httpServerMock.createKibanaRequest({
        params: {
          // Missing cloudConnectorId
        },
      });

      await getCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.getById).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        undefined
      );
    });
  });

  describe('UPDATE Cloud Connector', () => {
    it('should update AWS cloud connector name successfully', async () => {
      const mockUpdatedConnector: CloudConnector = {
        id: 'connector-123',
        name: 'updated-aws-connector',
        namespace: '*',
        cloudProvider: 'aws' as CloudProvider,
        vars: {
          role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' as const },
          external_id: {
            value: { isSecretRef: true, id: 'ABCDEFGHIJKLMNOPQRST' },
            type: 'password' as const,
          },
        },
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T02:00:00.000Z',
      };

      mockCloudConnectorService.update.mockResolvedValue(mockUpdatedConnector);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
        body: {
          name: 'updated-aws-connector',
        },
      });

      await updateCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.update).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        'connector-123',
        {
          name: 'updated-aws-connector',
        }
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: mockUpdatedConnector },
      });
    });

    it('should update Azure cloud connector name successfully', async () => {
      const mockUpdatedConnector: CloudConnector = {
        id: 'connector-456',
        name: 'updated-azure-connector',
        namespace: '*',
        cloudProvider: 'azure' as CloudProvider,
        vars: {
          tenant_id: {
            value: { isSecretRef: true, id: 'azure-tenant-id-secret' },
            type: 'password' as const,
          },
          client_id: {
            value: { isSecretRef: true, id: 'azure-client-id-secret' },
            type: 'password' as const,
          },
          azure_credentials_cloud_connector_id: {
            value: 'azure-connector-id',
            type: 'text' as const,
          },
        },
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T02:00:00.000Z',
      };

      mockCloudConnectorService.update.mockResolvedValue(mockUpdatedConnector);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-456',
        },
        body: {
          name: 'updated-azure-connector',
        },
      });

      await updateCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.update).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        'connector-456',
        {
          name: 'updated-azure-connector',
        }
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: mockUpdatedConnector },
      });
    });

    it('should update AWS cloud connector vars successfully', async () => {
      const updatedVars = {
        role_arn: { value: 'arn:aws:iam::123456789012:role/UpdatedRole', type: 'text' as const },
        external_id: {
          value: { isSecretRef: true, id: 'UPDATEDEXTERNALID123' },
          type: 'password' as const,
        },
      };

      const mockUpdatedConnector: CloudConnector = {
        id: 'connector-123',
        name: 'aws-connector',
        namespace: '*',
        cloudProvider: 'aws' as CloudProvider,
        vars: updatedVars,
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T02:00:00.000Z',
      };

      mockCloudConnectorService.update.mockResolvedValue(mockUpdatedConnector);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
        body: {
          vars: updatedVars,
        },
      });

      await updateCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.update).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        'connector-123',
        {
          vars: updatedVars,
        }
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: mockUpdatedConnector },
      });
    });

    it('should update Azure cloud connector vars successfully', async () => {
      const updatedVars = {
        tenant_id: {
          value: { isSecretRef: true, id: 'updated-tenant-secret' },
          type: 'password' as const,
        },
        client_id: {
          value: { isSecretRef: true, id: 'updated-client-secret' },
          type: 'password' as const,
        },
        azure_credentials_cloud_connector_id: {
          value: 'updated-azure-connector-id',
          type: 'text' as const,
        },
      };

      const mockUpdatedConnector: CloudConnector = {
        id: 'connector-456',
        name: 'azure-connector',
        namespace: '*',
        cloudProvider: 'azure' as CloudProvider,
        vars: updatedVars,
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T02:00:00.000Z',
      };

      mockCloudConnectorService.update.mockResolvedValue(mockUpdatedConnector);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-456',
        },
        body: {
          vars: updatedVars,
        },
      });

      await updateCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.update).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        'connector-456',
        {
          vars: updatedVars,
        }
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: mockUpdatedConnector },
      });
    });

    it('should update both AWS name and vars successfully', async () => {
      const updatedVars = {
        role_arn: {
          value: 'arn:aws:iam::123456789012:role/FullyUpdatedRole',
          type: 'text' as const,
        },
        external_id: {
          value: { isSecretRef: true, id: 'FULLYUPDATEDID123456' },
          type: 'password' as const,
        },
      };

      const mockUpdatedConnector: CloudConnector = {
        id: 'connector-123',
        name: 'fully-updated-connector',
        namespace: '*',
        cloudProvider: 'aws' as CloudProvider,
        vars: updatedVars,
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T02:00:00.000Z',
      };

      mockCloudConnectorService.update.mockResolvedValue(mockUpdatedConnector);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
        body: {
          name: 'fully-updated-connector',
          vars: updatedVars,
        },
      });

      await updateCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.update).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        'connector-123',
        {
          name: 'fully-updated-connector',
          vars: updatedVars,
        }
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: mockUpdatedConnector },
      });
    });

    it('should update both Azure name and vars successfully', async () => {
      const updatedVars = {
        tenant_id: {
          value: { isSecretRef: true, id: 'fully-updated-tenant' },
          type: 'password' as const,
        },
        client_id: {
          value: { isSecretRef: true, id: 'fully-updated-client' },
          type: 'password' as const,
        },
        azure_credentials_cloud_connector_id: {
          value: 'fully-updated-azure-id',
          type: 'text' as const,
        },
      };

      const mockUpdatedConnector: CloudConnector = {
        id: 'connector-456',
        name: 'fully-updated-azure-connector',
        namespace: '*',
        cloudProvider: 'azure' as CloudProvider,
        vars: updatedVars,
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T02:00:00.000Z',
      };

      mockCloudConnectorService.update.mockResolvedValue(mockUpdatedConnector);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-456',
        },
        body: {
          name: 'fully-updated-azure-connector',
          vars: updatedVars,
        },
      });

      await updateCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.update).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        'connector-456',
        {
          name: 'fully-updated-azure-connector',
          vars: updatedVars,
        }
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: mockUpdatedConnector },
      });
    });

    it('should handle validation errors', async () => {
      const error = new Error('External ID secret reference is not valid');
      mockCloudConnectorService.update.mockRejectedValue(error);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
        body: {
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/ValidRole', type: 'text' },
            external_id: {
              value: { isSecretRef: true, id: 'TOOSHORT' }, // Invalid: too short
              type: 'password',
            },
          },
        },
      });

      await updateCloudConnectorHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'External ID secret reference is not valid',
        },
      });
    });

    it('should handle cloud connector not found during update', async () => {
      const error = new Error('Failed to update cloud connector: Saved object not found');
      mockCloudConnectorService.update.mockRejectedValue(error);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'non-existent-id',
        },
        body: {
          name: 'updated-name',
        },
      });

      await updateCloudConnectorHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'Failed to update cloud connector: Saved object not found',
        },
      });
    });

    it('should handle empty update request', async () => {
      const mockUpdatedConnector: CloudConnector = {
        id: 'connector-123',
        name: 'aws-connector',
        namespace: '*',
        cloudProvider: 'aws' as CloudProvider,
        vars: {
          role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' as const },
          external_id: {
            value: { isSecretRef: true, id: 'ABCDEFGHIJKLMNOPQRST' },
            type: 'password' as const,
          },
        },
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T02:00:00.000Z',
      };

      mockCloudConnectorService.update.mockResolvedValue(mockUpdatedConnector);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
        body: {}, // Empty update
      });

      await updateCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.update).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        'connector-123',
        {}
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: mockUpdatedConnector },
      });
    });
  });

  describe('DELETE Cloud Connector', () => {
    it('should delete cloud connector successfully when packagePolicyCount is 0', async () => {
      const mockDeleteResult = {
        id: 'connector-123',
      };

      mockCloudConnectorService.delete.mockResolvedValue(mockDeleteResult);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
        query: {},
      });

      await deleteCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.delete).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        expect.any(Object), // esClient
        'connector-123',
        false // default force value
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: mockDeleteResult,
      });
    });

    it('should handle force delete with packagePolicyCount > 0', async () => {
      const mockDeleteResult = {
        id: 'connector-123',
      };

      mockCloudConnectorService.delete.mockResolvedValue(mockDeleteResult);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
        query: {
          force: true,
        },
      });

      await deleteCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.delete).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        expect.any(Object), // esClient
        'connector-123',
        true
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: mockDeleteResult,
      });
    });

    it('should handle force delete with string "true" parameter', async () => {
      const mockDeleteResult = {
        id: 'connector-123',
      };

      mockCloudConnectorService.delete.mockResolvedValue(mockDeleteResult);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
        query: {
          force: 'true', // String instead of boolean
        },
      });

      await deleteCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.delete).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        expect.any(Object), // esClient
        'connector-123',
        'true' // Handler will pass the string value
      );
    });

    it('should reject deletion when packagePolicyCount > 0 and force is false', async () => {
      const error = new Error(
        'Cannot delete cloud connector "test-connector" as it is being used by 3 package policies'
      );
      mockCloudConnectorService.delete.mockRejectedValue(error);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
        query: {
          force: false,
        },
      });

      await deleteCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.delete).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        expect.any(Object), // esClient
        'connector-123',
        false
      );

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message:
            'Cannot delete cloud connector "test-connector" as it is being used by 3 package policies',
        },
      });
    });

    it('should handle cloud connector not found during delete', async () => {
      const error = new Error('Failed to delete cloud connector: Saved object not found');
      mockCloudConnectorService.delete.mockRejectedValue(error);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'non-existent-id',
        },
        query: {},
      });

      await deleteCloudConnectorHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'Failed to delete cloud connector: Saved object not found',
        },
      });
    });

    it('should handle missing cloudConnectorId parameter', async () => {
      const request = httpServerMock.createKibanaRequest({
        params: {
          // Missing cloudConnectorId
        },
        query: {},
      });

      await deleteCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.delete).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        expect.any(Object), // esClient
        undefined,
        false
      );
    });

    it('should default force parameter to false when not provided', async () => {
      const mockDeleteResult = {
        id: 'connector-123',
      };

      mockCloudConnectorService.delete.mockResolvedValue(mockDeleteResult);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
        // No query parameters at all
      });

      await deleteCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.delete).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        expect.any(Object), // esClient
        'connector-123',
        false // should default to false
      );
    });

    it('should handle force=false explicitly', async () => {
      const mockDeleteResult = {
        id: 'connector-123',
      };

      mockCloudConnectorService.delete.mockResolvedValue(mockDeleteResult);

      const request = httpServerMock.createKibanaRequest({
        params: {
          cloudConnectorId: 'connector-123',
        },
        query: {
          force: false,
        },
      });

      await deleteCloudConnectorHandler(context, request, response);

      expect(mockCloudConnectorService.delete).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        expect.any(Object), // esClient
        'connector-123',
        false
      );
    });
  });

  describe('Route Registration', () => {
    it('should register all cloud connector routes', () => {
      const mockRouter = {
        versioned: {
          post: jest.fn().mockReturnThis(),
          get: jest.fn().mockReturnThis(),
          put: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          addVersion: jest.fn().mockReturnThis(),
        },
      };

      registerRoutes(mockRouter as any);

      // POST /api/fleet/cloud_connectors
      expect(mockRouter.versioned.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.any(String),
          security: expect.any(Object),
          summary: 'Create cloud connector',
        })
      );

      // GET /api/fleet/cloud_connectors
      expect(mockRouter.versioned.get).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.any(String),
          security: expect.any(Object),
          summary: 'Get cloud connectors',
        })
      );

      // GET /api/fleet/cloud_connectors/{cloudConnectorId}
      expect(mockRouter.versioned.get).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.any(String),
          security: expect.any(Object),
          summary: 'Get cloud connector',
        })
      );

      // PUT /api/fleet/cloud_connectors/{cloudConnectorId}
      expect(mockRouter.versioned.put).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.any(String),
          security: expect.any(Object),
          summary: 'Update cloud connector',
        })
      );

      // DELETE /api/fleet/cloud_connectors/{cloudConnectorId}
      expect(mockRouter.versioned.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.any(String),
          security: expect.any(Object),
          summary: 'Delete cloud connector (supports force deletion)',
        })
      );
    });
  });

  describe('GET /cloud_connectors with kuery filter', () => {
    it('should filter by kuery query parameter', async () => {
      const mockConnectors: CloudConnector[] = [
        {
          id: 'connector-1',
          name: 'AWS Connector',
          namespace: '*',
          cloudProvider: 'aws' as CloudProvider,
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' },
            external_id: { value: { id: 'secret-id', isSecretRef: true }, type: 'password' },
          },
          packagePolicyCount: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
        {
          id: 'connector-2',
          name: 'Azure Connector',
          namespace: '*',
          cloudProvider: 'azure' as CloudProvider,
          vars: {
            tenant_id: { value: { id: 'secret-tenant', isSecretRef: true }, type: 'password' },
            client_id: { value: { id: 'secret-client', isSecretRef: true }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'secret-cc',
              type: 'text',
            },
          },
          packagePolicyCount: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      // Mock service to return filtered connectors
      mockCloudConnectorService.getList.mockResolvedValue(mockConnectors);

      const request = httpServerMock.createKibanaRequest({
        query: { kuery: 'fleet-cloud-connector.attributes.cloudProvider: "azure"' },
      });

      await getCloudConnectorsHandler(context, request, response);

      // Verify service was called with kuery filter
      expect(mockCloudConnectorService.getList).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        expect.objectContaining({
          kuery: 'fleet-cloud-connector.attributes.cloudProvider: "azure"',
        })
      );

      // Verify response
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          items: mockConnectors,
        },
      });
    });

    it('should return all connectors when kuery not specified', async () => {
      const mockConnectors: CloudConnector[] = [
        {
          id: 'connector-1',
          name: 'AWS Connector',
          namespace: '*',
          cloudProvider: 'aws' as CloudProvider,
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' },
            external_id: { value: { id: 'secret-id', isSecretRef: true }, type: 'password' },
          },
          packagePolicyCount: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
        {
          id: 'connector-2',
          name: 'Azure Connector',
          namespace: '*',
          cloudProvider: 'azure' as CloudProvider,
          vars: {
            tenant_id: { value: { id: 'secret-tenant', isSecretRef: true }, type: 'password' },
            client_id: { value: { id: 'secret-client', isSecretRef: true }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'secret-cc',
              type: 'text',
            },
          },
          packagePolicyCount: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      // Mock service to return all connectors
      mockCloudConnectorService.getList.mockResolvedValue(mockConnectors);

      const request = httpServerMock.createKibanaRequest({
        query: {}, // No kuery specified
      });

      await getCloudConnectorsHandler(context, request, response);

      // Verify service was called without kuery filter
      expect(mockCloudConnectorService.getList).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        expect.objectContaining({
          // Should not have kuery property
        })
      );

      // Verify response contains all connectors
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          items: mockConnectors,
        },
      });
    });

    it('should handle AWS kuery filter', async () => {
      const mockAwsConnectors: CloudConnector[] = [
        {
          id: 'connector-1',
          name: 'AWS Connector 1',
          namespace: '*',
          cloudProvider: 'aws' as CloudProvider,
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole1', type: 'text' },
            external_id: { value: { id: 'secret-id-1', isSecretRef: true }, type: 'password' },
          },
          packagePolicyCount: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
        {
          id: 'connector-2',
          name: 'AWS Connector 2',
          namespace: '*',
          cloudProvider: 'aws' as CloudProvider,
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole2', type: 'text' },
            external_id: { value: { id: 'secret-id-2', isSecretRef: true }, type: 'password' },
          },
          packagePolicyCount: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockCloudConnectorService.getList.mockResolvedValue(mockAwsConnectors);

      const request = httpServerMock.createKibanaRequest({
        query: { kuery: 'fleet-cloud-connector.attributes.cloudProvider: "aws"' },
      });

      await getCloudConnectorsHandler(context, request, response);

      expect(mockCloudConnectorService.getList).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        expect.objectContaining({
          kuery: 'fleet-cloud-connector.attributes.cloudProvider: "aws"',
        })
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          items: mockAwsConnectors,
        },
      });
    });

    it('should handle empty result when filtering by non-existent cloud provider', async () => {
      mockCloudConnectorService.getList.mockResolvedValue([]);

      const request = httpServerMock.createKibanaRequest({
        query: { kuery: 'fleet-cloud-connector.attributes.cloudProvider: "gcp"' },
      });

      await getCloudConnectorsHandler(context, request, response);

      expect(mockCloudConnectorService.getList).toHaveBeenCalledWith(
        expect.any(Object), // internalSoClient
        expect.objectContaining({
          kuery: 'fleet-cloud-connector.attributes.cloudProvider: "gcp"',
        })
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          items: [],
        },
      });
    });
  });

  describe('GET /cloud_connectors/{cloudConnectorId}/usage', () => {
    it('should return usage items for a cloud connector', async () => {
      const mockCloudConnector: CloudConnector = {
        id: 'connector-123',
        name: 'test-connector',
        cloudProvider: 'aws' as CloudProvider,
        vars: {
          role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' },
          external_id: { value: { id: 'secret-id', isSecretRef: true }, type: 'password' },
        },
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockCloudConnectorService.getById.mockResolvedValue(mockCloudConnector);

      mockPackagePolicyService.list.mockResolvedValue({
        items: [
          {
            id: 'policy-1',
            name: 'CSPM Policy',
            package: {
              name: 'cloud_security_posture',
              title: 'Cloud Security Posture',
              version: '1.0.0',
            },
            policy_ids: ['agent-policy-1'],
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-02T00:00:00.000Z',
          },
          {
            id: 'policy-2',
            name: 'Asset Inventory Policy',
            package: {
              name: 'asset_inventory',
              title: 'Asset Inventory',
              version: '2.0.0',
            },
            policy_ids: ['agent-policy-2'],
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-02T00:00:00.000Z',
          },
        ],
        total: 2,
        page: 1,
        perPage: 10,
      } as any);

      const request = httpServerMock.createKibanaRequest({
        params: { cloudConnectorId: 'connector-123' },
        query: {},
      });

      await getCloudConnectorUsageHandler(context, request, response);

      expect(mockCloudConnectorService.getById).toHaveBeenCalledWith(
        expect.any(Object),
        'connector-123'
      );

      expect(mockPackagePolicyService.list).toHaveBeenCalledWith(expect.any(Object), {
        page: 1,
        perPage: 10,
        kuery: 'fleet-package-policies.attributes.cloud_connector_id:"connector-123"',
      });

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          items: [
            {
              id: 'policy-1',
              name: 'CSPM Policy',
              package: {
                name: 'cloud_security_posture',
                title: 'Cloud Security Posture',
                version: '1.0.0',
              },
              policy_ids: ['agent-policy-1'],
              created_at: '2023-01-01T00:00:00.000Z',
              updated_at: '2023-01-02T00:00:00.000Z',
            },
            {
              id: 'policy-2',
              name: 'Asset Inventory Policy',
              package: {
                name: 'asset_inventory',
                title: 'Asset Inventory',
                version: '2.0.0',
              },
              policy_ids: ['agent-policy-2'],
              created_at: '2023-01-01T00:00:00.000Z',
              updated_at: '2023-01-02T00:00:00.000Z',
            },
          ],
          total: 2,
          page: 1,
          perPage: 10,
        },
      });
    });

    it('should return 400 when cloud connector does not exist', async () => {
      const error = new Error('Cloud connector not found');
      mockCloudConnectorService.getById.mockRejectedValue(error);

      const request = httpServerMock.createKibanaRequest({
        params: { cloudConnectorId: 'non-existent-id' },
        query: {},
      });

      await getCloudConnectorUsageHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'Cloud connector not found',
        },
      });
    });

    it('should support pagination parameters', async () => {
      const mockCloudConnector: CloudConnector = {
        id: 'connector-123',
        name: 'test-connector',
        cloudProvider: 'aws' as CloudProvider,
        vars: {
          role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' },
          external_id: { value: { id: 'secret-id', isSecretRef: true }, type: 'password' },
        },
        packagePolicyCount: 25,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockCloudConnectorService.getById.mockResolvedValue(mockCloudConnector);
      mockPackagePolicyService.list.mockResolvedValue({
        items: [],
        total: 25,
        page: 3,
        perPage: 5,
      } as any);

      const request = httpServerMock.createKibanaRequest({
        params: { cloudConnectorId: 'connector-123' },
        query: { page: 3, perPage: 5 },
      });

      await getCloudConnectorUsageHandler(context, request, response);

      expect(mockPackagePolicyService.list).toHaveBeenCalledWith(expect.any(Object), {
        page: 3,
        perPage: 5,
        kuery: 'fleet-package-policies.attributes.cloud_connector_id:"connector-123"',
      });

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          items: [],
          total: 25,
          page: 3,
          perPage: 5,
        },
      });
    });

    it('should return empty items when no policies use the connector', async () => {
      const mockCloudConnector: CloudConnector = {
        id: 'connector-123',
        name: 'test-connector',
        cloudProvider: 'aws' as CloudProvider,
        vars: {
          role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' },
          external_id: { value: { id: 'secret-id', isSecretRef: true }, type: 'password' },
        },
        packagePolicyCount: 0,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockCloudConnectorService.getById.mockResolvedValue(mockCloudConnector);
      mockPackagePolicyService.list.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        perPage: 10,
      } as any);

      const request = httpServerMock.createKibanaRequest({
        params: { cloudConnectorId: 'connector-123' },
        query: {},
      });

      await getCloudConnectorUsageHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          items: [],
          total: 0,
          page: 1,
          perPage: 10,
        },
      });
    });

    it('should handle package policy service errors', async () => {
      const mockCloudConnector: CloudConnector = {
        id: 'connector-123',
        name: 'test-connector',
        cloudProvider: 'aws' as CloudProvider,
        vars: {
          role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' },
          external_id: { value: { id: 'secret-id', isSecretRef: true }, type: 'password' },
        },
        packagePolicyCount: 0,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockCloudConnectorService.getById.mockResolvedValue(mockCloudConnector);
      mockPackagePolicyService.list.mockRejectedValue(new Error('Database error'));

      const request = httpServerMock.createKibanaRequest({
        params: { cloudConnectorId: 'connector-123' },
        query: {},
      });

      await getCloudConnectorUsageHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'Database error',
        },
      });
    });

    it('should handle policies without package information', async () => {
      const mockCloudConnector: CloudConnector = {
        id: 'connector-123',
        name: 'test-connector',
        cloudProvider: 'aws' as CloudProvider,
        vars: {
          role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' },
          external_id: { value: { id: 'secret-id', isSecretRef: true }, type: 'password' },
        },
        packagePolicyCount: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      mockCloudConnectorService.getById.mockResolvedValue(mockCloudConnector);
      mockPackagePolicyService.list.mockResolvedValue({
        items: [
          {
            id: 'policy-1',
            name: 'Policy Without Package',
            package: undefined,
            policy_ids: ['agent-policy-1'],
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-02T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        perPage: 10,
      } as any);

      const request = httpServerMock.createKibanaRequest({
        params: { cloudConnectorId: 'connector-123' },
        query: {},
      });

      await getCloudConnectorUsageHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          items: [
            {
              id: 'policy-1',
              name: 'Policy Without Package',
              package: undefined,
              policy_ids: ['agent-policy-1'],
              created_at: '2023-01-01T00:00:00.000Z',
              updated_at: '2023-01-02T00:00:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          perPage: 10,
        },
      });
    });
  });
});
