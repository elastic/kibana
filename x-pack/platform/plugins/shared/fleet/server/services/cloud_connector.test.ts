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
        name: 'test-connector',
        cloudProvider: 'aws',
        vars: {
          role_arn: 'arn:aws:iam::123456789012:role/TestRole',
          external_id: {
            id: 'ABCDEFGHIJKLMNOPQRST',
            isSecretRef: true,
          },
        },
        packagePolicyCount: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      },
    };

    it('should create a cloud connector successfully', async () => {
      mockSoClient.create.mockResolvedValue(mockSavedObject);

      const result = await service.create(mockSoClient, mockCreateRequest);

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'arn:aws:iam::123456789012:role/TestRole',
          cloudProvider: 'aws',
          vars: expect.objectContaining({
            role_arn: 'arn:aws:iam::123456789012:role/TestRole',
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
        vars: expect.any(Object),
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
        /Error creating cloud connector in Fleet, CloudConnectorService Failed to create cloud connector: AWS package policy must contain role_arn variable/
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

    it('should handle AWS variables with aws.role_arn path', async () => {
      const awsRequest: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'aws',
        vars: {
          'aws.role_arn': {
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

      mockSoClient.create.mockResolvedValue(mockSavedObject);

      await service.create(mockSoClient, awsRequest);

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          vars: expect.objectContaining({
            role_arn: 'arn:aws:iam::123456789012:role/TestRole',
          }),
        })
      );
    });

    it('should handle AWS variables with aws.credentials.external_id path', async () => {
      const awsRequest: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          'aws.credentials.external_id': {
            value: {
              id: 'ABCDEFGHIJKLMNOPQRST',
              isSecretRef: true,
            },
            type: 'password',
          },
        },
      };

      mockSoClient.create.mockResolvedValue(mockSavedObject);

      await service.create(mockSoClient, awsRequest);

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          vars: expect.objectContaining({
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
        /Error creating cloud connector in Fleet, CloudConnectorService Failed to create cloud connector: AWS package policy must contain role_arn variable/
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
        /Error creating cloud connector in Fleet, CloudConnectorService Failed to create cloud connector: AWS package policy must contain valid external_id secret reference/
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
            vars: {
              role_arn: 'arn:aws:iam::123456789012:role/Role1',
              external_id: {
                id: 'secret-1',
                isSecretRef: true,
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
          vars: {
            role_arn: 'arn:aws:iam::123456789012:role/Role1',
            external_id: {
              id: 'secret-1',
              isSecretRef: true,
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

  describe('getCloudConnectorInfo', () => {
    it('should extract AWS variables correctly', () => {
      const request: CreateCloudConnectorRequest = {
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

      const getCloudConnectorInfo = (service as any).getCloudConnectorInfo.bind(service);
      const result = getCloudConnectorInfo(request);

      expect(result).toEqual({
        cloudProvider: 'aws',
        vars: {
          role_arn: 'arn:aws:iam::123456789012:role/TestRole',
          external_id: {
            type: 'password',
            value: {
              id: 'ABCDEFGHIJKLMNOPQRST',
              isSecretRef: true,
            },
          },
        },
        name: 'arn:aws:iam::123456789012:role/TestRole',
      });
    });

    it('should handle string external_id and convert to secret reference', () => {
      const request: CreateCloudConnectorRequest = {
        name: 'arn:aws:iam::123456789012:role/TestRole',
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

      const getCloudConnectorInfo = (service as any).getCloudConnectorInfo.bind(service);
      const result = getCloudConnectorInfo(request);

      expect(result.vars.external_id).toEqual({
        type: 'password',
        value: {
          id: 'ABCDEFGHIJKLMNOPQRST',
          isSecretRef: true,
        },
      });
    });

    it('should validate external_id secret format - valid 20-character alphanumeric', () => {
      const request: CreateCloudConnectorRequest = {
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

      const getCloudConnectorInfo = (service as any).getCloudConnectorInfo.bind(service);
      const result = getCloudConnectorInfo(request);

      expect(result.vars.external_id).toEqual({
        type: 'password',
        value: {
          id: 'ABCDEFGHIJKLMNOPQRST',
          isSecretRef: true,
        },
      });
    });

    it('should throw error for external_id secret with invalid format - too short', () => {
      const request: CreateCloudConnectorRequest = {
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

      const getCloudConnectorInfo = (service as any).getCloudConnectorInfo.bind(service);

      expect(() => getCloudConnectorInfo(request)).toThrow(
        'External ID secret reference is not valid'
      );
    });

    it('should throw error for external_id secret with invalid format - too long', () => {
      const request: CreateCloudConnectorRequest = {
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

      const getCloudConnectorInfo = (service as any).getCloudConnectorInfo.bind(service);

      expect(() => getCloudConnectorInfo(request)).toThrow(
        'External ID secret reference is not valid'
      );
    });

    it('should throw error for external_id secret with invalid format - contains special characters', () => {
      const request: CreateCloudConnectorRequest = {
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

      const getCloudConnectorInfo = (service as any).getCloudConnectorInfo.bind(service);

      expect(() => getCloudConnectorInfo(request)).toThrow(
        'External ID secret reference is not valid'
      );
    });

    it('should throw error for external_id secret with invalid format - contains spaces', () => {
      const request: CreateCloudConnectorRequest = {
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

      const getCloudConnectorInfo = (service as any).getCloudConnectorInfo.bind(service);

      expect(() => getCloudConnectorInfo(request)).toThrow(
        'External ID secret reference is not valid'
      );
    });

    it('should validate external_id secret format - valid with numbers only', () => {
      const request: CreateCloudConnectorRequest = {
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

      const getCloudConnectorInfo = (service as any).getCloudConnectorInfo.bind(service);
      const result = getCloudConnectorInfo(request);

      expect(result.vars.external_id).toEqual({
        type: 'password',
        value: {
          id: '12345678901234567890',
          isSecretRef: true,
        },
      });
    });

    it('should validate external_id secret format - valid with mixed case', () => {
      const request: CreateCloudConnectorRequest = {
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

      const getCloudConnectorInfo = (service as any).getCloudConnectorInfo.bind(service);
      const result = getCloudConnectorInfo(request);

      expect(result.vars.external_id).toEqual({
        type: 'password',
        value: {
          id: 'aBcDeFgHiJkLmNoPqRsT',
          isSecretRef: true,
        },
      });
    });

    it('should validate external_id secret format - valid with underscores and hyphens', () => {
      const request: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          external_id: {
            value: {
              id: '0BrW7JgB-08CS_HiWrORw',
              isSecretRef: true,
            },
            type: 'password',
          },
        },
      };

      const getCloudConnectorInfo = (service as any).getCloudConnectorInfo.bind(service);
      const result = getCloudConnectorInfo(request);

      expect(result.vars.external_id).toEqual({
        type: 'password',
        value: {
          id: '0BrW7JgB-08CS_HiWrORw',
          isSecretRef: true,
        },
      });
    });
  });
});
