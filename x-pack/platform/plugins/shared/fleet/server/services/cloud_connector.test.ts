/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  SINGLE_ACCOUNT,
  ORGANIZATION_ACCOUNT,
} from '../../common/constants';

import { createSavedObjectClientMock } from '../mocks';
import type {
  CreateCloudConnectorRequest,
  UpdateCloudConnectorRequest,
} from '../../common/types/rest_spec/cloud_connector';
import type {
  AwsCloudConnectorVars,
  CloudConnector,
} from '../../common/types/models/cloud_connector';

import { CloudConnectorService } from './cloud_connector';
import { appContextService } from './app_context';

// Mock dependencies
jest.mock('./app_context');

const mockAppContextService = appContextService;

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

    it('should throw error when AWS external_id is missing', async () => {
      const invalidRequest: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
        } as any, // Intentionally invalid for testing validation
      };

      await expect(service.create(mockSoClient, invalidRequest)).rejects.toThrow(
        /Package policy must contain valid external_id secret reference/
      );
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
      per_page: 20,
    };

    // Mock aggregation response for package policy counts (perPage: 0 means no docs returned)
    const mockPackagePolicies = {
      saved_objects: [],
      total: 1,
      page: 1,
      per_page: 0,
      aggregations: {
        packagePolicyCounts: {
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
        perPage: 20,
        sortField: 'created_at',
        sortOrder: 'desc',
      });

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
        per_page: 20,
      };

      mockSoClient.find.mockResolvedValue(mockConnectorsWithFields);

      const result = await service.getList(mockSoClient, { fields: ['name'] });

      expect(mockSoClient.find).toHaveBeenCalledWith({
        type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        page: 1,
        perPage: 20,
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
      const awsVars = result.vars as AwsCloudConnectorVars;
      expect(awsVars.role_arn?.value).toEqual('arn:aws:iam::123456789012:role/OriginalRole');
      expect(awsVars.external_id?.value?.id).toEqual('ORIGINALEXTERNALID12');
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

      const result = await service.update(mockSoClient, 'cloud-connector-123', {
        vars: validVars,
      });

      expect(mockSoClient.update).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123',
        {
          vars: validVars,
          updated_at: expect.any(String),
        }
      );

      const awsVars = result.vars as AwsCloudConnectorVars;
      expect(awsVars.role_arn?.value).toEqual('arn:aws:iam::123456789012:role/UpdatedRole');
      expect(awsVars.external_id?.value?.id).toEqual('UPDATEDEXTERNALID123');
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

      const result = await service.update(mockSoClient, 'cloud-connector-123', {
        name: 'fully-updated-connector',
        vars: validVars,
      });

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

    it('should require both role_arn and external_id when updating vars', async () => {
      mockSoClient.get.mockResolvedValue(mockExistingSavedObject);

      const incompleteVars = {
        role_arn: {
          value: 'arn:aws:iam::123456789012:role/ValidRole',
          type: 'text' as const,
        },
        // Missing external_id
      } as any; // Intentionally invalid for testing validation

      await expect(
        service.update(mockSoClient, 'cloud-connector-123', {
          vars: incompleteVars,
        })
      ).rejects.toThrow('Package policy must contain valid external_id secret reference');

      expect(mockSoClient.update).not.toHaveBeenCalled();
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

      it('should throw error when external_id is missing', () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              value: 'arn:aws:iam::123456789012:role/TestRole',
              type: 'text',
            },
          } as any, // Intentionally invalid for testing validation
        };

        expect(() => (service as any).validateCloudConnectorDetails(invalidRequest)).toThrow(
          'Package policy must contain valid external_id secret reference'
        );
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

      it('should throw error for gcp cloud provider', () => {
        const invalidRequest: CreateCloudConnectorRequest = {
          name: 'test-connector',
          cloudProvider: 'gcp' as any,
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
          'Unsupported cloud provider: gcp'
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
        } as SavedObject<CloudConnector>;

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
        } as SavedObject<CloudConnector>;

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
        } as SavedObject<CloudConnector>;

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
        } as SavedObject<CloudConnector>;

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
});
