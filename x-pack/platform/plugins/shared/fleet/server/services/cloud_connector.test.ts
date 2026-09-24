/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { AuthenticatedUser, ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SINGLE_ACCOUNT,
  ORGANIZATION_ACCOUNT,
  SO_SEARCH_LIMIT,
} from '../../common/constants';
import {
  buildPackagePolicyFilterExcludingHiddenPackages,
  CLOUD_CONNECTOR_LIST_DEFAULT_PER_PAGE,
} from '../../common/constants/cloud_connector';

import { createSavedObjectClientMock } from '../mocks';
import { CloudConnectorRoleArnPropagationError, FleetUnauthorizedError } from '../errors';
import type {
  CreateCloudConnectorRequest,
  UpdateCloudConnectorRequest,
} from '../../common/types/rest_spec/cloud_connector';
import type {
  AwsCloudConnectorVars,
  CloudConnector,
  CloudConnectorSecretReference,
} from '../../common/types/models/cloud_connector';

import { CloudConnectorService } from './cloud_connector';
import { appContextService } from './app_context';
import { propagateRoleArnToPackagePolicies } from './cloud_connectors';

// Mock dependencies
jest.mock('./app_context');
jest.mock('./cloud_connectors', () => ({
  ...jest.requireActual('./cloud_connectors'),
  propagateRoleArnToPackagePolicies: jest.fn(),
}));

const mockAppContextService = appContextService;
const propagateRoleArnToPackagePoliciesMock = propagateRoleArnToPackagePolicies as jest.Mock;

describe('CloudConnectorService', () => {
  let service: CloudConnectorService;
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: jest.Mocked<ReturnType<typeof loggerMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockLogger = loggerMock.create();
    mockAppContextService.getLogger = jest.fn().mockReturnValue(mockLogger);
    mockAppContextService.getExperimentalFeatures = jest.fn().mockReturnValue({
      useSpaceAwareness: false,
    });
    const withLock = jest.fn((_lockId: string, callback: () => Promise<unknown>) => callback());
    mockAppContextService.getLockManagerService = jest.fn().mockReturnValue({ withLock });

    mockSoClient = createSavedObjectClientMock();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    service = new CloudConnectorService();
  });

  describe('create', () => {
    const mockCreateRequest: CreateCloudConnectorRequest = {
      name: 'test-connector',
      cloudProvider: 'aws',
      vars: {
        role_arn: {
          value: 'arn:aws:iam::123456789012:role/TestRole',
          type: 'text',
        },
        external_id: {
          value: {
            id: 'ABCDEFGHIJKLMNOPQRST',
            isSecretRef: true,
          },
          type: 'password',
        },
      },
    };

    const mockSavedObject = {
      id: 'cloud-connector-123',
      type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        name: 'test-connector',
        namespace: '*',
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          external_id: {
            value: {
              id: 'ABCDEFGHIJKLMNOPQRST',
              isSecretRef: true,
            },
            type: 'password',
          },
        },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      },
    };

    it('should create a cloud connector successfully with space awareness enabled', async () => {
      jest
        .spyOn(await import('./spaces/helpers'), 'isSpaceAwarenessEnabled')
        .mockResolvedValue(true);

      // Mock the find call for duplicate name checking
      mockSoClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 10000,
      });

      mockSoClient.create.mockResolvedValue(mockSavedObject);

      const result = await service.create(mockSoClient, mockCreateRequest);

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'test-connector',
          namespace: '*',
          cloudProvider: 'aws',
          created_at: expect.any(String),
          updated_at: expect.any(String),
          vars: expect.objectContaining({
            role_arn: expect.objectContaining({
              type: 'text',
              value: 'arn:aws:iam::123456789012:role/TestRole',
            }),
            external_id: expect.objectContaining({
              type: 'password',
              value: expect.objectContaining({
                id: 'ABCDEFGHIJKLMNOPQRST',
                isSecretRef: true,
              }),
            }),
          }),
        })
      );

      expect(result).toEqual({
        id: 'cloud-connector-123',
        name: 'test-connector',
        cloudProvider: 'aws',
        packagePolicyCount: 0,
        namespace: '*',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          external_id: {
            value: {
              id: 'ABCDEFGHIJKLMNOPQRST',
              isSecretRef: true,
            },
            type: 'password',
          },
        },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Creating cloud connector');
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully created cloud connector');
    });

    it('should create a cloud connector with accountType', async () => {
      jest
        .spyOn(await import('./spaces/helpers'), 'isSpaceAwarenessEnabled')
        .mockResolvedValue(true);

      const requestWithAccountType: CreateCloudConnectorRequest = {
        ...mockCreateRequest,
        accountType: SINGLE_ACCOUNT,
      };

      const savedObjectWithAccountType = {
        ...mockSavedObject,
        attributes: {
          ...mockSavedObject.attributes,
          accountType: SINGLE_ACCOUNT,
        },
      };

      mockSoClient.create.mockResolvedValue(savedObjectWithAccountType);

      const result = await service.create(mockSoClient, requestWithAccountType);

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          accountType: SINGLE_ACCOUNT,
        })
      );

      expect(result.accountType).toEqual(SINGLE_ACCOUNT);
    });

    it('persists iac_key and blueprint on confirm', async () => {
      mockSoClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 10000,
      });
      mockSoClient.create.mockResolvedValue({
        ...mockSavedObject,
        attributes: {
          ...mockSavedObject.attributes,
          iac_key: 'sha256:661cb7def1c7101f',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        },
      });

      await service.create(mockSoClient, {
        ...mockCreateRequest,
        iac_key: 'sha256:661cb7def1c7101f',
        iac_blueprint_id: 'federated-identity',
        iac_blueprint_version: '1.0.0',
      });

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          iac_key: 'sha256:661cb7def1c7101f',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        })
      );
    });

    it('stores no iac_key when confirm clears the digest', async () => {
      mockSoClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 10000,
      });
      mockSoClient.create.mockResolvedValue({
        ...mockSavedObject,
        attributes: {
          ...mockSavedObject.attributes,
          iac_key: null,
        },
      });

      await service.create(mockSoClient, {
        ...mockCreateRequest,
        iac_key: null,
      });

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          iac_key: null,
        })
      );
    });

    it('should create a cloud connector with organization accountType', async () => {
      jest
        .spyOn(await import('./spaces/helpers'), 'isSpaceAwarenessEnabled')
        .mockResolvedValue(true);

      const requestWithAccountType: CreateCloudConnectorRequest = {
        ...mockCreateRequest,
        accountType: ORGANIZATION_ACCOUNT,
      };

      const savedObjectWithAccountType = {
        ...mockSavedObject,
        attributes: {
          ...mockSavedObject.attributes,
          accountType: ORGANIZATION_ACCOUNT,
        },
      };

      mockSoClient.create.mockResolvedValue(savedObjectWithAccountType);

      const result = await service.create(mockSoClient, requestWithAccountType);

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          accountType: ORGANIZATION_ACCOUNT,
        })
      );

      expect(result.accountType).toEqual(ORGANIZATION_ACCOUNT);
    });

    it('should throw error when vars are empty', async () => {
      const emptyVarsRequest: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'aws',
        vars: {
          role_arn: { value: '', type: 'text' },
          external_id: { value: { id: '', isSecretRef: true }, type: 'password' },
        },
      };

      await expect(service.create(mockSoClient, emptyVarsRequest)).rejects.toThrow(
        /Package policy must contain role_arn variable/
      );
    });

    it('should throw error when saved object creation fails', async () => {
      const error = new Error('Database error');
      mockSoClient.create.mockRejectedValue(error);

      // Mock find for duplicate name check
      mockSoClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 10000,
      });

      await expect(service.create(mockSoClient, mockCreateRequest)).rejects.toThrow(
        'Database error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create cloud connector: Database error'
      );
    });

    it('should throw error when AWS role_arn is missing', async () => {
      const invalidRequest: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'aws',
        vars: {
          external_id: {
            value: {
              id: 'ABCDEFGHIJKLMNOPQRST',
              isSecretRef: true,
            },
            type: 'password',
          },
        } as any, // Intentionally invalid for testing validation
      };

      await expect(service.create(mockSoClient, invalidRequest)).rejects.toThrow(
        /Package policy must contain role_arn variable/
      );
    });

    it('should create successfully when AWS external_id is absent (identity federation without external ID)', async () => {
      const requestWithoutExternalId: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
        },
      };

      mockSoClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 10000,
      });
      mockSoClient.create.mockResolvedValue({
        ...mockSavedObject,
        attributes: {
          ...mockSavedObject.attributes,
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
          },
        },
      });

      const result = await service.create(mockSoClient, requestWithoutExternalId);

      expect(result.name).toBe('test-connector');
      const [soType, soAttributes] = mockSoClient.create.mock.calls[0];
      expect(soType).toBe(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE);
      expect(soAttributes).toEqual(
        expect.objectContaining({
          cloudProvider: 'aws',
        })
      );
      expect((soAttributes as any).vars.external_id).toBeUndefined();
    });

    describe('duplicate name validation', () => {
      it('should check for duplicate names using optimized query (SO_SEARCH_LIMIT and fields)', async () => {
        jest
          .spyOn(await import('./spaces/helpers'), 'isSpaceAwarenessEnabled')
          .mockResolvedValue(true);

        const existingConnectors = {
          saved_objects: [
            {
              id: 'existing-connector-1',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'existing-connector',
              },
            },
          ],
          total: 1,
          page: 1,
          per_page: 10000,
        };

        mockSoClient.find.mockResolvedValue(existingConnectors);
        mockSoClient.create.mockResolvedValue(mockSavedObject);

        await service.create(mockSoClient, mockCreateRequest);

        // Verify that getList was called with optimization parameters
        expect(mockSoClient.find).toHaveBeenCalledWith({
          type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          page: 1,
          perPage: 10000, // SO_SEARCH_LIMIT
          sortField: 'created_at',
          sortOrder: 'desc',
          fields: ['name'], // Only fetch name field
        });
      });

      it('should throw error when duplicate name exists (case-insensitive)', async () => {
        jest
          .spyOn(await import('./spaces/helpers'), 'isSpaceAwarenessEnabled')
          .mockResolvedValue(true);

        const existingConnectors = {
          saved_objects: [
            {
              id: 'existing-connector-1',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'Test-Connector', // Same name, different case
              },
            },
          ],
          total: 1,
          page: 1,
          per_page: 10000,
        };

        mockSoClient.find.mockResolvedValue(existingConnectors);

        await expect(service.create(mockSoClient, mockCreateRequest)).rejects.toThrow(
          'A cloud connector with this name already exists'
        );
      });

      it('should throw error when duplicate name exists with extra whitespace', async () => {
        jest
          .spyOn(await import('./spaces/helpers'), 'isSpaceAwarenessEnabled')
          .mockResolvedValue(true);

        const existingConnectors = {
          saved_objects: [
            {
              id: 'existing-connector-1',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: '  test-connector  ', // Same name with extra whitespace
              },
            },
          ],
          total: 1,
          page: 1,
          per_page: 10000,
        };

        mockSoClient.find.mockResolvedValue(existingConnectors);

        await expect(service.create(mockSoClient, mockCreateRequest)).rejects.toThrow(
          'A cloud connector with this name already exists'
        );
      });

      it('should allow creation when no duplicate names exist', async () => {
        jest
          .spyOn(await import('./spaces/helpers'), 'isSpaceAwarenessEnabled')
          .mockResolvedValue(true);

        const existingConnectors = {
          saved_objects: [
            {
              id: 'existing-connector-1',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'different-connector',
              },
            },
          ],
          total: 1,
          page: 1,
          per_page: 10000,
        };

        mockSoClient.find.mockResolvedValue(existingConnectors);
        mockSoClient.create.mockResolvedValue(mockSavedObject);

        const result = await service.create(mockSoClient, mockCreateRequest);

        expect(result).toBeDefined();
        expect(mockSoClient.create).toHaveBeenCalled();
      });

      it('should normalize connector name by trimming and collapsing spaces', async () => {
        jest
          .spyOn(await import('./spaces/helpers'), 'isSpaceAwarenessEnabled')
          .mockResolvedValue(true);

        const requestWithSpaces: CreateCloudConnectorRequest = {
          name: '  test   connector   with   spaces  ',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABCDEFGHIJKLMNOPQRST',
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        mockSoClient.find.mockResolvedValue({
          saved_objects: [],
          total: 0,
          page: 1,
          per_page: 10000,
        });
        mockSoClient.create.mockResolvedValue(mockSavedObject);

        await service.create(mockSoClient, requestWithSpaces);

        expect(mockSoClient.create).toHaveBeenCalledWith(
          CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            name: 'test connector with spaces', // Normalized name
          })
        );
      });

      it('should handle large number of existing connectors efficiently', async () => {
        jest
          .spyOn(await import('./spaces/helpers'), 'isSpaceAwarenessEnabled')
          .mockResolvedValue(true);

        // Simulate 500 existing connectors
        const existingConnectors = {
          saved_objects: Array.from({ length: 500 }, (_, i) => ({
            id: `connector-${i}`,
            type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
            score: 1,
            references: [],
            attributes: {
              name: `connector-${i}`,
            },
          })),
          total: 500,
          page: 1,
          per_page: 10000,
        };

        mockSoClient.find.mockResolvedValue(existingConnectors);
        mockSoClient.create.mockResolvedValue(mockSavedObject);

        await service.create(mockSoClient, mockCreateRequest);

        // Verify optimization: only one call to find with SO_SEARCH_LIMIT and fields
        expect(mockSoClient.find).toHaveBeenCalledTimes(1);
        expect(mockSoClient.find).toHaveBeenCalledWith(
          expect.objectContaining({
            perPage: 10000,
            fields: ['name'],
          })
        );
      });
    });
  });

  describe('getList', () => {
    const mockCloudConnectors = {
      saved_objects: [
        {
          id: 'cloud-connector-1',
          type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          score: 1,
          references: [],
          attributes: {
            name: 'connector-1',
            cloudProvider: 'aws',
            namespace: '*',
            vars: {
              role_arn: {
                value: 'arn:aws:iam::123456789012:role/Role1',
                type: 'text',
              },
              external_id: {
                value: {
                  id: 'secret-1',
                  isSecretRef: true,
                },
                type: 'password',
              },
            },
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        },
      ],
      total: 1,
      page: 1,
      per_page: CLOUD_CONNECTOR_LIST_DEFAULT_PER_PAGE,
    };

    // Mock package policy aggregation (getPackagePolicyCountsMap uses terms agg on cloud_connector_id)
    const mockPackagePolicies = {
      saved_objects: [],
      total: 1,
      page: 1,
      per_page: 0,
      aggregations: {
        count_by_cloud_connector: {
          buckets: [{ key: 'cloud-connector-1', doc_count: 1 }],
        },
      },
    };

    it('should get cloud connectors list successfully with computed packagePolicyCount', async () => {
      // Mock find to return different results based on the type
      mockSoClient.find.mockImplementation((options: any) => {
        if (options.type === CLOUD_CONNECTOR_SAVED_OBJECT_TYPE) {
          return Promise.resolve(mockCloudConnectors);
        }
        // Package policies query for computing count
        return Promise.resolve(mockPackagePolicies);
      });

      const result = await service.getList(mockSoClient);

      expect(mockSoClient.find).toHaveBeenCalledWith({
        type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        page: 1,
        perPage: CLOUD_CONNECTOR_LIST_DEFAULT_PER_PAGE,
        sortField: 'created_at',
        sortOrder: 'desc',
      });

      expect(mockSoClient.find).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          filter: buildPackagePolicyFilterExcludingHiddenPackages(
            `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:*`
          ),
          perPage: 0,
          aggs: {
            count_by_cloud_connector: {
              terms: {
                field: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id`,
                size: SO_SEARCH_LIMIT,
              },
            },
          },
        })
      );

      expect(result).toEqual([
        {
          id: 'cloud-connector-1',
          name: 'connector-1',
          cloudProvider: 'aws',
          namespace: '*',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/Role1',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'secret-1',
                isSecretRef: true,
              },
              type: 'password',
            },
          },
          packagePolicyCount: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ]);

      expect(mockLogger.debug).toHaveBeenCalledWith('Getting cloud connectors list');
      expect(mockLogger.debug).toHaveBeenCalledWith('Successfully retrieved cloud connectors list');
    });

    it('should get cloud connectors list with accountType', async () => {
      const mockCloudConnectorsWithAccountType = {
        ...mockCloudConnectors,
        saved_objects: [
          {
            ...mockCloudConnectors.saved_objects[0],
            attributes: {
              ...mockCloudConnectors.saved_objects[0].attributes,
              accountType: SINGLE_ACCOUNT,
            },
          },
        ],
      };

      mockSoClient.find.mockImplementation((options: any) => {
        if (options.type === CLOUD_CONNECTOR_SAVED_OBJECT_TYPE) {
          return Promise.resolve(mockCloudConnectorsWithAccountType);
        }
        return Promise.resolve(mockPackagePolicies);
      });

      const result = await service.getList(mockSoClient);

      expect(result[0].accountType).toEqual(SINGLE_ACCOUNT);
    });

    it('should throw error when find operation fails', async () => {
      const error = new Error('Database error');
      mockSoClient.find.mockRejectedValue(error);

      await expect(service.getList(mockSoClient)).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get cloud connectors list',
        'Database error'
      );
    });

    it('should support fields parameter to only fetch specific fields', async () => {
      const mockConnectorsWithFields = {
        saved_objects: [
          {
            id: 'cloud-connector-1',
            type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
            score: 1,
            references: [],
            attributes: {
              name: 'connector-1',
            },
          },
          {
            id: 'cloud-connector-2',
            type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
            score: 1,
            references: [],
            attributes: {
              name: 'connector-2',
            },
          },
        ],
        total: 2,
        page: 1,
        per_page: CLOUD_CONNECTOR_LIST_DEFAULT_PER_PAGE,
      };

      mockSoClient.find.mockResolvedValue(mockConnectorsWithFields);

      const result = await service.getList(mockSoClient, { fields: ['name'] });

      expect(mockSoClient.find).toHaveBeenCalledWith({
        type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        page: 1,
        perPage: CLOUD_CONNECTOR_LIST_DEFAULT_PER_PAGE,
        sortField: 'created_at',
        sortOrder: 'desc',
        fields: ['name'],
      });

      expect(result).toEqual([
        {
          id: 'cloud-connector-1',
          name: 'connector-1',
        },
        {
          id: 'cloud-connector-2',
          name: 'connector-2',
        },
      ]);
    });

    it('should support custom perPage parameter for fetching all connectors', async () => {
      const mockManyConnectors = {
        saved_objects: Array.from({ length: 100 }, (_, i) => ({
          id: `cloud-connector-${i}`,
          type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          score: 1,
          references: [],
          attributes: {
            name: `connector-${i}`,
            cloudProvider: 'aws',
            namespace: '*',
            vars: {
              role_arn: {
                value: `arn:aws:iam::123456789012:role/Role${i}`,
                type: 'text',
              },
              external_id: {
                value: {
                  id: `secret-${i}`,
                  isSecretRef: true,
                },
                type: 'password',
              },
            },
            packagePolicyCount: 1,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        })),
        total: 100,
        page: 1,
        per_page: 10000,
      };

      mockSoClient.find.mockResolvedValue(mockManyConnectors);

      await service.getList(mockSoClient, { perPage: 10000 });

      expect(mockSoClient.find).toHaveBeenCalledWith({
        type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        page: 1,
        perPage: 10000,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    it('should support combining fields and perPage parameters', async () => {
      const mockConnectorsOptimized = {
        saved_objects: [
          {
            id: 'cloud-connector-1',
            type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
            score: 1,
            references: [],
            attributes: {
              name: 'connector-1',
            },
          },
        ],
        total: 1,
        page: 1,
        per_page: 10000,
      };

      mockSoClient.find.mockResolvedValue(mockConnectorsOptimized);

      await service.getList(mockSoClient, { perPage: 10000, fields: ['name'] });

      expect(mockSoClient.find).toHaveBeenCalledWith({
        type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        page: 1,
        perPage: 10000,
        sortField: 'created_at',
        sortOrder: 'desc',
        fields: ['name'],
      });
    });
  });

  describe('isSharedWithOtherSpaces', () => {
    const connectorIn = (namespaces: string[] | undefined) =>
      ({
        id: 'cc-1',
        namespaces,
        attributes: { name: 'Test', cloudProvider: 'aws' },
      } as SavedObject);

    it.each([
      [['default'], false],
      [undefined, false],
      [['default', 'space-b'], true],
      [['*'], true],
    ])('returns %p -> %p', async (namespaces, expected) => {
      mockSoClient.get.mockResolvedValue(connectorIn(namespaces));

      await expect(service.isSharedWithOtherSpaces(mockSoClient, 'cc-1')).resolves.toBe(expected);
      expect(mockSoClient.get).toHaveBeenCalledWith(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, 'cc-1');
    });
  });

  describe('getById', () => {
    const mockSavedObject = {
      id: 'cloud-connector-123',
      type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        name: 'test-connector',
        namespace: '*',
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          external_id: {
            value: {
              id: 'ABCDEFGHIJKLMNOPQRST',
              isSecretRef: true,
            },
            type: 'password',
          },
        },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T01:00:00.000Z',
      },
    };

    // Mock package policies for computing count
    const mockPackagePolicies = {
      saved_objects: [
        {
          id: 'pp-1',
          type: 'ingest-package-policies',
          score: 1,
          references: [],
          attributes: { cloud_connector_id: 'cloud-connector-123' },
        },
        {
          id: 'pp-2',
          type: 'ingest-package-policies',
          score: 1,
          references: [],
          attributes: { cloud_connector_id: 'cloud-connector-123' },
        },
      ],
      total: 2,
      page: 1,
      per_page: 0,
    };

    it('should get cloud connector by id successfully with computed packagePolicyCount', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);
      mockSoClient.find.mockResolvedValue(mockPackagePolicies);

      const result = await service.getById(mockSoClient, 'cloud-connector-123');

      expect(mockSoClient.get).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123'
      );

      expect(result).toEqual({
        id: 'cloud-connector-123',
        name: 'test-connector',
        namespace: '*',
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          external_id: {
            value: {
              id: 'ABCDEFGHIJKLMNOPQRST',
              isSecretRef: true,
            },
            type: 'password',
          },
        },
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T01:00:00.000Z',
      });
    });

    it('should throw error when cloud connector is not found', async () => {
      const error = new Error('Saved object [cloud-connector/non-existent-id] not found');
      mockSoClient.get.mockRejectedValue(error);

      await expect(service.getById(mockSoClient, 'non-existent-id')).rejects.toThrow(
        'Failed to get cloud connector: Saved object [cloud-connector/non-existent-id] not found'
      );

      expect(mockSoClient.get).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'non-existent-id'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get cloud connector',
        'Saved object [cloud-connector/non-existent-id] not found'
      );
    });

    it('should log info messages correctly', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);
      mockSoClient.find.mockResolvedValue(mockPackagePolicies);

      await service.getById(mockSoClient, 'cloud-connector-123');

      expect(mockLogger.info).toHaveBeenCalledWith('Getting cloud connector cloud-connector-123');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully retrieved cloud connector cloud-connector-123'
      );
    });

    it('should handle cloud connector with minimal data and zero package policies', async () => {
      const minimalSavedObject = {
        ...mockSavedObject,
        attributes: {
          name: 'minimal-connector',
          namespace: 'default',
          cloudProvider: 'aws',
          vars: {},
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      };

      const noPackagePolicies = {
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 0,
      };

      mockSoClient.get.mockResolvedValue(minimalSavedObject);
      mockSoClient.find.mockResolvedValue(noPackagePolicies);

      const result = await service.getById(mockSoClient, 'cloud-connector-123');

      expect(result).toEqual({
        id: 'cloud-connector-123',
        name: 'minimal-connector',
        namespace: 'default',
        cloudProvider: 'aws',
        vars: {},
        packagePolicyCount: 0,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      });
    });
  });

  describe('update', () => {
    const mockExistingSavedObject = {
      id: 'cloud-connector-123',
      type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        name: 'original-name',
        namespace: '*',
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/OriginalRole',
            type: 'text',
          },
          external_id: {
            value: {
              id: 'ORIGINALEXTERNALID12', // 20 chars
              isSecretRef: true,
            },
            type: 'password',
          },
        },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      },
    };

    // Mock package policies for computing count
    const mockPackagePoliciesForUpdate = {
      saved_objects: [
        {
          id: 'pp-1',
          type: 'ingest-package-policies',
          score: 1,
          references: [],
          attributes: { cloud_connector_id: 'cloud-connector-123' },
        },
      ],
      total: 1,
      page: 1,
      per_page: 0,
    };

    it('should update cloud connector name successfully', async () => {
      const mockUpdatedSavedObject = {
        ...mockExistingSavedObject,
        attributes: {
          ...mockExistingSavedObject.attributes,
          name: 'updated-name',
          updated_at: '2023-01-01T02:00:00.000Z',
        },
      };

      mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
      mockSoClient.update.mockResolvedValue(mockUpdatedSavedObject);
      mockSoClient.find.mockResolvedValue(mockPackagePoliciesForUpdate);

      const result = await service.update(mockSoClient, 'cloud-connector-123', {
        name: 'updated-name',
      });

      expect(mockSoClient.get).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123'
      );

      expect(mockSoClient.update).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123',
        {
          name: 'updated-name',
          updated_at: expect.any(String),
        }
      );

      expect(result.name).toEqual('updated-name');
      expect(result.id).toEqual('cloud-connector-123');

      const awsVarsFromNameUpdate = result.vars as AwsCloudConnectorVars;
      expect(awsVarsFromNameUpdate.role_arn?.value).toEqual(
        'arn:aws:iam::123456789012:role/OriginalRole'
      );
    });

    it('clears iac_key when confirm sends a null digest', async () => {
      mockSoClient.get.mockResolvedValue({
        ...mockExistingSavedObject,
        attributes: {
          ...mockExistingSavedObject.attributes,
          iac_key: 'sha256:old',
        },
      });
      mockSoClient.update.mockResolvedValue({
        ...mockExistingSavedObject,
        attributes: {
          ...mockExistingSavedObject.attributes,
          iac_key: null,
        },
      });
      mockSoClient.find.mockResolvedValue(mockPackagePoliciesForUpdate);

      await service.update(mockSoClient, 'cloud-connector-123', {
        iac_key: null,
      });

      expect(mockSoClient.update).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123',
        expect.objectContaining({
          iac_key: null,
        })
      );
    });

    it('should keep original vars after a name-only update', async () => {
      const mockUpdatedSavedObject = {
        ...mockExistingSavedObject,
        attributes: {
          ...mockExistingSavedObject.attributes,
          name: 'updated-name',
          updated_at: '2023-01-01T02:00:00.000Z',
        },
      };

      mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
      mockSoClient.update.mockResolvedValue(mockUpdatedSavedObject);
      mockSoClient.find.mockResolvedValue(mockPackagePoliciesForUpdate);

      const result = await service.update(mockSoClient, 'cloud-connector-123', {
        name: 'updated-name',
      });

      expect(result.name).toEqual('updated-name');
      expect(result.id).toEqual('cloud-connector-123');
      const awsVars = result.vars as AwsCloudConnectorVars;
      expect(awsVars.role_arn?.value).toEqual('arn:aws:iam::123456789012:role/OriginalRole');
      const externalId1 = awsVars.external_id?.value as CloudConnectorSecretReference;
      expect(externalId1.id).toEqual('ORIGINALEXTERNALID12');
    });

    it('should update cloud connector vars successfully', async () => {
      const validVars = {
        role_arn: {
          value: 'arn:aws:iam::123456789012:role/UpdatedRole',
          type: 'text' as const,
        },
        external_id: {
          value: {
            id: 'UPDATEDEXTERNALID123', // 20 chars
            isSecretRef: true,
          },
          type: 'password' as const,
        },
      };

      const mockUpdatedWithVars = {
        ...mockExistingSavedObject,
        attributes: {
          ...mockExistingSavedObject.attributes,
          vars: validVars,
          updated_at: '2023-01-01T02:00:00.000Z',
        },
      };

      mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
      mockSoClient.update.mockResolvedValue(mockUpdatedWithVars);

      const result = await service.update(
        mockSoClient,
        'cloud-connector-123',
        {
          vars: validVars,
        },
        { esClient: mockEsClient }
      );

      expect(mockSoClient.update).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123',
        {
          vars: validVars,
          updated_at: expect.any(String),
          verification_status: 'pending',
          verification_started_at: null,
          verification_failed_at: null,
        }
      );

      const awsVars = result.vars as AwsCloudConnectorVars;
      expect(awsVars.role_arn?.value).toEqual('arn:aws:iam::123456789012:role/UpdatedRole');
      const externalId2 = awsVars.external_id?.value as CloudConnectorSecretReference;
      expect(externalId2.id).toEqual('UPDATEDEXTERNALID123');
    });

    it('should update both name and vars successfully', async () => {
      const validVars = {
        role_arn: {
          value: 'arn:aws:iam::123456789012:role/FullyUpdatedRole',
          type: 'text' as const,
        },
        external_id: {
          value: {
            id: 'FULLYUPDATEDID123456', // 20 chars
            isSecretRef: true,
          },
          type: 'password' as const,
        },
      };

      const mockFullyUpdated = {
        ...mockExistingSavedObject,
        attributes: {
          ...mockExistingSavedObject.attributes,
          name: 'fully-updated-connector',
          vars: validVars,
          updated_at: '2023-01-01T02:00:00.000Z',
        },
      };

      mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
      mockSoClient.update.mockResolvedValue(mockFullyUpdated);

      const result = await service.update(
        mockSoClient,
        'cloud-connector-123',
        {
          name: 'fully-updated-connector',
          vars: validVars,
        },
        { esClient: mockEsClient }
      );

      expect(result.name).toEqual('fully-updated-connector');
      const awsVars = result.vars as AwsCloudConnectorVars;
      expect(awsVars.role_arn?.value).toEqual('arn:aws:iam::123456789012:role/FullyUpdatedRole');
    });

    it('should validate vars when provided', async () => {
      mockSoClient.get.mockResolvedValue(mockExistingSavedObject);

      const invalidVars = {
        role_arn: {
          value: 'arn:aws:iam::123456789012:role/ValidRole',
          type: 'text' as const,
        },
        external_id: {
          value: {
            id: 'TOOSHORT', // Invalid: only 8 chars instead of 20
            isSecretRef: true,
          },
          type: 'password' as const,
        },
      };

      await expect(
        service.update(mockSoClient, 'cloud-connector-123', {
          vars: invalidVars,
        })
      ).rejects.toThrow('External ID secret reference is not valid');

      expect(mockSoClient.update).not.toHaveBeenCalled();
    });

    it('should allow updating vars with role_arn only (identity federation without external ID)', async () => {
      mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
      mockSoClient.update.mockResolvedValue(mockExistingSavedObject);

      const varsWithoutExternalId = {
        role_arn: {
          value: 'arn:aws:iam::123456789012:role/ValidRole',
          type: 'text' as const,
        },
      };

      await expect(
        service.update(
          mockSoClient,
          'cloud-connector-123',
          {
            vars: varsWithoutExternalId,
          },
          { esClient: mockEsClient }
        )
      ).resolves.toBeDefined();

      expect(mockSoClient.update).toHaveBeenCalled();
    });

    describe('AWS role_arn change', () => {
      const connectorId = 'cc-1';
      const oldArn = 'arn:aws:iam::123456789012:role/Old';
      const newArn = 'arn:aws:iam::123456789012:role/New';

      beforeEach(() => {
        mockSoClient.get.mockResolvedValue({
          id: connectorId,
          version: 'Wz-cc-version',
          attributes: {
            name: 'Test',
            namespace: '*',
            cloudProvider: 'aws',
            vars: { role_arn: { type: 'text', value: oldArn } },
            verification_status: 'success',
            verification_started_at: '2026-09-01T00:00:00Z',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        } as SavedObject);
        mockSoClient.update.mockResolvedValue({
          id: connectorId,
          type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {},
        });
      });

      it('calls propagateRoleArnToPackagePolicies when role_arn actually changes', async () => {
        await service.update(
          mockSoClient,
          connectorId,
          { vars: { role_arn: { type: 'text', value: newArn } } },
          { esClient: mockEsClient }
        );

        expect(propagateRoleArnToPackagePoliciesMock).toHaveBeenCalledWith(
          expect.objectContaining({
            soClient: mockSoClient,
            connectorId,
            newRoleArn: newArn,
          })
        );
        expect(mockAppContextService.getLockManagerService).toHaveBeenCalled();
        const { withLock } = (mockAppContextService.getLockManagerService as jest.Mock).mock
          .results[0].value;
        expect(withLock).toHaveBeenCalledWith(
          `fleet-cloud-connector-role-arn-${connectorId}`,
          expect.any(Function)
        );
      });

      it('does not fan out when the connector already stores this Role ARN once the lock is held', async () => {
        mockSoClient.get
          .mockResolvedValueOnce({
            id: connectorId,
            version: 'Wz-cc-version',
            attributes: {
              name: 'Test',
              namespace: '*',
              cloudProvider: 'aws',
              vars: { role_arn: { type: 'text', value: oldArn } },
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          } as SavedObject)
          .mockResolvedValueOnce({
            id: connectorId,
            version: 'Wz-already',
            attributes: {
              name: 'Test',
              namespace: '*',
              cloudProvider: 'aws',
              vars: { role_arn: { type: 'text', value: newArn } },
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          } as SavedObject);

        await service.update(
          mockSoClient,
          connectorId,
          { vars: { role_arn: { type: 'text', value: newArn } } },
          { esClient: mockEsClient }
        );

        expect(propagateRoleArnToPackagePoliciesMock).not.toHaveBeenCalled();
        expect(mockSoClient.update).toHaveBeenCalledWith(
          CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          connectorId,
          expect.not.objectContaining({ verification_status: 'pending' }),
          { version: 'Wz-already' }
        );
      });

      it('keeps the stored Role ARN instead of fanning out when asked to keep it', async () => {
        const externalId = {
          type: 'password',
          value: { id: 'EXTERNALID1234567890', isSecretRef: true },
        } as const;

        await service.update(
          mockSoClient,
          connectorId,
          { vars: { role_arn: { type: 'text', value: newArn }, external_id: externalId } },
          { esClient: mockEsClient, keepStoredRoleArn: true }
        );

        expect(propagateRoleArnToPackagePoliciesMock).not.toHaveBeenCalled();
        expect(mockAppContextService.getLockManagerService).not.toHaveBeenCalled();
        expect(mockSoClient.update).toHaveBeenCalledWith(
          CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          connectorId,
          expect.objectContaining({
            vars: { role_arn: { type: 'text', value: oldArn }, external_id: externalId },
          }),
          { version: 'Wz-cc-version' }
        );
        expect(mockSoClient.update.mock.calls[0][2]).not.toHaveProperty('verification_status');
      });

      describe('permission verifier', () => {
        let runSoon: jest.Mock;

        beforeEach(() => {
          runSoon = jest.fn().mockResolvedValue({ id: 'fleet:verify_permissions:1.0.0' });
          mockAppContextService.getTaskManagerStart = jest.fn().mockReturnValue({ runSoon });
          mockAppContextService.getExperimentalFeatures = jest.fn().mockReturnValue({
            useSpaceAwareness: false,
            enableOTelVerifier: true,
          });
        });

        const updateRoleArn = (roleArn: string) =>
          service.update(
            mockSoClient,
            connectorId,
            { vars: { role_arn: { type: 'text', value: roleArn } } },
            { esClient: mockEsClient }
          );

        it('asks the verifier to run soon once the new Role ARN is saved', async () => {
          await updateRoleArn(newArn);

          expect(runSoon).toHaveBeenCalledWith('fleet:verify_permissions:1.0.0');
        });

        it('does not ask the verifier to run when the Role ARN did not change', async () => {
          await updateRoleArn(oldArn);

          expect(runSoon).not.toHaveBeenCalled();
        });

        it('does not ask the verifier to run when the connector write fails', async () => {
          mockSoClient.update.mockRejectedValueOnce(new Error('connector write failed'));

          await expect(updateRoleArn(newArn)).rejects.toThrow();
          expect(runSoon).not.toHaveBeenCalled();
        });

        it('does not ask the verifier to run when it is disabled', async () => {
          mockAppContextService.getExperimentalFeatures = jest.fn().mockReturnValue({
            useSpaceAwareness: false,
            enableOTelVerifier: false,
          });

          await updateRoleArn(newArn);

          expect(runSoon).not.toHaveBeenCalled();
        });

        it('still saves the Role ARN when the verifier cannot be scheduled', async () => {
          runSoon.mockRejectedValue(new Error('task is already running'));

          await expect(updateRoleArn(newArn)).resolves.toBeDefined();
        });
      });

      it('fans out and writes the connector only while holding the connector lock', async () => {
        let holdingLock = false;
        const heldDuring: Record<string, boolean> = {};
        mockAppContextService.getLockManagerService = jest.fn().mockReturnValue({
          withLock: jest.fn(async (_lockId: string, callback: () => Promise<unknown>) => {
            holdingLock = true;
            try {
              return await callback();
            } finally {
              holdingLock = false;
            }
          }),
        });
        propagateRoleArnToPackagePoliciesMock.mockImplementationOnce(async () => {
          heldDuring.fanOut = holdingLock;
          return undefined;
        });
        mockSoClient.update.mockImplementationOnce(async () => {
          heldDuring.connectorWrite = holdingLock;
          return {
            id: connectorId,
            type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
            references: [],
            attributes: {},
          };
        });

        await service.update(
          mockSoClient,
          connectorId,
          { vars: { role_arn: { type: 'text', value: newArn } } },
          { esClient: mockEsClient }
        );

        expect(heldDuring).toEqual({ fanOut: true, connectorWrite: true });
      });

      it('merges a role-only payload into the vars read once the lock is held', async () => {
        const connectorWithSecret = (secretId: string, version: string) =>
          ({
            id: connectorId,
            version,
            attributes: {
              name: 'Test',
              namespace: '*',
              cloudProvider: 'aws',
              vars: {
                role_arn: { type: 'text', value: oldArn },
                external_id: { type: 'password', value: { isSecretRef: true, id: secretId } },
              },
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          } as SavedObject);
        mockSoClient.get
          .mockResolvedValueOnce(connectorWithSecret('secret-retired', 'Wz-opening'))
          .mockResolvedValueOnce(connectorWithSecret('secret-rotated', 'Wz-locked'));

        await service.update(
          mockSoClient,
          connectorId,
          { vars: { role_arn: { type: 'text', value: newArn } } },
          { esClient: mockEsClient }
        );

        expect(mockSoClient.update).toHaveBeenCalledWith(
          CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          connectorId,
          expect.objectContaining({
            vars: {
              role_arn: { type: 'text', value: newArn },
              external_id: { type: 'password', value: { isSecretRef: true, id: 'secret-rotated' } },
            },
          }),
          { version: 'Wz-locked' }
        );
      });

      it('passes the connector OCC version on the post-fan-out write', async () => {
        await service.update(
          mockSoClient,
          connectorId,
          { vars: { role_arn: { type: 'text', value: newArn } } },
          { esClient: mockEsClient }
        );

        expect(mockSoClient.update).toHaveBeenCalledWith(
          CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          connectorId,
          expect.objectContaining({
            verification_status: 'pending',
          }),
          { version: 'Wz-cc-version' }
        );
      });

      it('forwards the request user into the role ARN fan-out', async () => {
        const user = { username: 'sean' } as AuthenticatedUser;

        await service.update(
          mockSoClient,
          connectorId,
          { vars: { role_arn: { type: 'text', value: newArn } } },
          { esClient: mockEsClient, user }
        );

        expect(propagateRoleArnToPackagePoliciesMock).toHaveBeenCalledWith(
          expect.objectContaining({ user })
        );
      });

      it('rolls back policies when the connector write conflicts (OCC)', async () => {
        const rollback = { policyCount: 1, revert: jest.fn().mockResolvedValue(undefined) };
        propagateRoleArnToPackagePoliciesMock.mockResolvedValueOnce(rollback);
        mockSoClient.update.mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createConflictError(
            CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
            connectorId
          )
        );

        const caught = await service
          .update(
            mockSoClient,
            connectorId,
            { vars: { role_arn: { type: 'text', value: newArn } } },
            { esClient: mockEsClient }
          )
          .then(
            () => new Error('Expected the update to reject'),
            (err: Error) => err
          );

        expect(SavedObjectsErrorHelpers.isConflictError(caught)).toBe(true);
        expect(rollback.revert).toHaveBeenCalledTimes(1);
      });

      it('does not roll back when the conflicting write already stored this role ARN', async () => {
        const rollback = { policyCount: 1, revert: jest.fn().mockResolvedValue(undefined) };
        propagateRoleArnToPackagePoliciesMock.mockResolvedValueOnce(rollback);
        mockSoClient.get
          .mockResolvedValueOnce({
            id: connectorId,
            version: 'Wz-cc-version',
            attributes: {
              name: 'Test',
              namespace: '*',
              cloudProvider: 'aws',
              vars: { role_arn: { type: 'text', value: oldArn } },
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          } as SavedObject)
          .mockResolvedValueOnce({
            id: connectorId,
            version: 'Wz-winner',
            attributes: {
              name: 'Test',
              namespace: '*',
              cloudProvider: 'aws',
              vars: { role_arn: { type: 'text', value: newArn } },
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          } as SavedObject);
        mockSoClient.update.mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createConflictError(
            CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
            connectorId
          )
        );

        const caught = await service
          .update(
            mockSoClient,
            connectorId,
            { vars: { role_arn: { type: 'text', value: newArn } } },
            { esClient: mockEsClient }
          )
          .then(
            () => new Error('Expected the update to reject'),
            (err: Error) => err
          );

        expect(SavedObjectsErrorHelpers.isConflictError(caught)).toBe(true);
        expect(rollback.revert).not.toHaveBeenCalled();
      });

      it('rejects a Role ARN change without integration-policy write and does not fan out', async () => {
        await expect(
          service.update(
            mockSoClient,
            connectorId,
            { vars: { role_arn: { type: 'text', value: newArn } } },
            { esClient: mockEsClient, canWriteIntegrationPolicies: false }
          )
        ).rejects.toThrow(/write integration policies/);

        expect(propagateRoleArnToPackagePoliciesMock).not.toHaveBeenCalled();
        expect(mockSoClient.update).not.toHaveBeenCalled();
      });

      it('still allows a connector-only edit without integration-policy write', async () => {
        await service.update(
          mockSoClient,
          connectorId,
          { name: 'renamed' },
          { esClient: mockEsClient, canWriteIntegrationPolicies: false }
        );

        expect(propagateRoleArnToPackagePoliciesMock).not.toHaveBeenCalled();
        expect(mockSoClient.update).toHaveBeenCalled();
      });

      it('is a no-op when the incoming role_arn equals the stored one', async () => {
        await service.update(
          mockSoClient,
          connectorId,
          { vars: { role_arn: { type: 'text', value: oldArn } } },
          { esClient: mockEsClient }
        );

        expect(propagateRoleArnToPackagePoliciesMock).not.toHaveBeenCalled();
      });

      describe('connector shared across spaces', () => {
        const request = {} as KibanaRequest;
        let atSpaces: jest.Mock;
        const otherSpaceClient = createSavedObjectClientMock();

        const shareConnector = (namespaces: string[]) => {
          mockSoClient.get.mockResolvedValue({
            id: connectorId,
            version: 'Wz-cc-version',
            namespaces,
            attributes: {
              name: 'Test',
              namespace: '*',
              cloudProvider: 'aws',
              vars: { role_arn: { type: 'text', value: oldArn } },
              verification_status: 'success',
              verification_started_at: '2026-09-01T00:00:00Z',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          } as SavedObject);
        };

        beforeEach(() => {
          propagateRoleArnToPackagePoliciesMock.mockReset();
          atSpaces = jest.fn().mockResolvedValue({ hasAllRequested: true });
          mockAppContextService.getSecurity = jest.fn().mockReturnValue({
            authz: {
              checkPrivilegesWithRequest: jest.fn().mockReturnValue({ atSpaces }),
              actions: { api: { get: (privilege: string) => `api:${privilege}` } },
            },
          });
          mockSoClient.getCurrentNamespace.mockReturnValue('default');
          mockSoClient.asScopedToNamespace.mockReturnValue(otherSpaceClient);
          shareConnector(['default', 'space-b']);
        });

        const updateSharedRole = (
          options: {
            listSpaces?: () => Promise<Array<{ id: string }>>;
            includeRequest?: boolean;
          } = {}
        ) =>
          service.update(
            mockSoClient,
            connectorId,
            { vars: { role_arn: { type: 'text', value: newArn } } },
            {
              esClient: mockEsClient,
              ...(options.includeRequest === false ? {} : { request }),
              listSpaces: options.listSpaces,
            }
          );

        it('refuses the Role ARN change when the caller cannot write integration policies in every space', async () => {
          atSpaces.mockResolvedValue({ hasAllRequested: false });

          await expect(updateSharedRole()).rejects.toThrow(FleetUnauthorizedError);
          await expect(updateSharedRole()).rejects.toThrow(
            'This identity is shared with other spaces. You need permission to write integration policies in each of them before its Role ARN can change.'
          );

          expect(atSpaces).toHaveBeenCalledWith(['default', 'space-b'], {
            kibana: ['api:fleet-agent-policies-all', 'api:integrations-all'],
          });
          expect(propagateRoleArnToPackagePoliciesMock).not.toHaveBeenCalled();
          expect(mockSoClient.update).not.toHaveBeenCalled();
        });

        it('refuses the Role ARN change when the request is missing, so other spaces cannot be authorized', async () => {
          await expect(updateSharedRole({ includeRequest: false })).rejects.toThrow(
            FleetUnauthorizedError
          );

          expect(atSpaces).not.toHaveBeenCalled();
          expect(propagateRoleArnToPackagePoliciesMock).not.toHaveBeenCalled();
        });

        it('fans the Role ARN out to each space once the caller is authorized in all of them', async () => {
          await updateSharedRole();

          expect(propagateRoleArnToPackagePoliciesMock).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ soClient: mockSoClient, newRoleArn: newArn })
          );
          expect(mockSoClient.asScopedToNamespace).toHaveBeenCalledWith('space-b');
          expect(propagateRoleArnToPackagePoliciesMock).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ soClient: otherSpaceClient, newRoleArn: newArn })
          );
          expect(mockSoClient.update).toHaveBeenCalled();
        });

        it('reverts every space when the connector write fails after the fan-out', async () => {
          const currentRollback = {
            policyCount: 1,
            revert: jest.fn().mockResolvedValue(undefined),
          };
          const otherRollback = { policyCount: 2, revert: jest.fn().mockResolvedValue(undefined) };
          propagateRoleArnToPackagePoliciesMock
            .mockResolvedValueOnce(currentRollback)
            .mockResolvedValueOnce(otherRollback);
          mockSoClient.update.mockRejectedValueOnce(new Error('connector write failed'));

          await expect(updateSharedRole()).rejects.toThrow('connector write failed');

          expect(currentRollback.revert).toHaveBeenCalledTimes(1);
          expect(otherRollback.revert).toHaveBeenCalledTimes(1);
        });

        it('reverts every space and reports each failure when an earlier space cannot be reverted after the connector write fails', async () => {
          const currentRollback = {
            policyCount: 1,
            revert: jest.fn().mockRejectedValue(
              new CloudConnectorRoleArnPropagationError('current revert failed', {
                updateFailed: [],
                revertFailed: ['p1'],
                bumpFailed: false,
              })
            ),
          };
          const otherRollback = {
            policyCount: 1,
            revert: jest.fn().mockRejectedValue(
              new CloudConnectorRoleArnPropagationError('other revert failed', {
                updateFailed: [],
                revertFailed: ['p2'],
                bumpFailed: true,
              })
            ),
          };
          propagateRoleArnToPackagePoliciesMock
            .mockResolvedValueOnce(currentRollback)
            .mockResolvedValueOnce(otherRollback);
          mockSoClient.update.mockRejectedValueOnce(new Error('connector write failed'));

          await expect(updateSharedRole()).rejects.toMatchObject({
            detail: { updateFailed: [], revertFailed: ['p1', 'p2'], bumpFailed: true },
          });
          expect(currentRollback.revert).toHaveBeenCalledTimes(1);
          expect(otherRollback.revert).toHaveBeenCalledTimes(1);
        });

        it('reverts spaces already updated when a later space fails', async () => {
          const rollback = { policyCount: 1, revert: jest.fn().mockResolvedValue(undefined) };
          propagateRoleArnToPackagePoliciesMock
            .mockResolvedValueOnce(rollback)
            .mockRejectedValueOnce(
              new CloudConnectorRoleArnPropagationError('space-b failed', {
                updateFailed: ['p2'],
                revertFailed: [],
                bumpFailed: false,
              })
            );

          await expect(updateSharedRole()).rejects.toThrow(CloudConnectorRoleArnPropagationError);

          expect(rollback.revert).toHaveBeenCalledTimes(1);
          expect(mockSoClient.update).not.toHaveBeenCalled();
        });

        it('includes the earlier space when its revert fails after a later space fails', async () => {
          const rollback = {
            policyCount: 1,
            revert: jest.fn().mockRejectedValue(
              new CloudConnectorRoleArnPropagationError('revert failed', {
                updateFailed: [],
                revertFailed: ['p1'],
                bumpFailed: false,
              })
            ),
          };
          propagateRoleArnToPackagePoliciesMock
            .mockResolvedValueOnce(rollback)
            .mockRejectedValueOnce(
              new CloudConnectorRoleArnPropagationError('space-b failed', {
                updateFailed: ['p2'],
                revertFailed: [],
                bumpFailed: false,
              })
            );

          await expect(updateSharedRole()).rejects.toMatchObject({
            detail: { updateFailed: ['p2'], revertFailed: ['p1'] },
          });
          expect(mockSoClient.update).not.toHaveBeenCalled();
        });

        it("keeps the later space's revert and bump failures when reverting an earlier space also fails", async () => {
          const rollback = {
            policyCount: 1,
            revert: jest.fn().mockRejectedValue(
              new CloudConnectorRoleArnPropagationError('revert failed', {
                updateFailed: [],
                revertFailed: ['p1'],
                bumpFailed: false,
              })
            ),
          };
          propagateRoleArnToPackagePoliciesMock
            .mockResolvedValueOnce(rollback)
            .mockRejectedValueOnce(
              new CloudConnectorRoleArnPropagationError('space-b failed', {
                updateFailed: ['p2'],
                revertFailed: ['p3'],
                bumpFailed: true,
              })
            );

          await expect(updateSharedRole()).rejects.toMatchObject({
            detail: { updateFailed: ['p2'], revertFailed: ['p3', 'p1'], bumpFailed: true },
          });
          expect(mockSoClient.update).not.toHaveBeenCalled();
        });

        it('refuses a connector shared with all spaces unless the caller holds the privileges in all spaces', async () => {
          shareConnector(['*']);
          atSpaces.mockResolvedValue({ hasAllRequested: false });
          const listSpaces = jest.fn().mockResolvedValue([{ id: 'default' }, { id: 'space-b' }]);

          await expect(updateSharedRole({ listSpaces })).rejects.toThrow(FleetUnauthorizedError);

          expect(atSpaces).toHaveBeenCalledWith(['*'], {
            kibana: ['api:fleet-agent-policies-all', 'api:integrations-all'],
          });
          expect(listSpaces).not.toHaveBeenCalled();
          expect(propagateRoleArnToPackagePoliciesMock).not.toHaveBeenCalled();
          expect(mockSoClient.update).not.toHaveBeenCalled();
        });

        it('fans out to every space when the caller holds the privileges in all spaces', async () => {
          shareConnector(['*']);
          const listSpaces = jest
            .fn()
            .mockResolvedValue([{ id: 'default' }, { id: 'space-b' }, { id: 'space-c' }]);
          const spaceCClient = createSavedObjectClientMock();
          mockSoClient.asScopedToNamespace.mockImplementation((spaceId: string) =>
            spaceId === 'space-c' ? spaceCClient : otherSpaceClient
          );

          await updateSharedRole({ listSpaces });

          expect(atSpaces).toHaveBeenCalledTimes(1);
          expect(atSpaces).toHaveBeenCalledWith(['*'], {
            kibana: ['api:fleet-agent-policies-all', 'api:integrations-all'],
          });
          expect(propagateRoleArnToPackagePoliciesMock).toHaveBeenCalledTimes(3);
          expect(mockSoClient.asScopedToNamespace).toHaveBeenCalledWith('space-b');
          expect(mockSoClient.asScopedToNamespace).toHaveBeenCalledWith('space-c');
        });

        it('authorizes and fans out to the spaces the connector is in once the lock is held', async () => {
          const connectorIn = (namespaces: string[]) =>
            ({
              id: connectorId,
              version: 'Wz-cc-version',
              namespaces,
              attributes: {
                name: 'Test',
                namespace: '*',
                cloudProvider: 'aws',
                vars: { role_arn: { type: 'text', value: oldArn } },
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
              },
            } as SavedObject);
          mockSoClient.get
            .mockResolvedValueOnce(connectorIn(['default']))
            .mockResolvedValueOnce(connectorIn(['default', 'space-b']));

          await updateSharedRole();

          expect(atSpaces).toHaveBeenCalledWith(['default', 'space-b'], {
            kibana: ['api:fleet-agent-policies-all', 'api:integrations-all'],
          });
          expect(mockSoClient.asScopedToNamespace).toHaveBeenCalledWith('space-b');
          expect(propagateRoleArnToPackagePoliciesMock).toHaveBeenCalledTimes(2);
        });

        it('does not authorize other spaces when the connector lives in only the current one', async () => {
          shareConnector(['default']);

          await updateSharedRole();

          expect(mockAppContextService.getSecurity).not.toHaveBeenCalled();
          expect(propagateRoleArnToPackagePoliciesMock).toHaveBeenCalledTimes(1);
          expect(propagateRoleArnToPackagePoliciesMock).toHaveBeenCalledWith(
            expect.objectContaining({ soClient: mockSoClient })
          );
        });
      });

      it('resets verification fields when role_arn changes', async () => {
        await service.update(
          mockSoClient,
          connectorId,
          { vars: { role_arn: { type: 'text', value: newArn } } },
          { esClient: mockEsClient }
        );

        expect(mockSoClient.update).toHaveBeenCalledWith(
          CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          connectorId,
          expect.objectContaining({
            verification_status: 'pending',
            verification_started_at: null,
            verification_failed_at: null,
          }),
          { version: 'Wz-cc-version' }
        );
      });

      // `external_id` is a Fleet secret reference that only lives on the connector; nothing
      // re-derives it. Role ARN edits merge server-side so a role-only payload cannot orphan it.
      describe('vars replacement', () => {
        const externalId = {
          type: 'password' as const,
          value: { id: 'EXTERNALID1234567890', isSecretRef: true },
        };

        beforeEach(() => {
          mockSoClient.get.mockResolvedValue({
            id: connectorId,
            attributes: {
              name: 'Test',
              namespace: '*',
              cloudProvider: 'aws',
              vars: { role_arn: { type: 'text', value: oldArn }, external_id: externalId },
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          } as SavedObject);
        });

        it('keeps external_id when the caller sends the merged vars', async () => {
          await service.update(
            mockSoClient,
            connectorId,
            { vars: { role_arn: { type: 'text', value: newArn }, external_id: externalId } },
            { esClient: mockEsClient }
          );

          expect(mockSoClient.update).toHaveBeenCalledWith(
            CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
            connectorId,
            expect.objectContaining({
              vars: { role_arn: { type: 'text', value: newArn }, external_id: externalId },
            })
          );
        });

        it('merges a role-only payload when the ARN is unchanged so external_id is preserved', async () => {
          await service.update(
            mockSoClient,
            connectorId,
            { vars: { role_arn: { type: 'text', value: oldArn } } },
            { esClient: mockEsClient }
          );

          expect(propagateRoleArnToPackagePoliciesMock).not.toHaveBeenCalled();
          expect(mockSoClient.update).toHaveBeenCalledWith(
            CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
            connectorId,
            expect.objectContaining({
              vars: { role_arn: { type: 'text', value: oldArn }, external_id: externalId },
            })
          );
        });

        it('merges existing vars on a role-only update so external_id is preserved', async () => {
          // A partial `{ vars: { role_arn } }` must not orphan the Fleet secret behind external_id.
          await service.update(
            mockSoClient,
            connectorId,
            { vars: { role_arn: { type: 'text', value: newArn } } },
            { esClient: mockEsClient }
          );

          expect(mockSoClient.update).toHaveBeenCalledWith(
            CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
            connectorId,
            expect.objectContaining({
              vars: { role_arn: { type: 'text', value: newArn }, external_id: externalId },
            })
          );
        });
      });

      it('reverts policies when the connector write fails after successful fan-out', async () => {
        const rollback = { policyCount: 1, revert: jest.fn().mockResolvedValue(undefined) };
        propagateRoleArnToPackagePoliciesMock.mockResolvedValueOnce(rollback);
        mockSoClient.update.mockRejectedValueOnce(new Error('write-failed'));

        await expect(
          service.update(
            mockSoClient,
            connectorId,
            { vars: { role_arn: { type: 'text', value: newArn } } },
            { esClient: mockEsClient }
          )
        ).rejects.toThrow('write-failed');

        expect(propagateRoleArnToPackagePoliciesMock).toHaveBeenCalledTimes(1);
        expect(rollback.revert).toHaveBeenCalledTimes(1);
      });

      it('surfaces updateFailed/revertFailed when post-write rollback itself fails', async () => {
        const rollbackError = new CloudConnectorRoleArnPropagationError(
          'Failed to update role ARN on 1 package policy',
          { updateFailed: [], revertFailed: ['policy-stuck'], bumpFailed: false }
        );
        const rollback = { policyCount: 1, revert: jest.fn().mockRejectedValue(rollbackError) };
        propagateRoleArnToPackagePoliciesMock.mockResolvedValueOnce(rollback);
        mockSoClient.update.mockRejectedValueOnce(new Error('write-failed'));

        const caught = await service
          .update(
            mockSoClient,
            connectorId,
            { vars: { role_arn: { type: 'text', value: newArn } } },
            { esClient: mockEsClient }
          )
          .then(
            () => new Error('Expected the update to reject'),
            (err: Error) => err
          );

        expect(caught).toBeInstanceOf(CloudConnectorRoleArnPropagationError);
        const propagationError = caught as CloudConnectorRoleArnPropagationError;
        expect(propagationError.detail).toEqual({
          updateFailed: [],
          revertFailed: ['policy-stuck'],
          bumpFailed: false,
        });
        expect(propagationError.message).toMatch(/write-failed/i);
        expect(propagationError.message).toMatch(
          /policy-stuck|Failed to update role ARN|roll back/i
        );
      });

      it('throws when a role ARN change is requested without an esClient', async () => {
        await expect(
          service.update(mockSoClient, connectorId, {
            vars: { role_arn: { type: 'text', value: newArn } },
          })
        ).rejects.toThrow(/missing esClient/i);
      });

      it('rejects an invalid ARN before any fan-out', async () => {
        await expect(
          service.update(
            mockSoClient,
            connectorId,
            { vars: { role_arn: { type: 'text', value: 'not-an-arn' } } },
            { esClient: mockEsClient }
          )
        ).rejects.toThrow(/valid IAM role ARN/);

        expect(propagateRoleArnToPackagePoliciesMock).not.toHaveBeenCalled();
      });
    });

    it('should throw error when cloud connector not found', async () => {
      const error = new Error('Saved object not found');
      mockSoClient.get.mockRejectedValue(error);

      await expect(
        service.update(mockSoClient, 'non-existent-id', { name: 'test' })
      ).rejects.toThrow('Failed to update cloud connector: Saved object not found');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update cloud connector: Saved object not found'
      );
    });

    it('should log info messages correctly', async () => {
      const mockUpdatedSavedObject = {
        ...mockExistingSavedObject,
        attributes: {
          ...mockExistingSavedObject.attributes,
          name: 'updated-name',
          updated_at: '2023-01-01T02:00:00.000Z',
        },
      };

      mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
      mockSoClient.update.mockResolvedValue(mockUpdatedSavedObject);

      await service.update(mockSoClient, 'cloud-connector-123', { name: 'updated-name' });

      expect(mockLogger.info).toHaveBeenCalledWith('Updating cloud connector cloud-connector-123');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully updated cloud connector cloud-connector-123'
      );
    });

    it('should handle empty update object', async () => {
      mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
      mockSoClient.update.mockResolvedValue({
        ...mockExistingSavedObject,
        attributes: {
          ...mockExistingSavedObject.attributes,
          updated_at: '2023-01-01T02:00:00.000Z',
        },
      });

      const result = await service.update(mockSoClient, 'cloud-connector-123', {});

      expect(mockSoClient.update).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123',
        {
          updated_at: expect.any(String),
        }
      );

      // Should preserve original attributes
      expect(result.name).toEqual('original-name');
    });

    it('should update cloud connector accountType successfully', async () => {
      const mockUpdatedSavedObject = {
        ...mockExistingSavedObject,
        attributes: {
          ...mockExistingSavedObject.attributes,
          accountType: ORGANIZATION_ACCOUNT,
          updated_at: '2023-01-01T02:00:00.000Z',
        },
      };

      mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
      mockSoClient.update.mockResolvedValue(mockUpdatedSavedObject);

      const result = await service.update(mockSoClient, 'cloud-connector-123', {
        accountType: ORGANIZATION_ACCOUNT,
      });

      expect(mockSoClient.update).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123',
        {
          accountType: ORGANIZATION_ACCOUNT,
          updated_at: expect.any(String),
        }
      );

      expect(result.accountType).toEqual(ORGANIZATION_ACCOUNT);
      expect(result.id).toEqual('cloud-connector-123');
    });

    describe('duplicate name validation', () => {
      it('should use optimized query when checking for duplicate names during update', async () => {
        const existingConnectors = {
          saved_objects: [
            {
              id: 'cloud-connector-123',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'original-name',
              },
            },
            {
              id: 'other-connector',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'other-connector-name',
              },
            },
          ],
          total: 2,
          page: 1,
          per_page: 10000,
        };

        mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
        mockSoClient.find.mockResolvedValue(existingConnectors);
        mockSoClient.update.mockResolvedValue({
          ...mockExistingSavedObject,
          attributes: {
            ...mockExistingSavedObject.attributes,
            name: 'new-unique-name',
          },
        });

        await service.update(mockSoClient, 'cloud-connector-123', {
          name: 'new-unique-name',
        });

        // Verify optimization: SO_SEARCH_LIMIT and fields parameter
        expect(mockSoClient.find).toHaveBeenCalledWith({
          type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          page: 1,
          perPage: 10000, // SO_SEARCH_LIMIT
          sortField: 'created_at',
          sortOrder: 'desc',
          fields: ['name'], // Only fetch name field
        });
      });

      it('should allow updating to the same name (current connector)', async () => {
        const existingConnectors = {
          saved_objects: [
            {
              id: 'cloud-connector-123',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'original-name',
              },
            },
          ],
          total: 1,
          page: 1,
          per_page: 10000,
        };

        mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
        mockSoClient.find.mockResolvedValue(existingConnectors);
        mockSoClient.update.mockResolvedValue(mockExistingSavedObject);

        // Should not throw error when updating to same name
        const result = await service.update(mockSoClient, 'cloud-connector-123', {
          name: 'original-name',
        });

        expect(result).toBeDefined();
        expect(mockSoClient.update).toHaveBeenCalled();
      });

      it('should throw error when updating to a name that already exists on a different connector', async () => {
        const existingConnectors = {
          saved_objects: [
            {
              id: 'cloud-connector-123',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'original-name',
              },
            },
            {
              id: 'other-connector',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'existing-name',
              },
            },
          ],
          total: 2,
          page: 1,
          per_page: 10000,
        };

        mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
        mockSoClient.find.mockResolvedValue(existingConnectors);

        await expect(
          service.update(mockSoClient, 'cloud-connector-123', {
            name: 'existing-name',
          })
        ).rejects.toThrow('A cloud connector with this name already exists');
      });

      it('should throw error when updating to a name that exists (case-insensitive)', async () => {
        const existingConnectors = {
          saved_objects: [
            {
              id: 'cloud-connector-123',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'original-name',
              },
            },
            {
              id: 'other-connector',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'Existing-Name',
              },
            },
          ],
          total: 2,
          page: 1,
          per_page: 10000,
        };

        mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
        mockSoClient.find.mockResolvedValue(existingConnectors);

        await expect(
          service.update(mockSoClient, 'cloud-connector-123', {
            name: 'existing-name', // Different case
          })
        ).rejects.toThrow('A cloud connector with this name already exists');
      });

      it('should normalize name during update', async () => {
        const existingConnectors = {
          saved_objects: [
            {
              id: 'cloud-connector-123',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'original-name',
              },
            },
          ],
          total: 1,
          page: 1,
          per_page: 10000,
        };

        mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
        mockSoClient.find.mockResolvedValue(existingConnectors);
        mockSoClient.update.mockResolvedValue({
          ...mockExistingSavedObject,
          attributes: {
            ...mockExistingSavedObject.attributes,
            name: 'new name with spaces',
          },
        });

        await service.update(mockSoClient, 'cloud-connector-123', {
          name: '  new   name   with    spaces  ',
        });

        expect(mockSoClient.update).toHaveBeenCalledWith(
          CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          'cloud-connector-123',
          expect.objectContaining({
            name: 'new name with spaces', // Normalized
          })
        );
      });

      it('should exclude current connector ID from duplicate check', async () => {
        const existingConnectors = {
          saved_objects: [
            {
              id: 'cloud-connector-123',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'Updated Name',
              },
            },
            {
              id: 'other-connector',
              type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
              score: 1,
              references: [],
              attributes: {
                name: 'other-name',
              },
            },
          ],
          total: 2,
          page: 1,
          per_page: 10000,
        };

        mockSoClient.get.mockResolvedValue(mockExistingSavedObject);
        mockSoClient.find.mockResolvedValue(existingConnectors);
        mockSoClient.update.mockResolvedValue({
          ...mockExistingSavedObject,
          attributes: {
            ...mockExistingSavedObject.attributes,
            name: 'updated name',
          },
        });

        // Should succeed because cloud-connector-123 is excluded from duplicate check
        const result = await service.update(mockSoClient, 'cloud-connector-123', {
          name: 'updated name', // Matches the name in the mock but for the same ID
        });

        expect(result).toBeDefined();
        expect(mockSoClient.update).toHaveBeenCalled();
      });
    });
  });

  describe('delete', () => {
    const mockSavedObject = {
      id: 'cloud-connector-123',
      type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        name: 'test-connector',
        namespace: '*',
        cloudProvider: 'aws',
        vars: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T01:00:00.000Z',
      },
    };

    const mockNoPackagePolicies = {
      saved_objects: [],
      total: 0,
      page: 1,
      per_page: 0,
    };

    const mockPackagePoliciesWithCount = {
      saved_objects: [
        {
          id: 'pp-1',
          type: 'ingest-package-policies',
          score: 1,
          references: [],
          attributes: { cloud_connector_id: 'cloud-connector-123' },
        },
        {
          id: 'pp-2',
          type: 'ingest-package-policies',
          score: 1,
          references: [],
          attributes: { cloud_connector_id: 'cloud-connector-123' },
        },
        {
          id: 'pp-3',
          type: 'ingest-package-policies',
          score: 1,
          references: [],
          attributes: { cloud_connector_id: 'cloud-connector-123' },
        },
      ],
      total: 3,
      page: 1,
      per_page: 0,
    };

    it('should delete cloud connector successfully when no package policies use it', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);
      mockSoClient.find.mockResolvedValue(mockNoPackagePolicies);
      mockSoClient.delete.mockResolvedValue({});

      const result = await service.delete(mockSoClient, mockEsClient, 'cloud-connector-123');

      expect(mockSoClient.get).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123'
      );
      expect(mockSoClient.delete).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123'
      );
      expect(result).toEqual({ id: 'cloud-connector-123' });
    });

    it('should throw error when package policies exist and force is false', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);
      mockSoClient.find.mockResolvedValue(mockPackagePoliciesWithCount);

      await expect(
        service.delete(mockSoClient, mockEsClient, 'cloud-connector-123', false)
      ).rejects.toThrow(
        'Cannot delete cloud connector "test-connector" as it is being used by 3 package policies'
      );

      expect(mockSoClient.delete).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Cannot delete cloud connector "test-connector" as it is being used by 3 package policies'
      );
    });

    it('should delete successfully when package policies exist and force is true', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);
      mockSoClient.find.mockResolvedValue(mockPackagePoliciesWithCount);
      mockSoClient.delete.mockResolvedValue({});

      const result = await service.delete(mockSoClient, mockEsClient, 'cloud-connector-123', true);

      expect(mockSoClient.delete).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123'
      );
      expect(result).toEqual({ id: 'cloud-connector-123' });
    });

    it('should log warning when force deleting connector with package policies', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);
      mockSoClient.find.mockResolvedValue(mockPackagePoliciesWithCount);
      mockSoClient.delete.mockResolvedValue({});

      await service.delete(mockSoClient, mockEsClient, 'cloud-connector-123', true);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Force deleting cloud connector "test-connector" which is still being used by 3 package policies'
      );
    });

    it('should not log warning when force deleting connector with no package policies', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);
      mockSoClient.find.mockResolvedValue(mockNoPackagePolicies);
      mockSoClient.delete.mockResolvedValue({});

      await service.delete(mockSoClient, mockEsClient, 'cloud-connector-123', true);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should default force parameter to false when not provided', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);
      mockSoClient.find.mockResolvedValue(mockPackagePoliciesWithCount);

      await expect(
        service.delete(mockSoClient, mockEsClient, 'cloud-connector-123')
      ).rejects.toThrow(
        'Cannot delete cloud connector "test-connector" as it is being used by 3 package policies'
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Deleting cloud connector cloud-connector-123 (force: false)'
      );
    });

    it('should throw error when cloud connector not found', async () => {
      const error = new Error('Saved object not found');
      mockSoClient.get.mockRejectedValue(error);

      await expect(service.delete(mockSoClient, mockEsClient, 'non-existent-id')).rejects.toThrow(
        'Failed to delete cloud connector: Saved object not found'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete cloud connector',
        'Saved object not found'
      );
    });

    it('should log info messages correctly', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);
      mockSoClient.find.mockResolvedValue(mockNoPackagePolicies);
      mockSoClient.delete.mockResolvedValue({});

      await service.delete(mockSoClient, mockEsClient, 'cloud-connector-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Deleting cloud connector cloud-connector-123 (force: false)'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully deleted cloud connector cloud-connector-123'
      );
    });

    it('should re-throw CloudConnectorDeleteError as-is', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);
      mockSoClient.find.mockResolvedValue(mockPackagePoliciesWithCount);

      await expect(
        service.delete(mockSoClient, mockEsClient, 'cloud-connector-123')
      ).rejects.toThrow(
        'Cannot delete cloud connector "test-connector" as it is being used by 3 package policies'
      );
    });

    it('should handle saved object delete failure', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);
      mockSoClient.find.mockResolvedValue(mockNoPackagePolicies);
      const deleteError = new Error('Database delete failed');
      mockSoClient.delete.mockRejectedValue(deleteError);

      await expect(
        service.delete(mockSoClient, mockEsClient, 'cloud-connector-123')
      ).rejects.toThrow('Failed to delete cloud connector: Database delete failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete cloud connector',
        'Database delete failed'
      );
    });
  });

  describe('validateCloudConnectorDetails', () => {
    describe('AWS validation', () => {
      it('should validate successfully with valid AWS variables', () => {
        const validRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABCDEFGHIJKLMNOPQRST',
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(validRequest)).not.toThrow();
      });

      it('should throw error when role_arn is missing', () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            external_id: {
              value: {
                id: 'ABCDEFGHIJKLMNOPQRST',
                isSecretRef: true,
              },
              type: 'password',
            },
          } as any, // Intentionally invalid for testing validation
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidRequest)).toThrow(
          'Package policy must contain role_arn variable'
        );
      });

      it('should throw error when role_arn value is empty', () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: '',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABCDEFGHIJKLMNOPQRST',
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidRequest)).toThrow(
          'Package policy must contain role_arn variable'
        );
      });

      it('should validate successfully when external_id is absent (identity federation without external ID)', () => {
        const validRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(validRequest)).not.toThrow();
      });

      it('should throw error when external_id value is missing', () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              type: 'password',
            } as any,
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidRequest)).toThrow(
          'Package policy must contain valid external_id secret reference'
        );
      });

      it('should throw error when external_id has invalid format - too short', () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABC123', // Too short (6 characters)
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidRequest)).toThrow(
          'External ID secret reference is not valid'
        );
      });

      it('should throw error when external_id has invalid format - too long', () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456', // Too long (30 characters)
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidRequest)).toThrow(
          'External ID secret reference is not valid'
        );
      });

      it('should throw error when external_id has invalid format - contains special characters', () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABC123DEF456GHI789!@#', // Contains special characters
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidRequest)).toThrow(
          'External ID secret reference is not valid'
        );
      });

      it('should throw error when external_id has invalid format - contains spaces', () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABC 123 DEF 456 GHI', // Contains spaces
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidRequest)).toThrow(
          'External ID secret reference is not valid'
        );
      });

      it('should validate successfully with valid external_id format - 20 alphanumeric characters', () => {
        const validRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABCDEFGHIJKLMNOPQRST', // 20 characters, alphanumeric
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(validRequest)).not.toThrow();
      });

      it('should validate successfully with valid external_id format - numbers only', () => {
        const validRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: '12345678901234567890', // 20 digits
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(validRequest)).not.toThrow();
      });

      it('should validate successfully with valid external_id format - mixed case', () => {
        const validRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'aBcDeFgHiJkLmNoPqRsT', // Mixed case, 20 characters
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(validRequest)).not.toThrow();
      });

      it('should validate successfully with valid external_id format - underscores and hyphens', () => {
        const validRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: '0BrW7JgB-08CS_HiWrOR', // 20 characters with underscores and hyphens
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(validRequest)).not.toThrow();
      });
    });

    describe('Unsupported cloud provider', () => {
      it('should throw error for unsupported cloud provider', () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'azure' as any,
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABCDEFGHIJKLMNOPQRST',
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidRequest)).toThrow(
          'tenant_id must be a valid secret reference'
        );
      });

      it('should throw error for unknown cloud provider', () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'unknown' as any,
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
            external_id: {
              value: {
                id: 'ABCDEFGHIJKLMNOPQRST',
                isSecretRef: true,
              },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidRequest)).toThrow(
          'Unsupported cloud provider: unknown'
        );
      });
    });
  });

  describe('CloudConnectorService - Azure support', () => {
    describe('create', () => {
      it('should create Azure cloud connector with valid vars', async () => {
        const azureRequest: CreateCloudConnectorRequest = {
          name: 'azure-test-connector',
          cloudProvider: 'azure',
          vars: {
            tenant_id: { value: { id: 'secret-tenant-id', isSecretRef: true }, type: 'password' },
            client_id: { value: { id: 'secret-client-id', isSecretRef: true }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'secret-cc-id',
              type: 'text',
            },
          },
        };

        const mockSavedObject = {
          id: 'cloud-connector-123',
          attributes: {
            name: 'azure-test-connector',
            namespace: '*',
            cloudProvider: 'azure',
            vars: azureRequest.vars,
            packagePolicyCount: 0,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        } as unknown as SavedObject<CloudConnector>;

        // Mock the find call for duplicate name checking
        mockSoClient.find.mockResolvedValue({
          saved_objects: [],
          total: 0,
          page: 1,
          per_page: 10000,
        });

        mockSoClient.create.mockResolvedValue(mockSavedObject);

        const result = await service.create(mockSoClient, azureRequest);

        expect(mockSoClient.create).toHaveBeenCalledTimes(1);
        const [[type, createCall]] = mockSoClient.create.mock.calls;
        expect(type).toBe(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE);
        expect(createCall).toMatchObject({
          name: 'azure-test-connector',
          cloudProvider: 'azure',
          namespace: '*',
          vars: azureRequest.vars,
        });
        expect((createCall as any).created_at).toBeDefined();
        expect((createCall as any).updated_at).toBeDefined();

        expect(result).toEqual({
          id: 'cloud-connector-123',
          name: 'azure-test-connector',
          namespace: '*',
          cloudProvider: 'azure',
          vars: azureRequest.vars,
          packagePolicyCount: 0,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        });
      });

      it('should use name as name for Azure connectors', async () => {
        const azureRequest: CreateCloudConnectorRequest = {
          name: 'actual-connector-name',
          cloudProvider: 'azure',
          vars: {
            tenant_id: { value: { id: 'secret-tenant-id', isSecretRef: true }, type: 'password' },
            client_id: { value: { id: 'secret-client-id', isSecretRef: true }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'actual-connector-name',
              type: 'text',
            },
          },
        };

        const mockSavedObject = {
          id: 'cloud-connector-123',
          attributes: {
            name: 'actual-connector-name',
            namespace: '*',
            cloudProvider: 'azure',
            vars: azureRequest.vars,
            packagePolicyCount: 1,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        } as unknown as SavedObject<CloudConnector>;

        mockSoClient.create.mockResolvedValue(mockSavedObject);

        await service.create(mockSoClient, azureRequest);

        expect(mockSoClient.create).toHaveBeenCalledTimes(1);
        const [[type, createCall]] = mockSoClient.create.mock.calls;
        expect(type).toBe(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE);
        expect(createCall).toMatchObject({
          name: 'actual-connector-name', // Should use azure_credentials_cloud_connector_id.value
          cloudProvider: 'azure',
          namespace: '*',
          vars: azureRequest.vars,
        });
        expect((createCall as any).created_at).toBeDefined();
        expect((createCall as any).updated_at).toBeDefined();
      });

      it('should throw error for Azure connector with missing tenant_id', async () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'azure-test-connector',
          cloudProvider: 'azure',
          vars: {
            client_id: { value: { id: 'secret-client-id', isSecretRef: true }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'secret-cc-id',
              type: 'text',
            },
          } as any,
        };

        await expect(service.create(mockSoClient, invalidRequest)).rejects.toThrow(
          'tenant_id must be a valid secret reference'
        );
      });

      it('should throw error for Azure connector with invalid secret reference', async () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'azure-test-connector',
          cloudProvider: 'azure',
          vars: {
            tenant_id: { value: 'plain-string-not-secret', type: 'text' },
            client_id: { value: { id: 'secret-client-id', isSecretRef: true }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'secret-cc-id',
              type: 'text',
            },
          } as any,
        };

        await expect(service.create(mockSoClient, invalidRequest)).rejects.toThrow(
          'tenant_id must be a valid secret reference'
        );
      });
    });

    describe('update', () => {
      it('should update Azure cloud connector vars', async () => {
        const existingConnector = {
          id: 'cloud-connector-123',
          attributes: {
            name: 'existing-azure-connector',
            namespace: '*',
            cloudProvider: 'azure',
            vars: {
              tenant_id: { value: { id: 'old-tenant-id', isSecretRef: true }, type: 'password' },
              client_id: { value: { id: 'old-client-id', isSecretRef: true }, type: 'password' },
              azure_credentials_cloud_connector_id: {
                value: 'old-cc-id',
                type: 'text',
              },
            },
            packagePolicyCount: 1,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        } as unknown as SavedObject<CloudConnector>;

        const updateRequest = {
          vars: {
            tenant_id: { value: { id: 'new-tenant-id', isSecretRef: true }, type: 'password' },
            client_id: { value: { id: 'new-client-id', isSecretRef: true }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'new-cc-id',
              type: 'text',
            },
          },
        } as Partial<UpdateCloudConnectorRequest>;

        const updatedConnector = {
          ...existingConnector,
          attributes: {
            ...existingConnector.attributes,
            vars: updateRequest.vars,
            updated_at: '2023-01-02T00:00:00.000Z',
          },
        };

        mockSoClient.get.mockResolvedValue(existingConnector);
        mockSoClient.update.mockResolvedValue(updatedConnector);

        const result = await service.update(mockSoClient, 'cloud-connector-123', updateRequest);

        expect(mockSoClient.update).toHaveBeenCalledWith(
          CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          'cloud-connector-123',
          expect.objectContaining({
            vars: updateRequest.vars,
            updated_at: expect.any(String),
          })
        );

        expect(result.vars).toEqual(updateRequest.vars);
      });

      it('should validate Azure vars on update', async () => {
        const existingConnector = {
          id: 'cloud-connector-123',
          attributes: {
            name: 'existing-azure-connector',
            namespace: '*',
            cloudProvider: 'azure',
            vars: {
              tenant_id: { value: { id: 'old-tenant-id', isSecretRef: true }, type: 'password' },
              client_id: { value: { id: 'old-client-id', isSecretRef: true }, type: 'password' },
              azure_credentials_cloud_connector_id: {
                value: 'old-cc-id',
                type: 'text',
              },
            },
            packagePolicyCount: 1,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        } as unknown as SavedObject<CloudConnector>;

        const invalidUpdateRequest = {
          vars: {
            tenant_id: { value: 'plain-string-not-secret', type: 'text' },
            client_id: { value: { id: 'secret-client-id', isSecretRef: true }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'secret-cc-id',
              type: 'text',
            },
          } as any,
        };

        mockSoClient.get.mockResolvedValue(existingConnector);

        await expect(
          service.update(mockSoClient, 'cloud-connector-123', invalidUpdateRequest)
        ).rejects.toThrow('tenant_id must be a valid secret reference');
      });
    });

    describe('validateCloudConnectorDetails', () => {
      it('should validate Azure connector requires all three fields', () => {
        const validAzureRequest: CreateCloudConnectorRequest = {
          name: 'azure-test-connector',
          cloudProvider: 'azure',
          vars: {
            tenant_id: { value: { id: 'secret-tenant-id', isSecretRef: true }, type: 'password' },
            client_id: { value: { id: 'secret-client-id', isSecretRef: true }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'secret-cc-id',
              type: 'text',
            },
          },
        };

        expect(() =>
          (service as any).validateCloudConnectorDetails(validAzureRequest)
        ).not.toThrow();
      });

      it('should validate Azure fields are secret references', () => {
        const invalidAzureRequest: CreateCloudConnectorRequest = {
          name: 'azure-test-connector',
          cloudProvider: 'azure',
          vars: {
            tenant_id: { value: 'plain-string', type: 'text' },
            client_id: { value: { id: 'secret-client-id', isSecretRef: true }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'secret-cc-id',
              type: 'text',
            },
          } as any,
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidAzureRequest)).toThrow(
          'tenant_id must be a valid secret reference'
        );
      });

      it('should validate Azure connector with missing client_id', () => {
        const invalidAzureRequest: CreateCloudConnectorRequest = {
          name: 'azure-test-connector',
          cloudProvider: 'azure',
          vars: {
            tenant_id: { value: { id: 'secret-tenant-id', isSecretRef: true }, type: 'password' },
            azure_credentials_cloud_connector_id: {
              value: 'secret-cc-id',
              type: 'text',
            },
          } as any,
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidAzureRequest)).toThrow(
          'client_id must be a valid secret reference'
        );
      });

      it('should validate Azure connector with missing azure_credentials_cloud_connector_id', () => {
        const invalidAzureRequest: CreateCloudConnectorRequest = {
          name: 'azure-test-connector',
          cloudProvider: 'azure',
          vars: {
            tenant_id: { value: { id: 'secret-tenant-id', isSecretRef: true }, type: 'password' },
            client_id: { value: { id: 'secret-client-id', isSecretRef: true }, type: 'password' },
          } as any,
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidAzureRequest)).toThrow(
          'azure_credentials_cloud_connector_id must be a valid string'
        );
      });
    });
  });

  describe('CloudConnectorService - GCP support', () => {
    describe('create', () => {
      it('should create GCP cloud connector with valid vars', async () => {
        const gcpRequest: CreateCloudConnectorRequest = {
          name: 'gcp-test-connector',
          cloudProvider: 'gcp',
          vars: {
            service_account: {
              value: 'test-service-account@project.iam.gserviceaccount.com',
              type: 'text',
            },
            audience: {
              value:
                '//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider',
              type: 'text',
            },
            gcp_credentials_cloud_connector_id: {
              value: { isSecretRef: true, id: 'gcp-connector-id' },
              type: 'password',
            },
          },
        };

        const mockSavedObject = {
          id: 'cloud-connector-123',
          type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            name: 'gcp-test-connector',
            namespace: '*',
            cloudProvider: 'gcp',
            vars: gcpRequest.vars,
            packagePolicyCount: 0,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        } as unknown as SavedObject<CloudConnector>;

        // Mock the find call for duplicate name checking
        mockSoClient.find.mockResolvedValue({
          saved_objects: [],
          total: 0,
          page: 1,
          per_page: 10000,
        });

        mockSoClient.create.mockResolvedValue(mockSavedObject);

        const result = await service.create(mockSoClient, gcpRequest);

        expect(mockSoClient.create).toHaveBeenCalledTimes(1);
        const [[type, createCall]] = mockSoClient.create.mock.calls;
        expect(type).toBe(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE);
        expect(createCall).toMatchObject({
          name: 'gcp-test-connector',
          cloudProvider: 'gcp',
          namespace: '*',
          vars: gcpRequest.vars,
        });
        expect((createCall as any).created_at).toBeDefined();
        expect((createCall as any).updated_at).toBeDefined();

        expect(result).toEqual({
          id: 'cloud-connector-123',
          name: 'gcp-test-connector',
          namespace: '*',
          cloudProvider: 'gcp',
          vars: gcpRequest.vars,
          packagePolicyCount: 0,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        });
      });

      it('should throw error for GCP connector with missing service_account', async () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'gcp-test-connector',
          cloudProvider: 'gcp',
          vars: {
            audience: {
              value:
                '//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider',
              type: 'text',
            },
            gcp_credentials_cloud_connector_id: {
              value: 'gcp-connector-id',
              type: 'text',
            },
          } as any,
        };

        await expect(service.create(mockSoClient, invalidRequest)).rejects.toThrow(
          'service_account must be a valid string'
        );
      });

      it('should throw error for GCP connector with missing audience', async () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'gcp-test-connector',
          cloudProvider: 'gcp',
          vars: {
            service_account: {
              value: 'test-service-account@project.iam.gserviceaccount.com',
              type: 'text',
            },
            gcp_credentials_cloud_connector_id: {
              value: 'gcp-connector-id',
              type: 'text',
            },
          } as any,
        };

        await expect(service.create(mockSoClient, invalidRequest)).rejects.toThrow(
          'audience must be a valid string'
        );
      });

      it('should throw error for GCP connector with missing gcp_credentials_cloud_connector_id', async () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'gcp-test-connector',
          cloudProvider: 'gcp',
          vars: {
            service_account: {
              value: 'test-service-account@project.iam.gserviceaccount.com',
              type: 'text',
            },
            audience: {
              value:
                '//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider',
              type: 'text',
            },
          } as any,
        };

        await expect(service.create(mockSoClient, invalidRequest)).rejects.toThrow(
          'gcp_credentials_cloud_connector_id must be a valid string'
        );
      });
    });

    describe('update', () => {
      it('should update GCP cloud connector vars', async () => {
        const existingConnector = {
          id: 'cloud-connector-123',
          type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            name: 'existing-gcp-connector',
            namespace: '*',
            cloudProvider: 'gcp',
            vars: {
              service_account: {
                value: 'old-service-account@project.iam.gserviceaccount.com',
                type: 'text',
              },
              audience: {
                value:
                  '//iam.googleapis.com/projects/111111111/locations/global/workloadIdentityPools/old-pool/providers/old-provider',
                type: 'text',
              },
              gcp_credentials_cloud_connector_id: {
                value: { isSecretRef: true, id: 'old-gcp-connector-id' },
                type: 'password',
              },
            },
            packagePolicyCount: 1,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        } as unknown as SavedObject<CloudConnector>;

        const updateRequest = {
          vars: {
            service_account: {
              value: 'new-service-account@project.iam.gserviceaccount.com',
              type: 'text',
            },
            audience: {
              value:
                '//iam.googleapis.com/projects/222222222/locations/global/workloadIdentityPools/new-pool/providers/new-provider',
              type: 'text',
            },
            gcp_credentials_cloud_connector_id: {
              value: { isSecretRef: true, id: 'new-gcp-connector-id' },
              type: 'password',
            },
          },
        } as Partial<UpdateCloudConnectorRequest>;

        const updatedConnector = {
          ...existingConnector,
          attributes: {
            ...existingConnector.attributes,
            vars: updateRequest.vars,
            updated_at: '2023-01-02T00:00:00.000Z',
          },
        };

        mockSoClient.get.mockResolvedValue(existingConnector);
        mockSoClient.update.mockResolvedValue(updatedConnector);

        const result = await service.update(mockSoClient, 'cloud-connector-123', updateRequest);

        expect(mockSoClient.update).toHaveBeenCalledWith(
          CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          'cloud-connector-123',
          expect.objectContaining({
            vars: updateRequest.vars,
            updated_at: expect.any(String),
          })
        );

        expect(result.vars).toEqual(updateRequest.vars);
      });

      it('should validate GCP vars on update', async () => {
        const existingConnector = {
          id: 'cloud-connector-123',
          type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            name: 'existing-gcp-connector',
            namespace: '*',
            cloudProvider: 'gcp',
            vars: {
              service_account: {
                value: 'old-service-account@project.iam.gserviceaccount.com',
                type: 'text',
              },
              audience: {
                value:
                  '//iam.googleapis.com/projects/111111111/locations/global/workloadIdentityPools/old-pool/providers/old-provider',
                type: 'text',
              },
              gcp_credentials_cloud_connector_id: {
                value: { isSecretRef: true, id: 'old-gcp-connector-id' },
                type: 'password',
              },
            },
            packagePolicyCount: 1,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        } as unknown as SavedObject<CloudConnector>;

        const invalidUpdateRequest = {
          vars: {
            service_account: { value: '', type: 'text' }, // Empty service account
            audience: {
              value:
                '//iam.googleapis.com/projects/222222222/locations/global/workloadIdentityPools/new-pool/providers/new-provider',
              type: 'text',
            },
            gcp_credentials_cloud_connector_id: {
              value: 'new-gcp-connector-id',
              type: 'text',
            },
          } as any,
        };

        mockSoClient.get.mockResolvedValue(existingConnector);

        await expect(
          service.update(mockSoClient, 'cloud-connector-123', invalidUpdateRequest)
        ).rejects.toThrow('service_account must be a valid string');
      });
    });

    describe('validateCloudConnectorDetails', () => {
      it('should validate GCP connector requires all three fields', () => {
        const validGcpRequest: CreateCloudConnectorRequest = {
          name: 'gcp-test-connector',
          cloudProvider: 'gcp',
          vars: {
            service_account: {
              value: 'test-service-account@project.iam.gserviceaccount.com',
              type: 'text',
            },
            audience: {
              value:
                '//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider',
              type: 'text',
            },
            gcp_credentials_cloud_connector_id: {
              value: { isSecretRef: true, id: 'gcp-connector-id' },
              type: 'password',
            },
          },
        };

        expect(() => (service as any).validateCloudConnectorDetails(validGcpRequest)).not.toThrow();
      });

      it('should validate GCP fields are text values', () => {
        const invalidGcpRequest: CreateCloudConnectorRequest = {
          name: 'gcp-test-connector',
          cloudProvider: 'gcp',
          vars: {
            service_account: { value: '', type: 'text' }, // Empty service account
            audience: {
              value:
                '//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider',
              type: 'text',
            },
            gcp_credentials_cloud_connector_id: {
              value: 'gcp-connector-id',
              type: 'text',
            },
          } as any,
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidGcpRequest)).toThrow(
          'service_account must be a valid string'
        );
      });

      it('should validate GCP connector with missing audience', () => {
        const invalidGcpRequest: CreateCloudConnectorRequest = {
          name: 'gcp-test-connector',
          cloudProvider: 'gcp',
          vars: {
            service_account: {
              value: 'test-service-account@project.iam.gserviceaccount.com',
              type: 'text',
            },
            gcp_credentials_cloud_connector_id: {
              value: 'gcp-connector-id',
              type: 'text',
            },
          } as any,
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidGcpRequest)).toThrow(
          'audience must be a valid string'
        );
      });

      it('should validate GCP connector with missing gcp_credentials_cloud_connector_id', () => {
        const invalidGcpRequest: CreateCloudConnectorRequest = {
          name: 'gcp-test-connector',
          cloudProvider: 'gcp',
          vars: {
            service_account: {
              value: 'test-service-account@project.iam.gserviceaccount.com',
              type: 'text',
            },
            audience: {
              value:
                '//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider',
              type: 'text',
            },
          } as any,
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidGcpRequest)).toThrow(
          'gcp_credentials_cloud_connector_id must be a valid string'
        );
      });
    });
  });

  describe('iac fields', () => {
    const baseCreate: CreateCloudConnectorRequest = {
      name: 'iac-connector',
      cloudProvider: 'aws',
      vars: { role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' } },
    };

    it('create leaves iac fields unset when not provided (static template)', async () => {
      mockSoClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 1 });
      mockSoClient.create.mockImplementation(async (_type, attributes) => ({
        id: 'cc-1',
        type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        references: [],
        attributes,
      }));

      await service.create(mockSoClient, baseCreate);

      const [, attributes] = mockSoClient.create.mock.calls[0];
      expect(attributes).not.toHaveProperty('iac_key');
      expect(attributes).not.toHaveProperty('iac_deployment_id');
    });

    it('update writes iac_key and iac_deployment_id only when present in the request', async () => {
      const existing = {
        id: 'cc-1',
        type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        references: [],
        attributes: {
          name: 'iac-connector',
          namespace: '*',
          cloudProvider: 'aws',
          vars: { role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' } },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      };
      mockSoClient.get.mockResolvedValue(existing);
      mockSoClient.update.mockImplementation(async (_type, _id, attributes) => ({
        ...existing,
        attributes: { ...existing.attributes, ...attributes },
      }));
      mockSoClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 0 });

      await service.update(mockSoClient, 'cc-1', { iac_key: 'sha256:new' });
      expect(mockSoClient.update).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cc-1',
        expect.objectContaining({ iac_key: 'sha256:new' })
      );
      const [, , firstUpdate] = mockSoClient.update.mock.calls[0];
      expect(firstUpdate).not.toHaveProperty('iac_deployment_id');

      await service.update(mockSoClient, 'cc-1', { name: 'renamed' });
      const [, , secondUpdate] = mockSoClient.update.mock.calls[1];
      expect(secondUpdate).not.toHaveProperty('iac_key');
    });
  });
});
