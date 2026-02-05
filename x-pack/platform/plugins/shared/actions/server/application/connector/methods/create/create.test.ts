/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import type { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Logger } from '@kbn/logging';
import type { ActionTypeRegistry } from '../../../../action_type_registry';
import { create } from './create';
import { getConnectorType } from '../../../../fixtures';
import type { ActionsClientContext } from '../../../../actions_client';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { z } from '@kbn/zod';

jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');
  return {
    ...actual,
    SavedObjectsUtils: {
      generateId: () => 'mock-saved-object-id',
    },
  };
});

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
const authorization = actionsAuthorizationMock.create();
const request = httpServerMock.createKibanaRequest();
const auditLogger = auditLoggerMock.create();
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const preSaveHook = jest.fn();
const postSaveHook = jest.fn();
const actionExecutor = actionExecutorMock.create();
const connectorTokenClient = connectorTokenClientMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const bulkExecutionEnqueuer = jest.fn();
const getEventLogClient = jest.fn();
const getAxiosInstanceWithAuth = jest.fn();

const actionTypeRegistry: ActionTypeRegistry = {
  get: jest.fn(),
  isSystemActionType: jest.fn().mockReturnValue(false),
  ensureActionTypeEnabled: jest.fn(),
  isDeprecated: jest.fn().mockReturnValue(false),
  getUtils: jest.fn().mockReturnValue({
    isHostnameAllowed: jest.fn().mockReturnValue(true),
    isUriAllowed: jest.fn().mockReturnValue(true),
    getMicrosoftGraphApiUrl: jest.fn(),
    getProxySettings: jest.fn(),
  }),
} as unknown as ActionTypeRegistry;

const mockContext: ActionsClientContext = {
  actionTypeRegistry,
  authorization: authorization as unknown as ActionsAuthorization,
  unsecuredSavedObjectsClient,
  scopedClusterClient,
  request,
  auditLogger,
  logger,
  inMemoryConnectors: [],
  kibanaIndices: ['.kibana'],
  actionExecutor,
  bulkExecutionEnqueuer,
  connectorTokenClient,
  getEventLogClient,
  encryptedSavedObjectsClient,
  isESOCanEncrypt: true,
  getAxiosInstanceWithAuth,
};

describe('create()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    unsecuredSavedObjectsClient.create.mockReset();
    // Set up default action type with schemas that accept any properties
    (actionTypeRegistry.get as jest.Mock).mockReturnValue(
      getConnectorType({
        id: 'my-connector-type',
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
        },
      })
    );
    (actionTypeRegistry.isDeprecated as jest.Mock).mockReturnValue(false);
    (actionTypeRegistry.isSystemActionType as jest.Mock).mockReturnValue(false);
    authorization.ensureAuthorized.mockResolvedValue(undefined);
  });

  describe('authorization', () => {
    test('ensures user is authorised to create this type of action', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: {},
          secrets: {},
        },
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: 'create',
        actionTypeId: 'my-connector-type',
      });
    });

    test('throws when user is not authorised to create this type of action', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to create a "my-connector-type" action`)
      );

      await expect(
        create({
          context: mockContext,
          action: {
            name: 'my name',
            actionTypeId: 'my-connector-type',
            config: {},
            secrets: {},
          },
        })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to create a "my-connector-type" action]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: 'create',
        actionTypeId: 'my-connector-type',
      });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when creating a connector', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: {},
          secrets: {},
        },
      });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_create',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: 'mock-saved-object-id', type: 'action' } },
        })
      );
    });

    test('logs audit event when not authorised to create a connector', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        create({
          context: mockContext,
          action: {
            name: 'my name',
            actionTypeId: 'my-connector-type',
            config: {},
            secrets: {},
          },
        })
      ).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_create',
          }),
          kibana: { saved_object: { id: 'mock-saved-object-id', type: 'action' } },
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
    });
  });

  describe('system actions', () => {
    test('throws an error when creating a system action', async () => {
      (actionTypeRegistry.isSystemActionType as jest.Mock).mockReturnValue(true);

      await expect(
        create({
          context: mockContext,
          action: {
            name: 'my name',
            actionTypeId: '.cases',
            config: {},
            secrets: {},
          },
        })
      ).rejects.toThrow('System action creation is forbidden. Action type: .cases.');
    });

    test('throws an error when creating a connector with an ID that matches a system action', async () => {
      const contextWithSystemAction = {
        ...mockContext,
        inMemoryConnectors: [
          {
            id: 'system-connector-id',
            actionTypeId: '.cases',
            name: 'System Action',
            isSystemAction: true,
            config: {},
            secrets: {},
            isPreconfigured: false,
            isDeprecated: false,
            isConnectorTypeDeprecated: false,
          },
        ],
      };

      await expect(
        create({
          context: contextWithSystemAction,
          action: {
            name: 'my name',
            actionTypeId: 'my-connector-type',
            config: {},
            secrets: {},
          },
          options: { id: 'system-connector-id' },
        })
      ).rejects.toThrow('System action creation is forbidden. Action type: my-connector-type.');
    });
  });

  describe('preconfigured connectors', () => {
    test('throws an error when creating a connector with an ID that matches a preconfigured connector', async () => {
      const contextWithPreconfigured = {
        ...mockContext,
        inMemoryConnectors: [
          {
            id: 'preconfigured-connector-id',
            actionTypeId: 'my-connector-type',
            name: 'Preconfigured Connector',
            isPreconfigured: true,
            isSystemAction: false,
            config: {},
            secrets: {},
            isDeprecated: false,
            isConnectorTypeDeprecated: false,
          },
        ],
      };

      await expect(
        create({
          context: contextWithPreconfigured,
          action: {
            name: 'my name',
            actionTypeId: 'my-connector-type',
            config: {},
            secrets: {},
          },
          options: { id: 'preconfigured-connector-id' },
        })
      ).rejects.toThrow(
        'This preconfigured-connector-id already exists in a preconfigured action.'
      );
    });
  });

  describe('basic connector creation', () => {
    test('creates an action with all given properties', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: { foo: 'bar' },
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      const result = await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: { foo: 'bar' },
          secrets: { apiKey: 'secret' },
        },
      });

      expect(result).toEqual({
        id: '1',
        actionTypeId: 'my-connector-type',
        isMissingSecrets: false,
        name: 'my name',
        config: { foo: 'bar' },
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'action',
        {
          actionTypeId: 'my-connector-type',
          name: 'my name',
          isMissingSecrets: false,
          config: { foo: 'bar' },
          secrets: { apiKey: 'secret' },
        },
        { id: 'mock-saved-object-id' }
      );
    });

    test('creates an action with a custom ID when provided', async () => {
      const savedObjectCreateResult = {
        id: 'custom-id',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      const result = await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: {},
          secrets: {},
        },
        options: { id: 'custom-id' },
      });

      expect(result.id).toBe('custom-id');
      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith('action', expect.anything(), {
        id: 'custom-id',
      });
    });

    test('validates config and secrets', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: { validated: true },
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      const actionType = getConnectorType({
        id: 'my-connector-type',
        validate: {
          config: {
            schema: z.any().transform(() => ({ validated: true })),
          },
          secrets: {
            schema: z.any().transform(() => ({ validatedSecret: true })),
          },
        },
      });

      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: { foo: 'bar' },
          secrets: { apiKey: 'secret' },
        },
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'action',
        expect.objectContaining({
          config: { validated: true },
          secrets: { validatedSecret: true },
        }),
        expect.anything()
      );
    });

    test('ensures action type is enabled', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: {},
          secrets: {},
        },
      });

      expect(actionTypeRegistry.ensureActionTypeEnabled).toHaveBeenCalledWith('my-connector-type');
    });
  });

  describe('authMode', () => {
    test('creates an action with authMode "shared"', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
          authMode: 'shared' as const,
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      const result = await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: {},
          secrets: {},
          authMode: 'shared',
        },
      });

      expect(result).toEqual({
        id: '1',
        actionTypeId: 'my-connector-type',
        isMissingSecrets: false,
        name: 'my name',
        config: {},
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        authMode: 'shared',
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'action',
        {
          actionTypeId: 'my-connector-type',
          name: 'my name',
          isMissingSecrets: false,
          config: {},
          secrets: {},
          authMode: 'shared',
        },
        { id: 'mock-saved-object-id' }
      );
    });

    test('creates an action with authMode "per-user"', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
          authMode: 'per-user' as const,
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      const result = await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: {},
          secrets: {},
          authMode: 'per-user',
        },
      });

      expect(result).toEqual({
        id: '1',
        actionTypeId: 'my-connector-type',
        isMissingSecrets: false,
        name: 'my name',
        config: {},
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        authMode: 'per-user',
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'action',
        {
          actionTypeId: 'my-connector-type',
          name: 'my name',
          isMissingSecrets: false,
          config: {},
          secrets: {},
          authMode: 'per-user',
        },
        { id: 'mock-saved-object-id' }
      );
    });
  });

  describe('hooks', () => {
    test('calls preSaveHook if defined', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      const actionType = getConnectorType({
        id: 'my-connector-type',
        preSaveHook,
      });

      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: { foo: 'bar' },
          secrets: { apiKey: 'secret' },
        },
      });

      expect(preSaveHook).toHaveBeenCalledWith({
        connectorId: 'mock-saved-object-id',
        config: { foo: 'bar' },
        secrets: { apiKey: 'secret' },
        logger,
        request,
        services: { scopedClusterClient },
        isUpdate: false,
      });
    });

    test('logs audit event and throws when preSaveHook fails', async () => {
      const actionType = getConnectorType({
        id: 'my-connector-type',
        preSaveHook,
      });

      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);
      preSaveHook.mockRejectedValueOnce(new Error('preSaveHook failed'));

      await expect(
        create({
          context: mockContext,
          action: {
            name: 'my name',
            actionTypeId: 'my-connector-type',
            config: {},
            secrets: {},
          },
        })
      ).rejects.toThrow('preSaveHook failed');

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_create',
          }),
          error: expect.objectContaining({
            message: 'preSaveHook failed',
          }),
        })
      );
    });

    test('calls postSaveHook if defined and connector created successfully', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      const actionType = getConnectorType({
        id: 'my-connector-type',
        postSaveHook,
      });

      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: { foo: 'bar' },
          secrets: { apiKey: 'secret' },
        },
      });

      expect(postSaveHook).toHaveBeenCalledWith({
        connectorId: 'mock-saved-object-id',
        config: { foo: 'bar' },
        secrets: { apiKey: 'secret' },
        logger,
        request,
        services: { scopedClusterClient },
        isUpdate: false,
        wasSuccessful: true,
      });
    });

    test('calls postSaveHook with wasSuccessful false when connector creation fails', async () => {
      unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('Save failed'));

      const actionType = getConnectorType({
        id: 'my-connector-type',
        postSaveHook,
      });

      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await expect(
        create({
          context: mockContext,
          action: {
            name: 'my name',
            actionTypeId: 'my-connector-type',
            config: { foo: 'bar' },
            secrets: { apiKey: 'secret' },
          },
        })
      ).rejects.toThrow('Save failed');

      expect(postSaveHook).toHaveBeenCalledWith({
        connectorId: 'mock-saved-object-id',
        config: { foo: 'bar' },
        secrets: { apiKey: 'secret' },
        logger,
        request,
        services: { scopedClusterClient },
        isUpdate: false,
        wasSuccessful: false,
      });
    });

    test('logs error but does not throw when postSaveHook fails', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      const actionType = getConnectorType({
        id: 'my-connector-type',
        postSaveHook,
      });

      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);
      postSaveHook.mockRejectedValueOnce(new Error('postSaveHook failed'));

      const result = await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: {},
          secrets: {},
        },
      });

      expect(result.id).toBe('1');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('postSaveHook create error'),
        expect.objectContaining({
          tags: ['post-save-hook', 'mock-saved-object-id'],
        })
      );
    });
  });

  describe('error handling', () => {
    test('throws when saved object client fails', async () => {
      unsecuredSavedObjectsClient.create.mockRejectedValueOnce(
        new Error('Failed to create saved object')
      );

      await expect(
        create({
          context: mockContext,
          action: {
            name: 'my name',
            actionTypeId: 'my-connector-type',
            config: {},
            secrets: {},
          },
        })
      ).rejects.toThrow('Failed to create saved object');
    });

    test('throws when action type does not exist', async () => {
      (actionTypeRegistry.get as jest.Mock).mockImplementation(() => {
        throw new Error('Action type not found');
      });

      await expect(
        create({
          context: mockContext,
          action: {
            name: 'my name',
            actionTypeId: 'non-existent-type',
            config: {},
            secrets: {},
          },
        })
      ).rejects.toThrow('Action type not found');
    });

    test('throws when config validation fails', async () => {
      const actionType = getConnectorType({
        id: 'my-connector-type',
        validate: {
          config: {
            schema: z.any().refine(() => {
              throw new Error('Config validation failed');
            }),
          },
        },
      });

      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await expect(
        create({
          context: mockContext,
          action: {
            name: 'my name',
            actionTypeId: 'my-connector-type',
            config: { invalid: 'config' },
            secrets: {},
          },
        })
      ).rejects.toThrow('Config validation failed');
    });

    test('throws when secrets validation fails', async () => {
      const actionType = getConnectorType({
        id: 'my-connector-type',
        validate: {
          secrets: {
            schema: z.any().refine(() => {
              throw new Error('Secrets validation failed');
            }),
          },
        },
      });

      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await expect(
        create({
          context: mockContext,
          action: {
            name: 'my name',
            actionTypeId: 'my-connector-type',
            config: {},
            secrets: { invalid: 'secret' },
          },
        })
      ).rejects.toThrow('Secrets validation failed');
    });
  });

  describe('deprecated connectors', () => {
    test('marks connector as deprecated when action type is deprecated', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);
      (actionTypeRegistry.isDeprecated as jest.Mock).mockReturnValue(true);

      const result = await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: 'my-connector-type',
          config: {},
          secrets: {},
        },
      });

      expect(result.isConnectorTypeDeprecated).toBe(true);
    });

    test('marks connector as deprecated when attributes indicate deprecation', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: '.servicenow',
          isMissingSecrets: false,
          config: {
            usesTableApi: true,
          },
        },
        references: [],
      };
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      const result = await create({
        context: mockContext,
        action: {
          name: 'my name',
          actionTypeId: '.servicenow',
          config: {
            usesTableApi: true,
          },
          secrets: {},
        },
      });

      expect(result.isDeprecated).toBe(true);
    });
  });
});
