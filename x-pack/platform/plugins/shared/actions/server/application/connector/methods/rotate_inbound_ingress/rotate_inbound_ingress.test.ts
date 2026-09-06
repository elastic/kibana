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
import { rotateInboundIngress } from './rotate_inbound_ingress';
import { getConnectorType } from '../../../../fixtures';
import type { ActionsClientContext } from '../../../../actions_client';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { computeIngestTokenHash } from '../../../../inbound/compute_ingest_token_hash';
import { connectorTypeHasInboundEvents } from '@kbn/connector-specs';

jest.mock('@kbn/connector-specs', () => {
  const actual = jest.requireActual('@kbn/connector-specs');
  return {
    ...actual,
    connectorTypeHasInboundEvents: jest.fn((actionTypeId: string) =>
      actual.connectorTypeHasInboundEvents(actionTypeId)
    ),
  };
});

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
const authorization = actionsAuthorizationMock.create();
const request = httpServerMock.createKibanaRequest();
const auditLogger = auditLoggerMock.create();
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
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
  spaceId: 'default',
};

const storedHash = 'b'.repeat(64);

const decryptedInbound = {
  id: 'connector-id',
  type: 'action',
  attributes: {
    actionTypeId: '.inboundWebhook',
    name: 'sales-ingress',
    isMissingSecrets: false,
    config: { ingestTokenHash: storedHash },
    secrets: {},
    authMode: 'shared',
    apiKey: 'stored-last-saver-key',
  },
  references: [],
  version: '1',
};

describe('rotateInboundIngress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (connectorTypeHasInboundEvents as jest.Mock).mockImplementation((actionTypeId: string) =>
      jest.requireActual('@kbn/connector-specs').connectorTypeHasInboundEvents(actionTypeId)
    );
    authorization.ensureAuthorized.mockResolvedValue(undefined);
    connectorTokenClient.deleteConnectorTokens.mockResolvedValue(undefined);
    authTypeRegistry.get.mockImplementation((authTypeId: string) => ({
      id: authTypeId,
      schema: z.object({}),
      configure: jest.fn(async (_ctx, axiosInstance) => axiosInstance),
    }));
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(
      decryptedInbound as never
    );
    unsecuredSavedObjectsClient.get.mockResolvedValue(decryptedInbound as never);
    unsecuredSavedObjectsClient.create.mockImplementation(async (_type, attributes) => ({
      id: 'connector-id',
      type: 'action',
      attributes,
      references: [],
    }));
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
  });

  it('remints credentials and returns the new token once', async () => {
    const result = await rotateInboundIngress({
      context: mockContext,
      id: 'connector-id',
    });

    expect(result.ingestToken).toEqual(expect.any(String));
    const saved = unsecuredSavedObjectsClient.create.mock.calls[0][1] as {
      config: { ingestTokenHash: string };
      apiKey?: string;
    };
    expect(saved.apiKey).toBe('stored-last-saver-key');
    expect(saved.config.ingestTokenHash).not.toBe(storedHash);
    expect(saved.config.ingestTokenHash).toBe(
      computeIngestTokenHash({
        connectorId: 'connector-id',
        spaceId: 'default',
        token: result.ingestToken,
      })
    );
  });

  it('rejects connectors that do not declare inbound events', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...decryptedInbound,
      attributes: {
        ...decryptedInbound.attributes,
        actionTypeId: '.slack',
      },
    } as never);

    await expect(
      rotateInboundIngress({ context: mockContext, id: 'connector-id' })
    ).rejects.toThrow('This connector does not use inbound ingest credentials.');
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
  });

  it('rotates ingest credentials for dual connectors that declare events', async () => {
    (connectorTypeHasInboundEvents as jest.Mock).mockImplementation(
      (actionTypeId: string) => actionTypeId === '.inboundWebhook' || actionTypeId === '.dual'
    );
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...decryptedInbound,
      attributes: {
        ...decryptedInbound.attributes,
        actionTypeId: '.dual',
      },
    } as never);
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

    const result = await rotateInboundIngress({
      context: mockContext,
      id: 'connector-id',
    });

    expect(result.ingestToken).toEqual(expect.any(String));
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalled();
  });
});
