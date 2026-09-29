/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

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
import { parseIngestToken } from '../../../../inbound/ingress_credential';
import { CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import { connectorTypeHasInboundEvents, connectorTypeIsDual } from '@kbn/connector-specs';

vi.mock('@kbn/connector-specs', async () => {
  const actual = await vi.importActual('@kbn/connector-specs');
  return {
    ...actual,
    connectorTypeHasInboundEvents: vi.fn((actionTypeId: string) =>
      actual.connectorTypeHasInboundEvents(actionTypeId)
    ),
    connectorTypeIsDual: vi.fn((actionTypeId: string) => actual.connectorTypeIsDual(actionTypeId)),
  };
});

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
const authorization = actionsAuthorizationMock.create();
const request = httpServerMock.createKibanaRequest();
const auditLogger = auditLoggerMock.create();
const logger = loggingSystemMock.create().get() as Mocked<Logger>;
const actionExecutor = actionExecutorMock.create();
const connectorTokenClient = connectorTokenClientMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const bulkExecutionEnqueuer = vi.fn();
const getEventLogClient = vi.fn();
const getAxiosInstanceWithAuth = vi.fn();

const actionTypeRegistry: ActionTypeRegistry = {
  get: vi.fn(),
  isSystemActionType: vi.fn().mockReturnValue(false),
  ensureActionTypeEnabled: vi.fn(),
  isDeprecated: vi.fn().mockReturnValue(false),
  getUtils: vi.fn().mockReturnValue({
    isHostnameAllowed: vi.fn().mockReturnValue(true),
    isUriAllowed: vi.fn().mockReturnValue(true),
    getMicrosoftGraphApiUrl: vi.fn(),
    getProxySettings: vi.fn(),
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

const decryptedInbound = {
  id: 'connector-id',
  type: 'action',
  attributes: {
    actionTypeId: '.inboundWebhook',
    name: 'sales-ingress',
    isMissingSecrets: false,
    config: {},
    secrets: {},
    authMode: 'shared',
    apiKey: 'stored-last-saver-key',
  },
  references: [],
  version: '1',
};

describe('rotateInboundIngress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (connectorTypeHasInboundEvents as Mock).mockImplementation(async (actionTypeId: string) =>
      (await vi.importActual('@kbn/connector-specs')).connectorTypeHasInboundEvents(actionTypeId)
    );
    (connectorTypeIsDual as Mock).mockImplementation(async (actionTypeId: string) =>
      (await vi.importActual('@kbn/connector-specs')).connectorTypeIsDual(actionTypeId)
    );
    authorization.ensureAuthorized.mockResolvedValue(undefined);
    connectorTokenClient.deleteConnectorTokens.mockResolvedValue(undefined);
    authTypeRegistry.get.mockImplementation((authTypeId: string) => ({
      id: authTypeId,
      schema: z.object({}),
      configure: vi.fn(async (_ctx, axiosInstance) => axiosInstance),
    }));
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(
      decryptedInbound as never
    );
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      page: 1,
      per_page: 10,
    } as never);
    unsecuredSavedObjectsClient.create.mockImplementation(async (type, attributes, options) => ({
      id: options?.id ?? 'generated-id',
      type,
      attributes,
      references: options?.references ?? [],
    }));
    (actionTypeRegistry.get as Mock).mockReturnValue(
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

  it('mints a credential SO and returns the token once without writing connector config', async () => {
    const result = await rotateInboundIngress({
      context: mockContext,
      id: 'connector-id',
    });

    expect(result.ingestToken).toEqual(expect.any(String));
    const parsed = parseIngestToken(result.ingestToken);
    expect(parsed).toBeDefined();

    const created = unsecuredSavedObjectsClient.create.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE
    );
    expect(created).toBeDefined();
    expect(created?.[1]).toEqual(
      expect.objectContaining({
        connectorId: 'connector-id',
        ingestTokenHash: computeIngestTokenHash({
          connectorId: 'connector-id',
          spaceId: 'default',
          token: result.ingestToken,
        }),
      })
    );
    expect(created?.[2]).toEqual(
      expect.objectContaining({
        id: parsed?.credentialId,
      })
    );
    expect(created?.[2]).not.toEqual(expect.objectContaining({ overwrite: true }));
    expect(parsed?.credentialId).not.toBe('connector-id');
    expect(
      unsecuredSavedObjectsClient.create.mock.calls.some(
        (call: [string, ...unknown[]]) => call[0] === 'action'
      )
    ).toBe(false);
  });

  it('rejects connectors that do not declare inbound events', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
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

  it('mints the first ingest credential for a dual connector that has identity', async () => {
    (connectorTypeHasInboundEvents as Mock).mockImplementation(
      (actionTypeId: string) => actionTypeId === '.inboundWebhook' || actionTypeId === '.dual'
    );
    (connectorTypeIsDual as Mock).mockImplementation(
      (actionTypeId: string) => actionTypeId === '.dual'
    );
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      ...decryptedInbound,
      attributes: {
        ...decryptedInbound.attributes,
        actionTypeId: '.dual',
        hasInboundEventIdentity: true,
      },
    } as never);
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      ...decryptedInbound,
      attributes: {
        ...decryptedInbound.attributes,
        actionTypeId: '.dual',
        hasInboundEventIdentity: true,
      },
    } as never);
    (actionTypeRegistry.get as Mock).mockReturnValue(
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
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('rotates ingest credentials for dual connectors that already have a credential', async () => {
    (connectorTypeHasInboundEvents as Mock).mockImplementation(
      (actionTypeId: string) => actionTypeId === '.inboundWebhook' || actionTypeId === '.dual'
    );
    (connectorTypeIsDual as Mock).mockImplementation(
      (actionTypeId: string) => actionTypeId === '.dual'
    );
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      ...decryptedInbound,
      attributes: {
        ...decryptedInbound.attributes,
        actionTypeId: '.dual',
        hasInboundEventIdentity: true,
      },
    } as never);
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      ...decryptedInbound,
      attributes: {
        ...decryptedInbound.attributes,
        actionTypeId: '.dual',
        hasInboundEventIdentity: true,
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
    (actionTypeRegistry.get as Mock).mockReturnValue(
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
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('rejects dual connectors that are not enabled', async () => {
    (connectorTypeHasInboundEvents as Mock).mockImplementation(
      (actionTypeId: string) => actionTypeId === '.dual'
    );
    (connectorTypeIsDual as Mock).mockImplementation(
      (actionTypeId: string) => actionTypeId === '.dual'
    );
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      ...decryptedInbound,
      attributes: {
        ...decryptedInbound.attributes,
        actionTypeId: '.dual',
        apiKey: undefined,
      },
    } as never);

    await expect(
      rotateInboundIngress({ context: mockContext, id: 'connector-id' })
    ).rejects.toThrow('Inbound events are not enabled for this connector.');
    expect(
      unsecuredSavedObjectsClient.create.mock.calls.some(
        (call: [string, ...unknown[]]) => call[0] === CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE
      )
    ).toBe(false);
  });
});
