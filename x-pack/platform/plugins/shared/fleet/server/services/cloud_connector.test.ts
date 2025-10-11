/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { loggerMock } from '@kbn/logging-mocks';

import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../common/constants';

import { createSavedObjectClientMock } from '../mocks';
import type { CreateCloudConnectorRequest } from '../../common/types/rest_spec/cloud_connector';

import { CloudConnectorService } from './cloud_connector';
import { appContextService } from './app_context';

// Mock dependencies
jest.mock('./app_context');

const mockAppContextService = appContextService;

describe('CloudConnectorService', () => {
  let service: CloudConnectorService;
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;
  let mockLogger: jest.Mocked<ReturnType<typeof loggerMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockLogger = loggerMock.create();
    mockAppContextService.getLogger = jest.fn().mockReturnValue(mockLogger);

    mockSoClient = createSavedObjectClientMock();
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
        name: 'arn:aws:iam::123456789012:role/TestRole',
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
        packagePolicyCount: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      },
    };

    it('should create a cloud connector successfully with space awareness enabled', async () => {
      jest
        .spyOn(await import('./spaces/helpers'), 'isSpaceAwarenessEnabled')
        .mockResolvedValue(true);
      mockSoClient.create.mockResolvedValue(mockSavedObject);

      const result = await service.create(mockSoClient, mockCreateRequest);

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'arn:aws:iam::123456789012:role/TestRole',
          namespace: '*',
          cloudProvider: 'aws',
          packagePolicyCount: 1,
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
        name: 'arn:aws:iam::123456789012:role/TestRole',
        cloudProvider: 'aws',
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
        packagePolicyCount: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Creating cloud connector');
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully created cloud connector');
    });

    it('should throw error when vars are empty', async () => {
      const emptyVarsRequest: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'aws',
        vars: {},
      };

      await expect(service.create(mockSoClient, emptyVarsRequest)).rejects.toThrow(
        /Package policy must contain role_arn variable/
      );
    });

    it('should throw error when saved object creation fails', async () => {
      const error = new Error('Database error');
      mockSoClient.create.mockRejectedValue(error);

      await expect(service.create(mockSoClient, mockCreateRequest)).rejects.toThrow(
        'Database error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create cloud connector',
        'Database error'
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
        },
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
        },
      };

      await expect(service.create(mockSoClient, invalidRequest)).rejects.toThrow(
        /Package policy must contain valid external_id secret reference/
      );
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
            packagePolicyCount: 1,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
        },
      ],
      total: 1,
      page: 1,
      per_page: 20,
    };

    it('should get cloud connectors list successfully', async () => {
      mockSoClient.find.mockResolvedValue(mockCloudConnectors);

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

    it('should throw error when find operation fails', async () => {
      const error = new Error('Database error');
      mockSoClient.find.mockRejectedValue(error);

      await expect(service.getList(mockSoClient)).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get cloud connectors list',
        'Database error'
      );
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
        packagePolicyCount: 2,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T01:00:00.000Z',
      },
    };

    it('should get cloud connector by id successfully', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObject);

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

      await service.getById(mockSoClient, 'cloud-connector-123');

      expect(mockLogger.info).toHaveBeenCalledWith('Getting cloud connector cloud-connector-123');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully retrieved cloud connector cloud-connector-123'
      );
    });

    it('should handle cloud connector with minimal data', async () => {
      const minimalSavedObject = {
        ...mockSavedObject,
        attributes: {
          name: 'minimal-connector',
          namespace: 'default',
          cloudProvider: 'aws',
          vars: {},
          packagePolicyCount: 0,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      };

      mockSoClient.get.mockResolvedValue(minimalSavedObject);

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
        packagePolicyCount: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      },
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
      expect(result.vars?.role_arn?.value).toEqual('arn:aws:iam::123456789012:role/OriginalRole');
      expect(result.vars?.external_id?.value?.id).toEqual('ORIGINALEXTERNALID12');
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

      expect(result.vars?.role_arn?.value).toEqual('arn:aws:iam::123456789012:role/UpdatedRole');
      expect(result.vars?.external_id?.value?.id).toEqual('UPDATEDEXTERNALID123');
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
      expect(result.vars?.role_arn?.value).toEqual(
        'arn:aws:iam::123456789012:role/FullyUpdatedRole'
      );
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
      };

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
        'Failed to update cloud connector',
        'Saved object not found'
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
  });

  describe('delete', () => {
    const mockSavedObjectWithZeroCount = {
      id: 'cloud-connector-123',
      type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        name: 'test-connector',
        namespace: '*',
        cloudProvider: 'aws',
        vars: {},
        packagePolicyCount: 0,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T01:00:00.000Z',
      },
    };

    const mockSavedObjectWithNonZeroCount = {
      ...mockSavedObjectWithZeroCount,
      attributes: {
        ...mockSavedObjectWithZeroCount.attributes,
        packagePolicyCount: 3,
      },
    };

    it('should delete cloud connector successfully when packagePolicyCount is 0', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObjectWithZeroCount);
      mockSoClient.delete.mockResolvedValue({});

      const result = await service.delete(mockSoClient, 'cloud-connector-123');

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

    it('should throw error when packagePolicyCount > 0 and force is false', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObjectWithNonZeroCount);

      await expect(service.delete(mockSoClient, 'cloud-connector-123', false)).rejects.toThrow(
        'Cannot delete cloud connector "test-connector" as it is being used by 3 package policies'
      );

      expect(mockSoClient.delete).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Cannot delete cloud connector "test-connector" as it is being used by 3 package policies'
      );
    });

    it('should delete successfully when packagePolicyCount > 0 and force is true', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObjectWithNonZeroCount);
      mockSoClient.delete.mockResolvedValue({});

      const result = await service.delete(mockSoClient, 'cloud-connector-123', true);

      expect(mockSoClient.delete).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'cloud-connector-123'
      );
      expect(result).toEqual({ id: 'cloud-connector-123' });
    });

    it('should log warning when force deleting connector with packagePolicyCount > 0', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObjectWithNonZeroCount);
      mockSoClient.delete.mockResolvedValue({});

      await service.delete(mockSoClient, 'cloud-connector-123', true);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Force deleting cloud connector "test-connector" which is still being used by 3 package policies'
      );
    });

    it('should not log warning when force deleting connector with packagePolicyCount = 0', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObjectWithZeroCount);
      mockSoClient.delete.mockResolvedValue({});

      await service.delete(mockSoClient, 'cloud-connector-123', true);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should default force parameter to false when not provided', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObjectWithNonZeroCount);

      await expect(service.delete(mockSoClient, 'cloud-connector-123')).rejects.toThrow(
        'Cannot delete cloud connector "test-connector" as it is being used by 3 package policies'
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Deleting cloud connector cloud-connector-123 (force: false)'
      );
    });

    it('should throw error when cloud connector not found', async () => {
      const error = new Error('Saved object not found');
      mockSoClient.get.mockRejectedValue(error);

      await expect(service.delete(mockSoClient, 'non-existent-id')).rejects.toThrow(
        'Failed to delete cloud connector: Saved object not found'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete cloud connector',
        'Saved object not found'
      );
    });

    it('should log info messages correctly', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObjectWithZeroCount);
      mockSoClient.delete.mockResolvedValue({});

      await service.delete(mockSoClient, 'cloud-connector-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Deleting cloud connector cloud-connector-123 (force: false)'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully deleted cloud connector cloud-connector-123'
      );
    });

    it('should re-throw CloudConnectorDeleteError as-is', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObjectWithNonZeroCount);

      await expect(service.delete(mockSoClient, 'cloud-connector-123')).rejects.toThrow(
        'Cannot delete cloud connector "test-connector" as it is being used by 3 package policies'
      );
    });

    it('should handle saved object delete failure', async () => {
      mockSoClient.get.mockResolvedValue(mockSavedObjectWithZeroCount);
      const deleteError = new Error('Database delete failed');
      mockSoClient.delete.mockRejectedValue(deleteError);

      await expect(service.delete(mockSoClient, 'cloud-connector-123')).rejects.toThrow(
        'Failed to delete cloud connector: Database delete failed'
      );

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
          },
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
          },
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
          'Unsupported cloud provider: azure'
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
});
