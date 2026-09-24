/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectorSandboxSpec } from '@kbn/connector-specs';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import {
  httpServerMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { SavedObject } from '@kbn/core/server';
import { ActionTypeRegistry } from '../../../../action_type_registry';
import { ActionsClient } from '../../../../actions_client/actions_client';
import { ActionExecutor, TaskRunnerFactory } from '../../../../lib';
import { actionsConfigMock } from '../../../../actions_config.mock';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import type { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { inMemoryMetricsMock } from '../../../../monitoring/in_memory_metrics.mock';
import { ConnectorRateLimiter } from '../../../../lib/connector_rate_limiter';
import { getConnectorType } from '../../../../fixtures';
import { createMockInMemoryConnector } from '../../mocks';
import type { AuthTypeRegistry } from '../../../../auth_types/auth_type_registry';
import { authTypeRegistryMock } from '../../../../auth_types/auth_type_registry.mock';
import type { RawAction } from '../../../../types';
import type { InMemoryConnector } from '../../../../types';

const sandboxTypeId = '.sandbox-type';
const plainTypeId = '.plain-type';
const connectorId = 'connector-id';
const preconfiguredId = 'preconfigured-id';

const request = httpServerMock.createKibanaRequest();
const authorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();

const getEnvVars = jest.fn<
  ReturnType<ConnectorSandboxSpec['getEnvVars']>,
  Parameters<ConnectorSandboxSpec['getEnvVars']>
>();

const sandbox: ConnectorSandboxSpec = {
  envVars: {
    SERVICE_TOKEN: { description: 'API token', sensitive: true },
    SERVICE_URL: { description: 'API URL', sensitive: false },
  },
  getEnvVars,
};

const validate = {
  config: { schema: z.object({ url: z.string() }) },
  secrets: { schema: z.object({ token: z.string() }) },
};

const savedConnector = (attributes: Partial<RawAction> = {}) =>
  ({
    id: connectorId,
    type: 'action',
    attributes: {
      name: 'connector',
      actionTypeId: sandboxTypeId,
      config: { url: 'https://service.example' },
      secrets: { token: 'saved-token' },
      isMissingSecrets: false,
      ...attributes,
    },
    references: [],
  } as SavedObject<RawAction>);

const createClient = (inMemoryConnectors: InMemoryConnector[] = []) => {
  const actionTypeRegistry = new ActionTypeRegistry({
    licensing: licensingMock.createSetup(),
    taskManager: taskManagerMock.createSetup(),
    taskRunnerFactory: new TaskRunnerFactory(
      new ActionExecutor({
        isESOCanEncrypt: true,
        connectorRateLimiter: new ConnectorRateLimiter({
          config: { email: { limit: 100, lookbackWindow: '1m' } },
        }),
      }),
      inMemoryMetricsMock.create()
    ),
    actionsConfigUtils: actionsConfigMock.create(),
    licenseState: licenseStateMock.create(),
    inMemoryConnectors,
  });
  actionTypeRegistry.register(
    getConnectorType({
      id: sandboxTypeId,
      supportedFeatureIds: ['workflows', 'sandbox'],
      validate,
      sandbox,
    })
  );
  actionTypeRegistry.register(
    getConnectorType({ id: plainTypeId, supportedFeatureIds: ['workflows'], validate })
  );

  return new ActionsClient({
    logger: loggerMock.create(),
    actionTypeRegistry,
    authTypeRegistry: authTypeRegistryMock.create() as unknown as AuthTypeRegistry,
    unsecuredSavedObjectsClient: savedObjectsClientMock.create(),
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    kibanaIndices: ['.kibana'],
    inMemoryConnectors,
    actionExecutor: actionExecutorMock.create(),
    bulkExecutionEnqueuer: jest.fn(),
    request,
    authorization: authorization as unknown as ActionsAuthorization,
    auditLogger,
    connectorTokenClient: connectorTokenClientMock.create(),
    getEventLogClient: jest.fn(),
    encryptedSavedObjectsClient,
    isESOCanEncrypt: true,
    getAxiosInstanceWithAuth: jest.fn(),
  });
};

describe('getSandboxEnvVars()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getEnvVars.mockResolvedValue({
      SERVICE_TOKEN: 'saved-token',
      SERVICE_URL: 'https://service.example',
    });
  });

  it('returns the env vars of a saved connector and lists its sensitive values', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(savedConnector());

    await expect(createClient().getSandboxEnvVars(connectorId)).resolves.toEqual({
      env: { SERVICE_TOKEN: 'saved-token', SERVICE_URL: 'https://service.example' },
      sensitiveValues: ['saved-token'],
    });
    expect(getEnvVars).toHaveBeenCalledWith(
      expect.objectContaining({
        config: { url: 'https://service.example' },
        secrets: { token: 'saved-token' },
      })
    );
    expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'execute', actionTypeId: sandboxTypeId })
    );
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'connector_get_sandbox_env_vars',
          outcome: 'success',
        }),
      })
    );
  });

  it('reads preconfigured connectors from memory without decrypting', async () => {
    const client = createClient([
      createMockInMemoryConnector({
        id: preconfiguredId,
        actionTypeId: sandboxTypeId,
        isPreconfigured: true,
        config: { url: 'https://service.example' },
        secrets: { token: 'memory-token' },
      }),
    ]);

    await client.getSandboxEnvVars(preconfiguredId);

    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
    expect(getEnvVars).toHaveBeenCalledWith(
      expect.objectContaining({ secrets: { token: 'memory-token' } })
    );
  });

  it('rejects connector types that are not sandbox-enabled', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
      savedConnector({ actionTypeId: plainTypeId })
    );

    await expect(createClient().getSandboxEnvVars(connectorId)).rejects.toThrow(
      'does not support agent sandboxes'
    );
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
    );
  });

  it('does not call getEnvVars when the user is not authorized', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(savedConnector());
    authorization.ensureAuthorized.mockRejectedValueOnce(new Error('Unauthorized'));

    await expect(createClient().getSandboxEnvVars(connectorId)).rejects.toThrow('Unauthorized');
    expect(getEnvVars).not.toHaveBeenCalled();
  });

  it('rejects per-user connectors', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
      savedConnector({ authMode: 'per-user' })
    );

    await expect(createClient().getSandboxEnvVars(connectorId)).rejects.toThrow(
      'per-user authentication'
    );
    expect(getEnvVars).not.toHaveBeenCalled();
  });

  it('rejects env vars that do not match the declaration', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(savedConnector());
    getEnvVars.mockResolvedValueOnce({ SERVICE_TOKEN: 'saved-token', EXTRA: 'value' });

    await expect(createClient().getSandboxEnvVars(connectorId)).rejects.toThrow(
      'missing: [SERVICE_URL], undeclared: [EXTRA]'
    );
  });
});
