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
import { update } from './update';
import type { ActionsClientContext } from '../../../../actions_client';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

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
  get: jest.fn().mockReturnValue({ id: '.test', name: 'Test', minimumLicenseRequired: 'basic' }),
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
});

describe('update()', () => {
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

  describe('authorization', () => {
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
});
