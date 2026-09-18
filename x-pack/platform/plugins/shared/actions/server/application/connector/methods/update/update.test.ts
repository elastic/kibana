/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import type { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import type { ActionTypeRegistry } from '../../../../action_type_registry';
import type { AuthTypeRegistry } from '../../../../auth_types/auth_type_registry';
import { authTypeRegistryMock } from '../../../../auth_types/auth_type_registry.mock';
import { update } from './update';
import { getConnectorType } from '../../../../fixtures';
import type { ActionsClientContext } from '../../../../actions_client';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { securityServiceMock } from '@kbn/core/server/mocks';
import { encodeApiKey } from '../../../../inbound/event_identity/encode_api_key';
import { CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import { connectorTypeHasInboundEvents, connectorTypeIsDual } from '@kbn/connector-specs';

jest.mock('@kbn/connector-specs', () => {
  const actual = jest.requireActual('@kbn/connector-specs');
  return {
    ...actual,
    connectorTypeHasInboundEvents: jest.fn((actionTypeId: string) =>
      actual.connectorTypeHasInboundEvents(actionTypeId)
    ),
    connectorTypeIsDual: jest.fn((actionTypeId: string) =>
      actual.connectorTypeIsDual(actionTypeId)
    ),
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

const authTypeRegistry = authTypeRegistryMock.create();

const mockContext: ActionsClientContext = {
  actionTypeRegistry,
  authTypeRegistry: authTypeRegistry as unknown as AuthTypeRegistry,
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

const existingRawAction = {
  id: 'connector-id',
  type: 'action',
  attributes: {
    actionTypeId: 'my-connector-type',
    name: 'old name',
    isMissingSecrets: false,
    config: { oldField: 'old' },
    secrets: { oldSecret: 'old' },
    authMode: 'shared',
  },
  references: [],
  version: '1',
};

const savedObjectCreateResult = {
  id: 'connector-id',
  type: 'action',
  attributes: {
    actionTypeId: 'my-connector-type',
    name: 'new name',
    isMissingSecrets: false,
    config: { field: 'value' },
    authMode: 'shared',
  },
  references: [],
};

const makeSavedObjectResult = (attributes: Record<string, unknown>) => ({
  id: '1',
  type: 'action',
  attributes: {
    actionTypeId: '.test',
    name: 'Test Connector',
    isMissingSecrets: false,
    config: {},
    secrets: {},
    ...attributes,
  },
  references: [],
});

beforeEach(() => {
  jest.clearAllMocks();
  authorization.ensureAuthorized.mockResolvedValue(undefined);
  connectorTokenClient.deleteConnectorTokens.mockResolvedValue(undefined);
  authTypeRegistry.get.mockImplementation((authTypeId: string) => ({
    id: authTypeId,
    schema: z.object({}),
    configure: jest.fn(async (_ctx, axiosInstance) => axiosInstance),
    authMode: authTypeId === 'oauth_authorization_code' ? 'per-user' : 'shared',
  }));
});

describe('update()', () => {
  beforeEach(() => {
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingRawAction as never);
    unsecuredSavedObjectsClient.create.mockResolvedValue(savedObjectCreateResult as never);
    (actionTypeRegistry.get as jest.Mock).mockReturnValue(
      getConnectorType({
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
        },
      })
    );
  });

  describe('authMode in returned connector', () => {
    test('returns authMode "shared" when saved object has authMode "shared"', async () => {
      const soResult = makeSavedObjectResult({ authMode: 'shared' });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soResult);
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(soResult);

      const result = await update({
        context: mockContext,
        id: '1',
        action: { name: 'Test Connector', config: {}, secrets: {} },
      });

      expect(result.authMode).toBe('shared');
    });

    test('returns authMode "per-user" when saved object has authMode "per-user"', async () => {
      const soResult = makeSavedObjectResult({ authMode: 'per-user' });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soResult);
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(soResult);

      const result = await update({
        context: mockContext,
        id: '1',
        action: { name: 'Test Connector', config: {}, secrets: {} },
      });

      expect(result.authMode).toBe('per-user');
    });

    test('defaults authMode to "shared" when not set in saved object', async () => {
      const soResult = makeSavedObjectResult({});
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soResult);
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(soResult);

      const result = await update({
        context: mockContext,
        id: '1',
        action: { name: 'Test Connector', config: {}, secrets: {} },
      });

      expect(result.authMode).toBe('shared');
    });
  });

  describe('authType change restrictions', () => {
    test('rejects changing a per-user connector authType', async () => {
      const soResult = makeSavedObjectResult({
        authMode: 'per-user',
        secrets: { authType: 'oauth_authorization_code' },
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soResult);

      await expect(
        update({
          context: mockContext,
          id: '1',
          action: {
            name: 'Test Connector',
            config: {},
            secrets: { authType: 'bearer' },
          },
        })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Authentication type cannot be changed for per-user connectors. Connector: 1.]`
      );

      expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    });

    test('rejects changing a shared connector to a per-user authType', async () => {
      const soResult = makeSavedObjectResult({
        authMode: 'shared',
        secrets: { authType: 'bearer' },
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soResult);

      await expect(
        update({
          context: mockContext,
          id: '1',
          action: {
            name: 'Test Connector',
            config: {},
            secrets: { authType: 'oauth_authorization_code' },
          },
        })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Authentication type cannot be changed to a per-user type for shared connectors. Connector: 1.]`
      );

      expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    });

    test('allows updating a per-user connector when authType does not change', async () => {
      const soResult = makeSavedObjectResult({
        authMode: 'per-user',
        secrets: { authType: 'oauth_authorization_code' },
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soResult);
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(soResult);

      const result = await update({
        context: mockContext,
        id: '1',
        action: {
          name: 'Test Connector',
          config: {},
          secrets: { authType: 'oauth_authorization_code' },
        },
      });

      expect(result.authMode).toBe('per-user');
    });
  });

  describe('Kibana managed auth types', () => {
    test('rejects switching an existing connector to a Kibana managed auth type', async () => {
      const soResult = makeSavedObjectResult({
        actionTypeId: '.slack2',
        authMode: 'shared',
        secrets: { authType: 'bearer' },
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soResult);

      await expect(
        update({
          context: mockContext,
          id: '1',
          action: {
            name: 'Test Connector',
            config: {},
            secrets: { authType: 'relay', tenantKey: 'tenant-A' },
          },
        })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Authentication type relay is set by Kibana and cannot be configured on a connector. Action type: .slack2.]`
      );

      expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    });
  });

  describe('spec connector config.authType on update', () => {
    test('rejects changing per-user auth type when saved config.authType is present', async () => {
      const soResult = makeSavedObjectResult({
        authMode: 'per-user',
        config: { authType: 'oauth_authorization_code' },
        secrets: {},
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soResult);

      const actionType = getConnectorType({
        source: ACTION_TYPE_SOURCES.spec,
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
        },
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await expect(
        update({
          context: mockContext,
          id: '1',
          action: {
            name: 'Test Connector',
            config: {},
            secrets: { authType: 'bearer' },
          },
        })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Authentication type cannot be changed for per-user connectors. Connector: 1.]`
      );

      expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    });

    test('persists config.authType from secrets when config is empty (spec source)', async () => {
      const soResult = makeSavedObjectResult({
        authMode: 'shared',
        config: { authType: 'bearer' },
        secrets: {},
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soResult);
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(soResult);

      const actionType = getConnectorType({
        source: ACTION_TYPE_SOURCES.spec,
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
        },
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await update({
        context: mockContext,
        id: '1',
        action: {
          name: 'Test Connector',
          config: {},
          secrets: { authType: 'bearer', token: 'secret' },
        },
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'action',
        expect.objectContaining({
          config: { authType: 'bearer' },
          secrets: { authType: 'bearer', token: 'secret' },
        }),
        expect.anything()
      );
    });

    test('does not inject config.authType for stack source on update', async () => {
      const soResult = makeSavedObjectResult({
        authMode: 'shared',
        config: {},
        secrets: {},
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soResult);
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(soResult);

      const actionType = getConnectorType({
        source: ACTION_TYPE_SOURCES.stack,
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
        },
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await update({
        context: mockContext,
        id: '1',
        action: {
          name: 'Test Connector',
          config: {},
          secrets: { authType: 'bearer', token: 't' },
        },
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'action',
        expect.objectContaining({
          config: {},
          secrets: { authType: 'bearer', token: 't' },
        }),
        expect.anything()
      );
    });
  });

  describe('authorization', () => {
    test('ensures user is authorised to update this type of action', async () => {
      await update({
        context: mockContext,
        id: 'connector-id',
        action: { name: 'new name', config: {}, secrets: {} },
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'update' });
    });

    test('throws when user is not authorised to update', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized to update'));

      await expect(
        update({
          context: mockContext,
          id: 'connector-id',
          action: { name: 'new name', config: {}, secrets: {} },
        })
      ).rejects.toThrow('Unauthorized to update');
    });

    test('ensures user is authorised to update connector', async () => {
      const soResult = makeSavedObjectResult({});
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soResult);
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(soResult);

      await update({
        context: mockContext,
        id: '1',
        action: { name: 'Test Connector', config: {}, secrets: {} },
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'update' });
    });

    test('throws when user is not authorised to update connector', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error('Unauthorized to update connector')
      );

      await expect(
        update({
          context: mockContext,
          id: '1',
          action: { name: 'Test Connector', config: {}, secrets: {} },
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to update connector]`);
    });
  });

  describe('preconfigured and system action guards', () => {
    test('throws when updating a system action', async () => {
      const contextWithSystemAction = {
        ...mockContext,
        inMemoryConnectors: [
          {
            id: 'connector-id',
            actionTypeId: 'my-connector-type',
            name: 'System Action',
            isSystemAction: true,
            isPreconfigured: false,
            config: {},
            secrets: {},
            isDeprecated: false,
            isConnectorTypeDeprecated: false,
          },
        ],
      };

      await expect(
        update({
          context: contextWithSystemAction,
          id: 'connector-id',
          action: { name: 'new name', config: {}, secrets: {} },
        })
      ).rejects.toThrow('System action connector-id can not be updated.');
    });

    test('throws when updating a preconfigured connector', async () => {
      const contextWithPreconfigured = {
        ...mockContext,
        inMemoryConnectors: [
          {
            id: 'connector-id',
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
        update({
          context: contextWithPreconfigured,
          id: 'connector-id',
          action: { name: 'new name', config: {}, secrets: {} },
        })
      ).rejects.toThrow('Preconfigured action connector-id can not be updated.');
    });

    test('throws when trying to update a preconfigured connector', async () => {
      await expect(
        update({
          context: {
            ...mockContext,
            inMemoryConnectors: [
              {
                id: '1',
                isPreconfigured: true,
                isSystemAction: false,
                actionTypeId: '.test',
                name: 'Test',
                isDeprecated: false,
                isConnectorTypeDeprecated: false,
                config: {},
                secrets: {},
              },
            ],
          },
          id: '1',
          action: { name: 'Test Connector', config: {}, secrets: {} },
        })
      ).rejects.toThrow();
    });
  });

  describe('schema validation', () => {
    test('validates config with the connector type schema and persists transformed value', async () => {
      const actionType = getConnectorType({
        validate: {
          config: { schema: z.any().transform(() => ({ validated: true })) },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
        },
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await update({
        context: mockContext,
        id: 'connector-id',
        action: { name: 'new name', config: { raw: true }, secrets: {} },
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'action',
        expect.objectContaining({ config: { validated: true } }),
        expect.anything()
      );
    });

    test('validates secrets with the connector type schema and persists transformed value', async () => {
      const actionType = getConnectorType({
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.any().transform(() => ({ validatedSecret: true })) },
          params: { schema: z.object({}) },
        },
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await update({
        context: mockContext,
        id: 'connector-id',
        action: { name: 'new name', config: {}, secrets: { raw: 'secret' } },
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'action',
        expect.objectContaining({ secrets: { validatedSecret: true } }),
        expect.anything()
      );
    });

    test('throws when config fails schema validation', async () => {
      const actionType = getConnectorType({
        validate: {
          config: { schema: z.object({ requiredField: z.string() }) },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
        },
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await expect(
        update({
          context: mockContext,
          id: 'connector-id',
          action: { name: 'new name', config: {}, secrets: {} },
        })
      ).rejects.toThrow(/error validating connector type config/);
    });

    test('throws when secrets fail schema validation', async () => {
      const actionType = getConnectorType({
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.object({ apiKey: z.string() }) },
          params: { schema: z.object({}) },
        },
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await expect(
        update({
          context: mockContext,
          id: 'connector-id',
          action: { name: 'new name', config: {}, secrets: {} },
        })
      ).rejects.toThrow(/error validating connector type secrets/);
    });

    test('calls validateConnector when connector validator is defined', async () => {
      const connectorValidator = jest.fn().mockReturnValue(null);
      const actionType = getConnectorType({
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
          connector: connectorValidator,
        },
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await update({
        context: mockContext,
        id: 'connector-id',
        action: { name: 'new name', config: { url: 'https://example.com' }, secrets: { key: 'k' } },
      });

      expect(connectorValidator).toHaveBeenCalledWith({ url: 'https://example.com' }, { key: 'k' });
    });

    test('throws when connector validator returns an error', async () => {
      const actionType = getConnectorType({
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
          connector: () => 'config and secrets are incompatible',
        },
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await expect(
        update({
          context: mockContext,
          id: 'connector-id',
          action: { name: 'new name', config: {}, secrets: {} },
        })
      ).rejects.toThrow(
        /error validating action type connector.*config and secrets are incompatible/
      );
    });

    test('throws when config has wrong type for Zod schema', async () => {
      const actionType = getConnectorType({
        validate: {
          config: { schema: z.object({ port: z.number() }) },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
        },
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await expect(
        update({
          context: mockContext,
          id: 'connector-id',
          action: { name: 'new name', config: { port: 'not-a-number' }, secrets: {} },
        })
      ).rejects.toThrow(/error validating connector type config/);
    });

    test('throws when secrets have wrong type for Zod schema', async () => {
      const actionType = getConnectorType({
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.object({ apiKey: z.string() }) },
          params: { schema: z.object({}) },
        },
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await expect(
        update({
          context: mockContext,
          id: 'connector-id',
          action: { name: 'new name', config: {}, secrets: { apiKey: 12345 } },
        })
      ).rejects.toThrow(/error validating connector type secrets/);
    });
  });

  describe('successful update', () => {
    test('returns the updated connector', async () => {
      const result = await update({
        context: mockContext,
        id: 'connector-id',
        action: { name: 'new name', config: { field: 'value' }, secrets: {} },
      });

      expect(result).toEqual({
        id: 'connector-id',
        actionTypeId: 'my-connector-type',
        name: 'new name',
        isMissingSecrets: false,
        config: { field: 'value' },
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        authMode: 'shared',
      });
    });

    test('persists the validated config and secrets to saved objects', async () => {
      await update({
        context: mockContext,
        id: 'connector-id',
        action: { name: 'new name', config: { field: 'value' }, secrets: { key: 'secret' } },
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'action',
        expect.objectContaining({
          name: 'new name',
          isMissingSecrets: false,
        }),
        expect.objectContaining({ id: 'connector-id', overwrite: true })
      );
    });

    test('ensures action type is enabled before saving', async () => {
      await update({
        context: mockContext,
        id: 'connector-id',
        action: { name: 'new name', config: {}, secrets: {} },
      });

      expect(actionTypeRegistry.ensureActionTypeEnabled).toHaveBeenCalledWith('my-connector-type');
    });

    test('deletes connector tokens after a successful update', async () => {
      await update({
        context: mockContext,
        id: 'connector-id',
        action: { name: 'new name', config: {}, secrets: {} },
      });

      expect(connectorTokenClient.deleteConnectorTokens).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: 'connector-id', skipRevocation: true })
      );
    });

    test('evicts clients before deleting connector tokens', async () => {
      const callOrder: string[] = [];
      const evictClientPool = jest.fn().mockImplementation(async () => {
        callOrder.push('evictClientPoolStarted');
        await Promise.resolve();
        callOrder.push('evictClientPoolFinished');
      });
      connectorTokenClient.deleteConnectorTokens.mockImplementationOnce(async () => {
        callOrder.push('deleteConnectorTokens');
      });

      await update({
        context: { ...mockContext, evictClientPool },
        id: 'connector-id',
        action: { name: 'new name', config: {}, secrets: {} },
      });

      expect(evictClientPool).toHaveBeenCalledWith('connector-id');
      expect(callOrder).toEqual([
        'evictClientPoolStarted',
        'evictClientPoolFinished',
        'deleteConnectorTokens',
      ]);
    });
  });

  describe('auditLogger', () => {
    test('logs audit event on successful update', async () => {
      await update({
        context: mockContext,
        id: 'connector-id',
        action: { name: 'new name', config: {}, secrets: {} },
      });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_update',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: 'connector-id', type: 'action' } },
        })
      );
    });

    test('logs audit event when not authorised to update', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        update({
          context: mockContext,
          id: 'connector-id',
          action: { name: 'new name', config: {}, secrets: {} },
        })
      ).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({ action: 'connector_update' }),
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
    });
  });

  describe('hooks', () => {
    test('calls preSaveHook before saving when defined', async () => {
      const actionType = getConnectorType({
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
        },
        preSaveHook,
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await update({
        context: mockContext,
        id: 'connector-id',
        action: { name: 'new name', config: { url: 'https://example.com' }, secrets: {} },
      });

      expect(preSaveHook).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'connector-id',
          isUpdate: true,
          config: { url: 'https://example.com' },
        })
      );
    });

    test('throws when preSaveHook throws', async () => {
      preSaveHook.mockRejectedValue(new Error('pre-save failed'));
      const actionType = getConnectorType({
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
        },
        preSaveHook,
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await expect(
        update({
          context: mockContext,
          id: 'connector-id',
          action: { name: 'new name', config: {}, secrets: {} },
        })
      ).rejects.toThrow('pre-save failed');
    });

    test('calls postSaveHook after saving when defined', async () => {
      const actionType = getConnectorType({
        validate: {
          config: { schema: z.any() },
          secrets: { schema: z.any() },
          params: { schema: z.object({}) },
        },
        postSaveHook,
      });
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);

      await update({
        context: mockContext,
        id: 'connector-id',
        action: { name: 'new name', config: {}, secrets: {} },
      });

      expect(postSaveHook).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'connector-id',
          isUpdate: true,
          wasSuccessful: true,
        })
      );
    });
  });

  describe('inbound ingress credentials', () => {
    const securityService = securityServiceMock.createStart();
    const inboundContext: ActionsClientContext = {
      ...mockContext,
      spaceId: 'default',
      securityService,
    };

    const previousApiKey = encodeApiKey('old-id', 'old-secret');
    const nextApiKey = encodeApiKey('es-id', 'es-secret');

    beforeEach(() => {
      (securityService.authc.apiKeys as { uiam?: unknown }).uiam = undefined;
      securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
        id: 'es-id',
        name: 'Actions: connector event identity connector-id',
        api_key: 'es-secret',
      });
      securityService.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: ['old-id'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        ...existingRawAction,
        attributes: {
          ...existingRawAction.attributes,
          actionTypeId: '.inboundWebhook',
          config: {},
          apiKey: previousApiKey,
        },
      } as never);
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(
        getConnectorType({
          id: '.inboundWebhook',
          source: ACTION_TYPE_SOURCES.spec,
          validate: {
            config: { schema: z.any() },
            secrets: { schema: z.any() },
            params: { schema: z.object({}) },
          },
        })
      );
      unsecuredSavedObjectsClient.create.mockImplementation(async (_type, attributes) => ({
        id: 'connector-id',
        type: 'action',
        attributes,
        references: [],
      }));
    });

    test('remints the last-saver API key and invalidates the previous framework key', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        ...existingRawAction,
        attributes: {
          ...existingRawAction.attributes,
          actionTypeId: '.inboundWebhook',
          config: {},
        },
      } as never);

      await update({
        context: inboundContext,
        id: 'connector-id',
        action: { name: 'renamed', config: {}, secrets: {} },
      });

      const saved = unsecuredSavedObjectsClient.create.mock.calls[0][1] as {
        apiKey?: string;
        secrets: Record<string, unknown>;
      };
      expect(saved.apiKey).toBe(nextApiKey);
      expect(saved.secrets).toEqual({});
      expect(securityService.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
        ids: ['old-id'],
      });
    });

    test('ignores a client-supplied apiKey on update', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        ...existingRawAction,
        attributes: {
          ...existingRawAction.attributes,
          actionTypeId: '.inboundWebhook',
          config: {},
          apiKey: 'from-client',
        },
      } as never);

      await update({
        context: inboundContext,
        id: 'connector-id',
        action: { name: 'renamed', config: {}, secrets: {} },
      });

      const saved = unsecuredSavedObjectsClient.create.mock.calls[0][1] as {
        apiKey?: string;
      };
      expect(saved.apiKey).toBe(nextApiKey);
    });

    test('returns 400 when encryption is unavailable', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        ...existingRawAction,
        attributes: {
          ...existingRawAction.attributes,
          actionTypeId: '.inboundWebhook',
          config: {},
        },
      } as never);

      await expect(
        update({
          context: { ...inboundContext, isESOCanEncrypt: false },
          id: 'connector-id',
          action: { name: 'renamed', config: {}, secrets: {} },
        })
      ).rejects.toThrow('encrypted saved objects are not available');
      expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    });
  });

  describe('dual connector inbound events', () => {
    const securityService = securityServiceMock.createStart();
    const dualContext: ActionsClientContext = {
      ...mockContext,
      spaceId: 'default',
      securityService,
    };

    const dualExisting = {
      ...existingRawAction,
      attributes: {
        ...existingRawAction.attributes,
        actionTypeId: '.dual',
        config: {},
      },
    };

    beforeEach(() => {
      (connectorTypeIsDual as jest.Mock).mockImplementation(
        (actionTypeId: string) => actionTypeId === '.dual'
      );
      (connectorTypeHasInboundEvents as jest.Mock).mockImplementation(
        (actionTypeId: string) => actionTypeId === '.dual' || actionTypeId === '.inboundWebhook'
      );
      (securityService.authc.apiKeys as { uiam?: unknown }).uiam = undefined;
      securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
        id: 'es-id',
        name: 'Actions: connector event identity connector-id',
        api_key: 'es-secret',
      });
      securityService.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: ['old-id'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(
        dualExisting as never
      );
      (actionTypeRegistry.get as jest.Mock).mockReturnValue(
        getConnectorType({
          id: '.dual',
          source: ACTION_TYPE_SOURCES.spec,
          validate: {
            config: { schema: z.any() },
            secrets: { schema: z.any() },
            params: { schema: z.object({}) },
          },
        })
      );
      unsecuredSavedObjectsClient.get.mockResolvedValue(dualExisting as never);
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 10,
      } as never);
      unsecuredSavedObjectsClient.create.mockImplementation(async (type, attributes, options) => ({
        id: options?.id ?? 'connector-id',
        type,
        attributes,
        references: options?.references ?? [],
      }));
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [],
      } as never);
    });

    test('omitted flag keeps inbound off and does not mint identity', async () => {
      const result = await update({
        context: dualContext,
        id: 'connector-id',
        action: { name: 'renamed', config: {}, secrets: {} },
      });

      const actionCreates = unsecuredSavedObjectsClient.create.mock.calls.filter(
        (call) => call[0] === 'action'
      );
      expect((actionCreates[0][1] as { apiKey?: string }).apiKey).toBeUndefined();
      expect(result.inboundEventsEnabled).toBe(false);
    });

    test('enabling mints identity only', async () => {
      const result = await update({
        context: dualContext,
        id: 'connector-id',
        action: { name: 'renamed', config: {}, secrets: {}, inboundEventsEnabled: true },
      });

      expect(result.inboundEventsEnabled).toBe(true);
      expect(securityService.authc.apiKeys.grantAsInternalUser).toHaveBeenCalled();
      const saved = unsecuredSavedObjectsClient.create.mock.calls.find(
        (call) => call[0] === 'action'
      )?.[1] as { apiKey?: string };
      expect(saved.apiKey).toBe(encodeApiKey('es-id', 'es-secret'));
      expect(
        unsecuredSavedObjectsClient.create.mock.calls.every((call) => call[0] === 'action')
      ).toBe(true);
    });

    test('disabling deletes credentials and does not remint identity', async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        ...dualExisting,
        attributes: {
          ...dualExisting.attributes,
          apiKey: encodeApiKey('old-id', 'old-secret'),
        },
      } as never);
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'cred-1',
            type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
            attributes: { connectorId: 'connector-id' },
            references: [],
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      } as never);
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [{ id: 'cred-1', success: true }],
      } as never);

      const result = await update({
        context: dualContext,
        id: 'connector-id',
        action: { name: 'renamed', config: {}, secrets: {}, inboundEventsEnabled: false },
      });

      expect(result.inboundEventsEnabled).toBe(false);
      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalled();
      const actionCreates = unsecuredSavedObjectsClient.create.mock.calls.filter(
        (call) => call[0] === 'action'
      );
      expect((actionCreates[0][1] as { apiKey?: string }).apiKey).toBeUndefined();
      const bulkDeleteOrder = unsecuredSavedObjectsClient.bulkDelete.mock.invocationCallOrder[0];
      const actionCreateOrder = unsecuredSavedObjectsClient.create.mock.invocationCallOrder.find(
        (_, index) => unsecuredSavedObjectsClient.create.mock.calls[index][0] === 'action'
      );
      expect(bulkDeleteOrder).toBeLessThan(actionCreateOrder ?? Number.POSITIVE_INFINITY);
    });

    test('rejects the flag on a non-dual type', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValue({
        ...dualExisting,
        attributes: {
          ...dualExisting.attributes,
          actionTypeId: '.slack',
        },
      } as never);

      await expect(
        update({
          context: dualContext,
          id: 'connector-id',
          action: { name: 'renamed', config: {}, secrets: {}, inboundEventsEnabled: true },
        })
      ).rejects.toThrow(
        'Inbound events can only be turned on for connectors that both send and receive.'
      );
    });
  });
});
