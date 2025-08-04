/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { loggerMock } from '@kbn/logging-mocks';

import type { PackagePolicy } from '../../common/types/models/package_policy';
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
      cloudProvider: 'AWS',
      vars: {
        role_arn: {
          value: 'arn:aws:iam::123456789012:role/TestRole',
          type: 'text',
        },
        external_id: {
          value: {
            id: 'secret-id-123',
            isSecretRef: true,
          },
          type: 'password',
        },
      },
    };

    const mockPackagePolicy: PackagePolicy = {
      id: 'package-policy-123',
      name: 'test-policy',
      package: {
        name: 'test-package',
        version: '1.0.0',
        title: 'Test Package',
      },
      inputs: [
        {
          type: 'test-input',
          policy_template: 'test-template',
          enabled: true,
          streams: [],
        },
      ],
    } as any;

    const mockSavedObject = {
      id: 'cloud-connector-123',
      type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        name: 'test-connector',
        cloudProvider: 'AWS',
        vars: {
          role_arn: 'arn:aws:iam::123456789012:role/TestRole',
          external_id: {
            id: 'secret-id-123',
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

      const result = await service.create(mockSoClient, mockCreateRequest, mockPackagePolicy);

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'test-connector',
          cloudProvider: 'AWS',
          vars: expect.objectContaining({
            role_arn: 'arn:aws:iam::123456789012:role/TestRole',
            external_id: expect.objectContaining({
              id: 'secret-id-123',
              isSecretRef: true,
            }),
          }),
        })
      );

      expect(result).toEqual({
        id: 'cloud-connector-123',
        name: 'test-connector',
        cloudProvider: 'AWS',
        vars: expect.any(Object),
        packagePolicyCount: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating cloud connector for integration package: test-package package policy id package-policy-123, template: test-template'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully created cloud connector for integration package: test-package package policy id package-policy-123, template: test-template'
      );
    });

    it('should not create a cloud connector without package policy', async () => {
      mockSoClient.create.mockResolvedValue(mockSavedObject);

      const result = await service.create(mockSoClient, mockCreateRequest);

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'test-connector',
          cloudProvider: 'AWS',
        })
      );

      expect(result).toEqual({
        id: 'cloud-connector-123',
        name: 'test-connector',
        cloudProvider: 'AWS',
        vars: expect.any(Object),
        packagePolicyCount: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating cloud connector for integration package: undefined package policy id undefined, template: unknown'
      );
    });

    it('should throw error when vars are empty', async () => {
      const emptyVarsRequest: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'AWS',
        vars: {},
      };

      await expect(service.create(mockSoClient, emptyVarsRequest)).rejects.toThrow(
        'AWS package policy must contain role_arn variable'
      );
    });

    it('should throw error when saved object creation fails', async () => {
      const error = new Error('Database error');
      mockSoClient.create.mockRejectedValue(error);

      await expect(
        service.create(mockSoClient, mockCreateRequest, mockPackagePolicy)
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create cloud connector for package: test-package, template: test-template',
        'Database error'
      );
    });

    it('should handle AWS variables with aws.role_arn path', async () => {
      const awsRequest: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'AWS',
        vars: {
          'aws.role_arn': {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          external_id: {
            value: {
              id: 'secret-id-123',
              isSecretRef: true,
            },
            type: 'password',
          },
        },
      };

      mockSoClient.create.mockResolvedValue(mockSavedObject);

      await service.create(mockSoClient, awsRequest, mockPackagePolicy);

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
        cloudProvider: 'AWS',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          aws: {
            credentials: {
              external_id: {
                value: 'secret-value',
                type: 'password',
              },
            },
          },
        },
      };

      mockSoClient.create.mockResolvedValue(mockSavedObject);

      await service.create(mockSoClient, awsRequest, mockPackagePolicy);

      expect(mockSoClient.create).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          vars: expect.objectContaining({
            external_id: expect.objectContaining({
              id: 'secret-value',
              isSecretRef: true,
            }),
          }),
        })
      );
    });

    it('should throw error when AWS role_arn is missing', async () => {
      const invalidRequest: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'AWS',
        vars: {
          external_id: {
            value: {
              id: 'secret-id-123',
              isSecretRef: true,
            },
            type: 'password',
          },
        },
      };

      await expect(service.create(mockSoClient, invalidRequest, mockPackagePolicy)).rejects.toThrow(
        'AWS package policy must contain role_arn variable'
      );
    });

    it('should throw error when AWS external_id is missing', async () => {
      const invalidRequest: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'AWS',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
        },
      };

      await expect(service.create(mockSoClient, invalidRequest, mockPackagePolicy)).rejects.toThrow(
        'AWS package policy must contain external_id variable'
      );
    });

    it('should throw error when Azure client_id is missing', async () => {
      const invalidRequest: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'Azure',
        vars: {
          tenant_id: {
            value: 'azure-tenant-id',
            type: 'text',
          },
        },
      };

      await expect(service.create(mockSoClient, invalidRequest, mockPackagePolicy)).rejects.toThrow(
        'AWS package policy must contain role_arn variable'
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
            cloudProvider: 'AWS',
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
          cloudProvider: 'AWS',
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

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get cloud connectors list');
    });
  });

  describe('extractCloudVars', () => {
    it('should extract AWS variables correctly', () => {
      const request: CreateCloudConnectorRequest = {
        name: 'test-connector',
        cloudProvider: 'AWS',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          external_id: {
            value: {
              id: 'secret-id-123',
              isSecretRef: true,
            },
            type: 'password',
          },
        },
      };

      const packagePolicy: PackagePolicy = {
        id: 'package-policy-123',
        name: 'test-policy',
        package: {
          name: 'test-package',
          version: '1.0.0',
        },
        inputs: [
          {
            type: 'test-input',
            policy_template: 'test-template',
            enabled: true,
            streams: [],
          },
        ],
      } as any;

      // Access private method for testing
      const extractCloudVars = (service as any).extractCloudVars.bind(service);
      const result = extractCloudVars(request, packagePolicy);

      expect(result).toEqual({
        cloudProvider: 'AWS',
        vars: {
          role_arn: 'arn:aws:iam::123456789012:role/TestRole',
          external_id: {
            id: 'secret-id-123',
            isSecretRef: true,
          },
        },
        name: 'test-connector',
      });
    });

    it('should handle string external_id and convert to secret reference', () => {
      const request: CreateCloudConnectorRequest = {
        name: 'arn:aws:iam::123456789012:role/TestRole',
        cloudProvider: 'AWS',
        vars: {
          role_arn: {
            value: 'arn:aws:iam::123456789012:role/TestRole',
            type: 'text',
          },
          external_id: {
            value: 'secret-string-value',
            type: 'password',
          },
        },
      };

      const packagePolicy: PackagePolicy = {
        id: 'package-policy-123',
        name: 'test-policy',
      } as any;

      // Access private method for testing
      const extractCloudVars = (service as any).extractCloudVars.bind(service);
      const result = extractCloudVars(request, packagePolicy);

      expect(result.vars.external_id).toEqual({
        id: 'secret-string-value',
        isSecretRef: true,
      });
    });
  });
});
