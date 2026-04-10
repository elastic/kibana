/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '../../../../actions_client';
import type { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { getOAuthJwtAccessToken } from '../../../../lib/get_oauth_jwt_access_token';
import { getOAuthClientCredentialsAccessToken } from '../../../../lib/get_oauth_client_credentials_access_token';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Logger } from '@kbn/logging';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import type { ActionTypeRegistry } from '../../../../action_type_registry';
import { createMockInMemoryConnector } from '../../mocks';
import type { InMemoryConnector } from '../../../../types';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { AuthTypeRegistry } from '../../../../auth_types/auth_type_registry';
import { authTypeRegistryMock } from '../../../../auth_types/auth_type_registry.mock';

jest.mock('../../../../lib/get_oauth_jwt_access_token', () => ({
  getOAuthJwtAccessToken: jest.fn(),
}));
jest.mock('../../../../lib/get_oauth_client_credentials_access_token', () => ({
  getOAuthClientCredentialsAccessToken: jest.fn(),
}));

const kibanaIndices = ['.kibana'];
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
const actionExecutor = actionExecutorMock.create();
const authorization = actionsAuthorizationMock.create();
const bulkExecutionEnqueuer = jest.fn();
const request = httpServerMock.createKibanaRequest();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const eventLogClient = eventLogClientMock.create();
const getEventLogClient = jest.fn();
const connectorTokenClient = connectorTokenClientMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const getAxiosInstanceWithAuth = jest.fn();
const isESOCanEncrypt = true;

let actionsClient: ActionsClient;
const actionTypeRegistry: ActionTypeRegistry = jest.fn() as unknown as ActionTypeRegistry;
const authTypeRegistry: AuthTypeRegistry =
  authTypeRegistryMock.create() as unknown as AuthTypeRegistry;

describe('getAuthStatus()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    actionTypeRegistry.isDeprecated = jest.fn().mockReturnValue(false);
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      authTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      inMemoryConnectors: [],
      actionExecutor,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      usageCounter: mockUsageCounter,
      connectorTokenClient,
      getEventLogClient,
      encryptedSavedObjectsClient,
      isESOCanEncrypt,
      getAxiosInstanceWithAuth,
    });
    (getOAuthJwtAccessToken as jest.Mock).mockResolvedValue(`Bearer jwttokentokentoken`);
    (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValue(
      `Bearer clienttokentokentoken`
    );
    getEventLogClient.mockResolvedValue(eventLogClient);
  });

  describe('authorization', () => {
    test('calls ensureAuthorized with operation get', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        total: 0,
        per_page: 10000,
        page: 1,
        saved_objects: [],
      });

      await actionsClient.getAuthStatus();

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('throws when authorization fails', async () => {
      authorization.ensureAuthorized.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(actionsClient.getAuthStatus()).rejects.toThrow('Unauthorized');

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });
  });

  function buildActionsClientWithProfile({
    inMemoryConnectors = [],
    profileUid,
    getCurrentUserProfileIdFromBasicAuth,
  }: {
    inMemoryConnectors?: InMemoryConnector[];
    profileUid?: string;
    getCurrentUserProfileIdFromBasicAuth?: (req: KibanaRequest) => Promise<string | undefined>;
  } = {}) {
    return new ActionsClient({
      logger,
      actionTypeRegistry,
      authTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      actionExecutor,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      inMemoryConnectors,
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
      encryptedSavedObjectsClient,
      isESOCanEncrypt,
      getAxiosInstanceWithAuth,
      getCurrentUser: async () => (profileUid ? { profile_uid: profileUid } : null),
      getCurrentUserProfileIdFromBasicAuth,
    });
  }

  test('returns not_applicable for shared-auth persisted connectors', async () => {
    unsecuredSavedObjectsClient.find
      .mockResolvedValueOnce({
        total: 0,
        per_page: 10000,
        page: 1,
        saved_objects: [],
      })
      .mockResolvedValueOnce({
        total: 1,
        per_page: 10000,
        page: 1,
        saved_objects: [
          {
            id: 'connector-shared',
            type: 'action',
            attributes: {
              name: 'Shared connector',
              actionTypeId: '.test-connector-type',
              isMissingSecrets: false,
              config: {},
              authMode: 'shared',
            },
            score: 1,
            references: [],
          },
        ],
      });

    actionsClient = buildActionsClientWithProfile({ profileUid: 'test-profile-uid' });
    const result = await actionsClient.getAuthStatus();

    expect(result['connector-shared']).toEqual({ userAuthStatus: 'not_applicable' });
  });

  test('returns connected for per-user connector with matching token', async () => {
    unsecuredSavedObjectsClient.find
      .mockResolvedValueOnce({
        total: 1,
        per_page: 10000,
        page: 1,
        saved_objects: [
          {
            id: 'token-1',
            type: 'user_connector_token',
            attributes: {
              profileUid: 'test-profile-uid',
              connectorId: 'connector-per-user',
              credentialType: 'oauth',
              credentials: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            score: 1,
            references: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        total: 1,
        per_page: 10000,
        page: 1,
        saved_objects: [
          {
            id: 'connector-per-user',
            type: 'action',
            attributes: {
              name: 'Per-user connector',
              actionTypeId: '.test-connector-type',
              isMissingSecrets: false,
              config: {},
              authMode: 'per-user',
            },
            score: 1,
            references: [],
          },
        ],
      });

    actionsClient = buildActionsClientWithProfile({ profileUid: 'test-profile-uid' });
    const result = await actionsClient.getAuthStatus();

    expect(result['connector-per-user']).toEqual({ userAuthStatus: 'connected' });
  });

  test('returns not_connected for per-user connector without token', async () => {
    unsecuredSavedObjectsClient.find
      .mockResolvedValueOnce({
        total: 0,
        per_page: 10000,
        page: 1,
        saved_objects: [],
      })
      .mockResolvedValueOnce({
        total: 1,
        per_page: 10000,
        page: 1,
        saved_objects: [
          {
            id: 'connector-per-user',
            type: 'action',
            attributes: {
              name: 'Per-user connector',
              actionTypeId: '.test-connector-type',
              isMissingSecrets: false,
              config: {},
              authMode: 'per-user',
            },
            score: 1,
            references: [],
          },
        ],
      });

    actionsClient = buildActionsClientWithProfile({ profileUid: 'test-profile-uid' });
    const result = await actionsClient.getAuthStatus();

    expect(result['connector-per-user']).toEqual({ userAuthStatus: 'not_connected' });
  });

  test('returns not_applicable for in-memory preconfigured connectors', async () => {
    unsecuredSavedObjectsClient.find
      .mockResolvedValueOnce({
        total: 0,
        per_page: 10000,
        page: 1,
        saved_objects: [],
      })
      .mockResolvedValueOnce({
        total: 0,
        per_page: 10000,
        page: 1,
        saved_objects: [],
      });

    actionsClient = buildActionsClientWithProfile({
      profileUid: 'test-profile-uid',
      inMemoryConnectors: [
        createMockInMemoryConnector({
          id: 'in-memory-connector',
          actionTypeId: '.slack',
          isPreconfigured: true,
          name: 'In-memory connector',
          authMode: 'per-user',
        }),
      ],
    });

    const result = await actionsClient.getAuthStatus();

    expect(result['in-memory-connector']).toEqual({ userAuthStatus: 'not_applicable' });
  });

  test('returns empty record when no connectors exist', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 0,
      per_page: 10000,
      page: 1,
      saved_objects: [],
    });

    const result = await actionsClient.getAuthStatus();

    expect(result).toEqual({});
  });

  test('returns not_connected for per-user connector when user has no profile UIDs', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10000,
      page: 1,
      saved_objects: [
        {
          id: 'connector-per-user',
          type: 'action',
          attributes: {
            name: 'Per-user connector',
            actionTypeId: '.test-connector-type',
            isMissingSecrets: false,
            config: {},
            authMode: 'per-user',
          },
          score: 1,
          references: [],
        },
      ],
    });

    actionsClient = buildActionsClientWithProfile();
    const result = await actionsClient.getAuthStatus();

    expect(result['connector-per-user']).toEqual({ userAuthStatus: 'not_connected' });
  });

  test('returns connected for per-user connector when profile UID is resolved from Basic auth', async () => {
    unsecuredSavedObjectsClient.find
      .mockResolvedValueOnce({
        total: 1,
        per_page: 10000,
        page: 1,
        saved_objects: [
          {
            id: 'token-1',
            type: 'user_connector_token',
            attributes: {
              profileUid: 'test-profile-uid',
              connectorId: 'connector-per-user',
              credentialType: 'oauth',
              credentials: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            score: 1,
            references: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        total: 1,
        per_page: 10000,
        page: 1,
        saved_objects: [
          {
            id: 'connector-per-user',
            type: 'action',
            attributes: {
              name: 'Per-user connector',
              actionTypeId: '.test-connector-type',
              isMissingSecrets: false,
              config: {},
              authMode: 'per-user',
            },
            score: 1,
            references: [],
          },
        ],
      });

    actionsClient = buildActionsClientWithProfile({
      getCurrentUserProfileIdFromBasicAuth: async () => 'test-profile-uid',
    });
    const result = await actionsClient.getAuthStatus();

    expect(result['connector-per-user']).toEqual({ userAuthStatus: 'connected' });
  });
});
