/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { loggerMock } from '@kbn/logging-mocks';

import type { CreateCloudConnectorRequest } from '../routes/cloud_connector/handlers';
import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../common/constants';

import { createSavedObjectClientMock } from '../mocks';

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
