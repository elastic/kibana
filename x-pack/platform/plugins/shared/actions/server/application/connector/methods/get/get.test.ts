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
import type { AuthTypeRegistry } from '../../../../auth_types/auth_type_registry';
import { authTypeRegistryMock } from '../../../../auth_types/auth_type_registry.mock';
import { get } from './get';
import type { ActionsClientContext } from '../../../../actions_client';
import { getConnectorSo } from '../../../../data/connector';
import { connectorFromInMemoryConnector } from '../../lib/connector_from_in_memory_connector';
import type { InMemoryConnector } from '../../../../types';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

jest.mock('../../../../data/connector', () => ({
  getConnectorSo: jest.fn(),
}));

jest.mock('../../lib/connector_from_in_memory_connector', () => ({
  connectorFromInMemoryConnector: jest.fn(),
}));

const getConnectorSoMock = getConnectorSo as jest.Mock;
const connectorFromInMemoryConnectorMock = connectorFromInMemoryConnector as jest.Mock;

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

const authTypeRegistry = authTypeRegistryMock.create() as unknown as AuthTypeRegistry;

const mockContext: ActionsClientContext = {
  actionTypeRegistry,
  authTypeRegistry,
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

describe('get()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorization.ensureAuthorized.mockResolvedValue(undefined);
    (actionTypeRegistry.isDeprecated as jest.Mock).mockReturnValue(false);
  });

  describe('authorization', () => {
    test('ensures user is authorised to get connector', async () => {
      getConnectorSoMock.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          name: 'Test Connector',
          actionTypeId: '.webhook',
          config: {},
          isMissingSecrets: false,
        },
        references: [],
      });

      await get({
        context: mockContext,
        id: '1',
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: 'get',
      });
    });

    test('throws when user is not authorised to get connector', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized to get connector'));

      await expect(
        get({
          context: mockContext,
          id: '1',
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to get connector]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: 'get',
      });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when getting a connector from saved objects', async () => {
      getConnectorSoMock.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          name: 'Test Connector',
          actionTypeId: '.webhook',
          config: {},
          isMissingSecrets: false,
        },
        references: [],
      });

      await get({
        context: mockContext,
        id: '1',
      });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_get',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
        })
      );
    });

    test('logs audit event when getting an in-memory connector', async () => {
      const inMemoryConnector: InMemoryConnector = {
        id: 'preconfigured-1',
        actionTypeId: '.slack',
        name: 'Preconfigured Slack',
        isPreconfigured: true,
        isSystemAction: false,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        config: {},
        secrets: {},
      };

      connectorFromInMemoryConnectorMock.mockReturnValueOnce({
        id: 'preconfigured-1',
        actionTypeId: '.slack',
        name: 'Preconfigured Slack',
        isPreconfigured: true,
        isSystemAction: false,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        config: {},
      });

      await get({
        context: { ...mockContext, inMemoryConnectors: [inMemoryConnector] },
        id: 'preconfigured-1',
      });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_get',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: 'preconfigured-1', type: 'action' } },
        })
      );
    });

    test('logs audit event when not authorised to get a connector', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        get({
          context: mockContext,
          id: '1',
        })
      ).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_get',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
    });
  });

  describe('in-memory connectors', () => {
    test('gets a preconfigured connector successfully', async () => {
      const inMemoryConnector: InMemoryConnector = {
        id: 'preconfigured-1',
        actionTypeId: '.slack',
        name: 'Preconfigured Slack',
        isPreconfigured: true,
        isSystemAction: false,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        config: { webhookUrl: 'https://hooks.slack.com/services/xxx' },
        secrets: {},
      };

      const expectedConnector = {
        id: 'preconfigured-1',
        actionTypeId: '.slack',
        name: 'Preconfigured Slack',
        isPreconfigured: true,
        isSystemAction: false,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        config: { webhookUrl: 'https://hooks.slack.com/services/xxx' },
      };

      connectorFromInMemoryConnectorMock.mockReturnValueOnce(expectedConnector);

      const result = await get({
        context: { ...mockContext, inMemoryConnectors: [inMemoryConnector] },
        id: 'preconfigured-1',
      });

      expect(result).toEqual(expectedConnector);
      expect(connectorFromInMemoryConnectorMock).toHaveBeenCalledWith({
        id: 'preconfigured-1',
        inMemoryConnector,
        actionTypeRegistry,
      });
      expect(getConnectorSoMock).not.toHaveBeenCalled();
    });

    test('gets a system action when throwIfSystemAction is false', async () => {
      const inMemoryConnector: InMemoryConnector = {
        id: 'system-1',
        actionTypeId: '.cases',
        name: 'System Cases Connector',
        isPreconfigured: false,
        isSystemAction: true,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        config: {},
        secrets: {},
      };

      const expectedConnector = {
        id: 'system-1',
        actionTypeId: '.cases',
        name: 'System Cases Connector',
        isPreconfigured: false,
        isSystemAction: true,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
      };

      connectorFromInMemoryConnectorMock.mockReturnValueOnce(expectedConnector);

      const result = await get({
        context: { ...mockContext, inMemoryConnectors: [inMemoryConnector] },
        id: 'system-1',
        throwIfSystemAction: false,
      });

      expect(result).toEqual(expectedConnector);
      expect(connectorFromInMemoryConnectorMock).toHaveBeenCalled();
    });

    test('throws 404 for system action when throwIfSystemAction is true (default)', async () => {
      const inMemoryConnector: InMemoryConnector = {
        id: 'system-1',
        actionTypeId: '.cases',
        name: 'System Cases Connector',
        isPreconfigured: false,
        isSystemAction: true,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        config: {},
        secrets: {},
      };

      await expect(
        get({
          context: { ...mockContext, inMemoryConnectors: [inMemoryConnector] },
          id: 'system-1',
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Connector system-1 not found]`);

      expect(connectorFromInMemoryConnectorMock).not.toHaveBeenCalled();
    });

    test('throws 404 for system action when throwIfSystemAction is explicitly true', async () => {
      const inMemoryConnector: InMemoryConnector = {
        id: 'system-1',
        actionTypeId: '.cases',
        name: 'System Cases Connector',
        isPreconfigured: false,
        isSystemAction: true,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        config: {},
        secrets: {},
      };

      await expect(
        get({
          context: { ...mockContext, inMemoryConnectors: [inMemoryConnector] },
          id: 'system-1',
          throwIfSystemAction: true,
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Connector system-1 not found]`);

      expect(connectorFromInMemoryConnectorMock).not.toHaveBeenCalled();
    });
  });

  describe('saved object connectors', () => {
    test('gets a connector from saved objects successfully', async () => {
      getConnectorSoMock.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          name: 'Test Connector',
          actionTypeId: '.webhook',
          config: { url: 'https://example.com' },
          isMissingSecrets: false,
          authMode: 'shared',
        },
        references: [],
      });

      const result = await get({
        context: mockContext,
        id: '1',
      });

      expect(result).toEqual({
        id: '1',
        actionTypeId: '.webhook',
        name: 'Test Connector',
        config: { url: 'https://example.com' },
        isMissingSecrets: false,
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        authMode: 'shared',
      });

      expect(getConnectorSoMock).toHaveBeenCalledWith({
        unsecuredSavedObjectsClient,
        id: '1',
      });
    });

    test('gets a connector with authMode "shared"', async () => {
      getConnectorSoMock.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          name: 'Test Connector',
          actionTypeId: '.webhook',
          config: {},
          isMissingSecrets: false,
          authMode: 'shared',
        },
        references: [],
      });

      const result = await get({
        context: mockContext,
        id: '1',
      });

      expect(result.authMode).toBe('shared');
    });

    test('gets a connector with authMode "per-user"', async () => {
      getConnectorSoMock.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          name: 'Test Connector',
          actionTypeId: '.webhook',
          config: {
            authType: 'oauth_authorization_code',
          },
          isMissingSecrets: false,
          authMode: 'per-user',
        },
        references: [],
      });

      const result = await get({
        context: mockContext,
        id: '1',
      });

      expect(result.authMode).toBe('per-user');
    });

    test('defaults authMode to "shared" when not set', async () => {
      getConnectorSoMock.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          name: 'Test Connector',
          actionTypeId: '.slack',
          config: {},
          isMissingSecrets: false,
        },
        references: [],
      });

      const result = await get({
        context: mockContext,
        id: '1',
      });

      expect(result.authMode).toBe('shared');
    });

    test('sets isMissingSecrets correctly', async () => {
      getConnectorSoMock.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          name: 'Test Connector',
          actionTypeId: '.webhook',
          config: {},
          isMissingSecrets: true,
        },
        references: [],
      });

      const result = await get({
        context: mockContext,
        id: '1',
      });

      expect(result.isMissingSecrets).toBe(true);
    });

    test('sets isConnectorTypeDeprecated correctly', async () => {
      getConnectorSoMock.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          name: 'Test Connector',
          actionTypeId: '.pagerduty',
          config: {},
          isMissingSecrets: false,
        },
        references: [],
      });

      (actionTypeRegistry.isDeprecated as jest.Mock).mockReturnValueOnce(true);

      const result = await get({
        context: mockContext,
        id: '1',
      });

      expect(result.isConnectorTypeDeprecated).toBe(true);
      expect(actionTypeRegistry.isDeprecated).toHaveBeenCalledWith('.pagerduty');
    });

    test('marks connector as deprecated when attributes indicate deprecation', async () => {
      getConnectorSoMock.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          name: 'Test Connector',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: 'https://instance.service-now.com',
            usesTableApi: true,
          },
          isMissingSecrets: false,
        },
        references: [],
      });

      const result = await get({
        context: mockContext,
        id: '1',
      });

      expect(result.isDeprecated).toBe(true);
    });
  });

  describe('schema validation', () => {
    test('logs warning when connector fails validation but returns connector anyway', async () => {
      getConnectorSoMock.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          name: 'Test Connector',
          actionTypeId: '.webhook',
          config: {},
          isMissingSecrets: false,
        },
        references: [],
      });

      const result = await get({
        context: mockContext,
        id: '1',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.name).toBe('Test Connector');
    });

    test('does not throw when connector validation fails', async () => {
      getConnectorSoMock.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          name: 'Test Connector',
          actionTypeId: '.webhook',
          config: {},
          isMissingSecrets: false,
        },
        references: [],
      });

      await expect(
        get({
          context: mockContext,
          id: '1',
        })
      ).resolves.toBeDefined();
    });
  });
});
