/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { asSpaceId } from '@kbn/core-spaces-common';

import { loggerMock } from '@kbn/logging-mocks';
import { ActionTypeRegistry } from '../../../../action_type_registry';
import { ActionsClient } from '../../../../actions_client/actions_client';
import { ActionExecutor, TaskRunnerFactory } from '../../../../lib';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { actionsConfigMock } from '../../../../actions_config.mock';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import {
  httpServerMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import type { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { SavedObject } from '@kbn/core/server';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { inMemoryMetricsMock } from '../../../../monitoring/in_memory_metrics.mock';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { ConnectorRateLimiter } from '../../../../lib/connector_rate_limiter';
import { getConnectorType } from '../../../../fixtures';
import { createMockInMemoryConnector } from '../../mocks';
import { AuthTypeRegistry, registerAuthTypes } from '../../../../auth_types';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';

const defaultConnectorTypeId = '.connector-type-id';
const defaultConnectorId = 'connector-id';
const inMemoryConnectorTypeId = '.in-memory-type-id';
const inMemoryConnectorId = 'in-memory-id';
const username = 'user';
const password = 'super-secret-password';
const basicAuthorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

const kibanaIndices = ['.kibana'];
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
const actionExecutor = actionExecutorMock.create();
const authorization = actionsAuthorizationMock.create();
const bulkExecutionEnqueuer = jest.fn();
const request = httpServerMock.createKibanaRequest();
const auditLogger = auditLoggerMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
const taskManager = taskManagerMock.createSetup();
const eventLogClient = eventLogClientMock.create();
const getEventLogClient = jest.fn();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const getAxiosInstanceWithAuth = jest.fn();
const licenseState = licenseStateMock.create();
const licensing = licensingMock.createSetup();
const logger = loggerMock.create();
const connectorTokenClient = connectorTokenClientMock.create();
const inMemoryMetrics = inMemoryMetricsMock.create();
const getCurrentUserProfileId = jest.fn();

const secretsSchema = {
  schema: z
    .object({
      authType: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      tokenUrl: z.string().optional(),
      authorizationUrl: z.string().optional(),
      foobar: z.boolean().optional(),
    })
    .passthrough(),
};

const actionTypeIdFromSavedObjectMock = (actionTypeId = defaultConnectorTypeId) => {
  return {
    attributes: {
      actionTypeId,
      config: {
        apiUrl: 'https://example.com',
      },
    },
  } as SavedObject;
};

const connectorSavedObject = {
  id: defaultConnectorId,
  type: ACTION_SAVED_OBJECT_TYPE,
  attributes: {
    name: '1',
    actionTypeId: defaultConnectorTypeId,
    config: {
      apiUrl: 'https://example.com',
    },
    secrets: {
      authType: 'basic',
      username,
      password,
    },
    isMissingSecrets: false,
  },
  references: [],
};

const inMemoryConnectors = [
  createMockInMemoryConnector({
    id: inMemoryConnectorId,
    actionTypeId: inMemoryConnectorTypeId,
    isPreconfigured: true,
    config: {
      apiUrl: 'https://preconfigured.example.com',
    },
    secrets: {
      authType: 'basic',
      username,
      password,
    },
  }),
];

const getTestSandboxHosts = ({ config }: { config: Record<string, unknown> }): string[] => {
  const url = config.apiUrl ?? config.url;
  return typeof url === 'string' ? [new URL(url).hostname] : ['fallback.example.com'];
};

describe('getSandboxCredentials()', () => {
  let actionsClient: ActionsClient;
  let actionTypeRegistry: ActionTypeRegistry;
  let authTypeRegistry: AuthTypeRegistry;
  let actionsConfigUtils: ReturnType<typeof actionsConfigMock.create>;

  const createClient = (overrides: Partial<ConstructorParameters<typeof ActionsClient>[0]> = {}) =>
    new ActionsClient({
      logger,
      actionTypeRegistry,
      authTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      inMemoryConnectors,
      actionExecutor,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      auditLogger,
      usageCounter: mockUsageCounter,
      connectorTokenClient,
      getEventLogClient,
      encryptedSavedObjectsClient,
      isESOCanEncrypt: true,
      getAxiosInstanceWithAuth,
      getCurrentUserProfileId,
      ...overrides,
    });

  beforeEach(() => {
    jest.resetAllMocks();
    licenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
    actionsConfigUtils = actionsConfigMock.create();
    actionTypeRegistry = new ActionTypeRegistry({
      licensing,
      taskManager,
      taskRunnerFactory: new TaskRunnerFactory(
        new ActionExecutor({
          isESOCanEncrypt: true,
          connectorRateLimiter: new ConnectorRateLimiter({
            config: { email: { limit: 100, lookbackWindow: '1m' } },
          }),
        }),
        inMemoryMetrics
      ),
      actionsConfigUtils,
      licenseState,
      inMemoryConnectors,
    });
    actionTypeRegistry.register(
      getConnectorType({
        id: defaultConnectorTypeId,
        getSandboxHosts: getTestSandboxHosts,
        sandboxSupportedAuthTypes: ['basic', 'oauth_authorization_code'],
        validate: {
          config: { schema: z.object({ apiUrl: z.string().optional() }).passthrough() },
          secrets: secretsSchema,
        },
        executor: undefined,
      })
    );
    authTypeRegistry = new AuthTypeRegistry();
    registerAuthTypes(authTypeRegistry);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(connectorSavedObject);
    getEventLogClient.mockResolvedValue(eventLogClient);
    getCurrentUserProfileId.mockResolvedValue(undefined);
    actionsClient = createClient();
  });

  it('returns static basic-auth headers and config for a persisted connector', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());

    const result = await actionsClient.getSandboxCredentials({ id: defaultConnectorId });

    expect(result).toEqual({
      connectorId: defaultConnectorId,
      actionTypeId: defaultConnectorTypeId,
      config: { apiUrl: 'https://example.com' },
      headers: { Authorization: basicAuthorization },
      hosts: ['example.com'],
    });
    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      ACTION_SAVED_OBJECT_TYPE,
      defaultConnectorId,
      {}
    );
    expect(JSON.stringify(result)).not.toContain(password);
    expect(result).not.toHaveProperty('secrets');
  });

  it('decrypts persisted secrets in the current space namespace', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());
    actionsClient = createClient({ spaceId: asSpaceId('space-1') });

    await actionsClient.getSandboxCredentials({ id: defaultConnectorId });

    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      ACTION_SAVED_OBJECT_TYPE,
      defaultConnectorId,
      { namespace: 'space-1' }
    );
  });

  it('returns static basic-auth headers for a preconfigured connector without ESO', async () => {
    actionTypeRegistry.register(
      getConnectorType({
        id: inMemoryConnectorTypeId,
        getSandboxHosts: getTestSandboxHosts,
        sandboxSupportedAuthTypes: ['basic'],
        validate: {
          config: { schema: z.object({ apiUrl: z.string().optional() }).passthrough() },
          secrets: secretsSchema,
        },
        executor: undefined,
      })
    );

    const result = await actionsClient.getSandboxCredentials({ id: inMemoryConnectorId });

    expect(result).toEqual({
      connectorId: inMemoryConnectorId,
      actionTypeId: inMemoryConnectorTypeId,
      config: { apiUrl: 'https://preconfigured.example.com' },
      headers: { Authorization: basicAuthorization },
      hosts: ['preconfigured.example.com'],
    });
    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
  });

  it('allows a preconfigured connector when its action type is disabled', async () => {
    actionsConfigUtils.isActionTypeEnabled.mockReturnValue(false);
    actionTypeRegistry.register(
      getConnectorType({
        id: inMemoryConnectorTypeId,
        getSandboxHosts: getTestSandboxHosts,
        sandboxSupportedAuthTypes: ['basic'],
        validate: {
          config: { schema: z.object({ apiUrl: z.string().optional() }).passthrough() },
          secrets: secretsSchema,
        },
        executor: undefined,
      })
    );

    await expect(
      actionsClient.getSandboxCredentials({ id: inMemoryConnectorId })
    ).resolves.toMatchObject({ connectorId: inMemoryConnectorId });
    expect(actionsConfigUtils.ensureActionTypeEnabled).not.toHaveBeenCalled();
  });

  it('rejects a preconfigured connector when its action type license is invalid', async () => {
    licenseState.isLicenseValidForActionType.mockReturnValue({
      isValid: false,
      reason: 'invalid',
    });
    licenseState.ensureLicenseForActionType.mockImplementation(() => {
      throw new Error('Action type license is invalid');
    });
    actionTypeRegistry.register(
      getConnectorType({
        id: inMemoryConnectorTypeId,
        getSandboxHosts: getTestSandboxHosts,
        sandboxSupportedAuthTypes: ['basic'],
        validate: {
          config: { schema: z.object({ apiUrl: z.string().optional() }).passthrough() },
          secrets: secretsSchema,
        },
        executor: undefined,
      })
    );

    await expect(actionsClient.getSandboxCredentials({ id: inMemoryConnectorId })).rejects.toThrow(
      'Action type license is invalid'
    );
  });

  it('rejects a persisted connector when its action type is disabled', async () => {
    actionsConfigUtils.isActionTypeEnabled.mockReturnValue(false);
    actionsConfigUtils.ensureActionTypeEnabled.mockImplementation(() => {
      throw new Error('Action type is disabled');
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());

    await expect(actionsClient.getSandboxCredentials({ id: defaultConnectorId })).rejects.toThrow(
      'Action type is disabled'
    );
    expect(actionsConfigUtils.ensureActionTypeEnabled).toHaveBeenCalledWith(defaultConnectorTypeId);
  });

  describe('authorization', () => {
    it('ensures the caller can execute the connector', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());

      await actionsClient.getSandboxCredentials({ id: defaultConnectorId });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        actionTypeId: defaultConnectorTypeId,
        operation: 'execute',
        additionalPrivileges: [],
      });
    });

    it('throws when the caller cannot execute the connector', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to execute all actions`)
      );

      await expect(
        actionsClient.getSandboxCredentials({ id: defaultConnectorId })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to execute all actions]`);
    });
  });

  describe('validation', () => {
    it('fails when Encrypted Saved Objects cannot decrypt', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());
      actionsClient = createClient({ isESOCanEncrypt: false });

      await expect(actionsClient.getSandboxCredentials({ id: defaultConnectorId })).rejects.toThrow(
        /Encrypted Saved Objects plugin is missing encryption key/
      );
    });

    it('fails when decrypted secrets do not match the connector secrets schema', async () => {
      const newActionTypeId = '.validate-secrets';
      actionTypeRegistry.register(
        getConnectorType({
          id: newActionTypeId,
          getSandboxHosts: getTestSandboxHosts,
          validate: {
            config: { schema: z.object({}).passthrough() },
            secrets: { schema: z.object({ foobar: z.string() }) },
          },
          executor: undefined,
        })
      );
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        ...connectorSavedObject,
        attributes: {
          ...connectorSavedObject.attributes,
          actionTypeId: newActionTypeId,
          secrets: { foobar: true },
        },
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(
        actionTypeIdFromSavedObjectMock(newActionTypeId)
      );

      await expect(actionsClient.getSandboxCredentials({ id: defaultConnectorId })).rejects
        .toMatchInlineSnapshot(`
        [Error: error validating connector type secrets: ✖ Invalid input: expected string, received boolean
          → at foobar]
      `);
    });

    it('rejects system connectors', async () => {
      actionsClient = createClient({
        inMemoryConnectors: [
          createMockInMemoryConnector({
            id: inMemoryConnectorId,
            actionTypeId: inMemoryConnectorTypeId,
            isSystemAction: true,
            secrets: {
              authType: 'basic',
              username,
              password,
            },
          }),
        ],
      });
      actionTypeRegistry.register(
        getConnectorType({
          id: inMemoryConnectorTypeId,
          getSandboxHosts: getTestSandboxHosts,
          isSystemActionType: true,
          sandboxSupportedAuthTypes: ['basic'],
          validate: {
            config: { schema: z.object({}).passthrough() },
            secrets: secretsSchema,
          },
          executor: undefined,
        })
      );

      await expect(
        actionsClient.getSandboxCredentials({ id: inMemoryConnectorId })
      ).rejects.toThrow(/system connectors are not supported/);
    });

    it('rejects auth types that do not support sandbox', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        ...connectorSavedObject,
        attributes: {
          ...connectorSavedObject.attributes,
          secrets: {
            authType: 'api_key_header',
            apiKey: 'secret-key',
          },
        },
      });

      await expect(actionsClient.getSandboxCredentials({ id: defaultConnectorId })).rejects.toThrow(
        /auth type "api_key_header" does not support sandbox/
      );
    });
  });

  describe('sandbox hosts', () => {
    const registerWithHosts = (getSandboxHosts?: () => string[]) =>
      actionTypeRegistry.register(
        getConnectorType({
          id: inMemoryConnectorTypeId,
          ...(getSandboxHosts ? { getSandboxHosts } : {}),
          sandboxSupportedAuthTypes: ['basic'],
          validate: {
            config: { schema: z.object({ apiUrl: z.string().optional() }).passthrough() },
            secrets: secretsSchema,
          },
          executor: undefined,
        })
      );

    it('lowercases, trims, and deduplicates the hosts', async () => {
      registerWithHosts(() => [' API.example.com ', 'api.example.com', 'other.example.com']);

      const result = await actionsClient.getSandboxCredentials({ id: inMemoryConnectorId });

      expect(result.hosts).toEqual(['api.example.com', 'other.example.com']);
    });

    it.each([
      ['the action type has no getSandboxHosts hook', undefined],
      ['getSandboxHosts returns no hosts', () => []],
      ['getSandboxHosts only returns empty or wildcard hosts', () => ['', ' ', '*']],
    ])('fails closed when %s', async (_name, getSandboxHosts) => {
      registerWithHosts(getSandboxHosts);

      await expect(
        actionsClient.getSandboxCredentials({ id: inMemoryConnectorId })
      ).rejects.toThrow(/the connector declares no sandbox hosts/);
    });
  });

  describe('stack connector sandbox hooks', () => {
    const httpConnectorTypeId = 'test.http-sandbox';

    const httpSecretsSchema = {
      schema: z
        .object({
          secretHeaders: z
            .union([z.string(), z.record(z.string(), z.string())])
            .optional()
            .nullable(),
        })
        .passthrough(),
    };

    beforeEach(() => {
      actionTypeRegistry.register(
        getConnectorType({
          id: httpConnectorTypeId,
          getSandboxHosts: getTestSandboxHosts,
          isSandboxCapable: ({ config }: { config: Record<string, unknown> }) =>
            config.authType !== 'webhook-authentication-ssl',
          getSandboxAuthHeaders: ({ secrets }: { secrets: Record<string, unknown> }) =>
            typeof secrets.user === 'string' && typeof secrets.password === 'string'
              ? {
                  Authorization: `Basic ${Buffer.from(
                    `${secrets.user}:${secrets.password}`
                  ).toString('base64')}`,
                }
              : {},
          validate: {
            config: { schema: z.object({ url: z.string().optional() }).passthrough() },
            secrets: httpSecretsSchema,
          },
          executor: undefined,
        })
      );
    });

    const mockConnector = (
      config: Record<string, unknown>,
      secrets: Record<string, unknown>
    ): void => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: { actionTypeId: httpConnectorTypeId, config },
      } as SavedObject);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        ...connectorSavedObject,
        attributes: {
          ...connectorSavedObject.attributes,
          actionTypeId: httpConnectorTypeId,
          config,
          secrets,
        },
      });
    };

    it('returns the basic Authorization header built by getSandboxAuthHeaders', async () => {
      mockConnector({ url: 'https://es.example.com' }, { user: 'elastic', password: 'changeme' });

      const result = await actionsClient.getSandboxCredentials({ id: defaultConnectorId });

      expect(result.headers).toEqual({
        Authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
      });
    });

    it('awaits an async getSandboxAuthHeaders and merges its result', async () => {
      const asyncTypeId = 'test.http-sandbox-async';
      const getSandboxAuthHeaders = jest
        .fn()
        .mockResolvedValue({ Authorization: 'Bearer async-token' });
      actionTypeRegistry.register(
        getConnectorType({
          id: asyncTypeId,
          getSandboxHosts: getTestSandboxHosts,
          isSandboxCapable: () => true,
          getSandboxAuthHeaders,
          validate: {
            config: { schema: z.object({ url: z.string().optional() }).passthrough() },
            secrets: httpSecretsSchema,
          },
          executor: undefined,
        })
      );
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: { actionTypeId: asyncTypeId, config: { url: 'https://es.example.com' } },
      } as SavedObject);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        ...connectorSavedObject,
        attributes: {
          ...connectorSavedObject.attributes,
          actionTypeId: asyncTypeId,
          config: { url: 'https://es.example.com' },
          secrets: {},
        },
      });

      const result = await actionsClient.getSandboxCredentials({ id: defaultConnectorId });

      expect(getSandboxAuthHeaders).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: defaultConnectorId })
      );
      expect(result.headers).toEqual({ Authorization: 'Bearer async-token' });
    });

    it('does not merge secretHeaders itself and returns only the hook headers', async () => {
      mockConnector(
        { url: 'https://es.example.com' },
        {
          user: 'elastic',
          password: 'changeme',
          secretHeaders: { 'X-Extra': 'value' },
        }
      );

      const result = await actionsClient.getSandboxCredentials({ id: defaultConnectorId });

      expect(result.headers).toEqual({
        Authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
      });
    });

    it('passes preconfigured secrets to the hook and returns the hook headers', async () => {
      const preconfiguredId = 'preconfigured-http-sandbox';
      actionsClient = createClient({
        inMemoryConnectors: [
          createMockInMemoryConnector({
            id: preconfiguredId,
            actionTypeId: httpConnectorTypeId,
            isPreconfigured: true,
            config: { url: 'https://preconfigured.example.com' },
            secrets: { user: 'elastic', password: 'changeme' },
          }),
        ],
      });

      const result = await actionsClient.getSandboxCredentials({ id: preconfiguredId });

      expect(result.headers).toEqual({
        Authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
      });
    });
  });

  describe('oauth authorization code', () => {
    const oauthSecrets = {
      authType: 'oauth_authorization_code',
      clientId: 'client-id',
      clientSecret: 'oauth-client-secret',
      tokenUrl: 'https://example.com/token',
      authorizationUrl: 'https://example.com/authorize',
    };
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    const oauthToken = {
      id: 'token-1',
      profileUid: 'profile-1',
      connectorId: defaultConnectorId,
      credentialType: 'oauth',
      credentials: {
        accessToken: 'Bearer oauth-access-token',
        refreshToken: 'oauth-refresh-token',
      },
      expiresAt,
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockOAuthConnector = () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        ...connectorSavedObject,
        attributes: {
          ...connectorSavedObject.attributes,
          authMode: 'per-user',
          secrets: oauthSecrets,
        },
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: {
          actionTypeId: defaultConnectorTypeId,
          authMode: 'per-user',
          config: { apiUrl: 'https://example.com' },
        },
      } as SavedObject);
      getCurrentUserProfileId.mockResolvedValue('profile-1');
      connectorTokenClient.get.mockResolvedValue({
        hasErrors: false,
        connectorToken: oauthToken,
      });
    };

    it('returns the OAuth access-token header without client or refresh secrets', async () => {
      mockOAuthConnector();

      const result = await actionsClient.getSandboxCredentials({ id: defaultConnectorId });

      expect(result.headers.Authorization).toBe('Bearer oauth-access-token');
      expect(JSON.stringify(result)).not.toContain('oauth-client-secret');
      expect(JSON.stringify(result)).not.toContain('oauth-refresh-token');
    });
  });
});
