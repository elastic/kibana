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
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Logger } from '@kbn/logging';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import type { ActionTypeRegistry } from '../../../../action_type_registry';
import { getAllUnsecured } from './get_all';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { createMockInMemoryConnector } from '../../mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');
  return {
    ...actual,
    SavedObjectsUtils: {
      generateId: () => 'mock-saved-object-id',
    },
  };
});

jest.mock('../../../../lib/get_oauth_jwt_access_token', () => ({
  getOAuthJwtAccessToken: jest.fn(),
}));
jest.mock('../../../../lib/get_oauth_client_credentials_access_token', () => ({
  getOAuthClientCredentialsAccessToken: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: () => 'uuidv4',
}));

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
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const eventLogClient = eventLogClientMock.create();
const getEventLogClient = jest.fn();
const connectorTokenClient = connectorTokenClientMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const getAxiosInstanceWithAuth = jest.fn();
const isESOCanEncrypt = true;

let actionsClient: ActionsClient;
const actionTypeRegistry: ActionTypeRegistry = jest.fn() as unknown as ActionTypeRegistry;

describe('getAll()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    actionTypeRegistry.isDeprecated = jest.fn().mockReturnValue(false);
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      inMemoryConnectors: [],
      actionExecutor,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      auditLogger,
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

  describe('getAll()', () => {
    describe('authorization', () => {
      function getAllOperation(): ReturnType<ActionsClient['getAll']> {
        const expectedResult = {
          total: 1,
          per_page: 10,
          page: 1,
          saved_objects: [
            {
              id: '1',
              type: 'type',
              attributes: {
                name: 'test',
                config: {
                  foo: 'bar',
                },
              },
              score: 1,
              references: [],
            },
          ],
        };
        unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
        scopedClusterClient.asInternalUser.search.mockResponse(
          // @ts-expect-error not full search response
          {
            aggregations: {
              '1': { doc_count: 6 },
              testPreconfigured: { doc_count: 2 },
            },
          }
        );

        actionsClient = new ActionsClient({
          logger,
          actionTypeRegistry,
          unsecuredSavedObjectsClient,
          scopedClusterClient,
          kibanaIndices,
          actionExecutor,
          bulkExecutionEnqueuer,
          request,
          authorization: authorization as unknown as ActionsAuthorization,
          inMemoryConnectors: [
            createMockInMemoryConnector({
              id: 'testPreconfigured',
              actionTypeId: '.slack',
              isPreconfigured: true,
              name: 'test',
              config: {
                foo: 'bar',
              },
            }),
          ],
          connectorTokenClient: connectorTokenClientMock.create(),
          getEventLogClient,
          encryptedSavedObjectsClient,
          isESOCanEncrypt,
          getAxiosInstanceWithAuth,
        });
        return actionsClient.getAll();
      }

      test('ensures user is authorised to get the type of action', async () => {
        await getAllOperation();
        expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
      });

      test('throws when user is not authorised to create the type of action', async () => {
        authorization.ensureAuthorized.mockRejectedValue(
          new Error(`Unauthorized to get all actions`)
        );

        await expect(getAllOperation()).rejects.toMatchInlineSnapshot(
          `[Error: Unauthorized to get all actions]`
        );

        expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
      });
    });

    describe('auditLogger', () => {
      test('logs audit event when searching connectors', async () => {
        unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
          total: 1,
          per_page: 10,
          page: 1,
          saved_objects: [
            {
              id: '1',
              type: 'type',
              attributes: {
                name: 'test',
                isMissingSecrets: false,
                config: {
                  foo: 'bar',
                },
              },
              score: 1,
              references: [],
            },
          ],
        });

        scopedClusterClient.asInternalUser.search.mockResponse(
          // @ts-expect-error not full search response
          {
            aggregations: {
              '1': { doc_count: 6 },
              testPreconfigured: { doc_count: 2 },
            },
          }
        );

        await actionsClient.getAll();

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'connector_find',
              outcome: 'success',
            }),
            kibana: { saved_object: { id: '1', type: 'action' } },
          })
        );
      });

      test('logs audit event when not authorised to search connectors', async () => {
        authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

        await expect(actionsClient.getAll()).rejects.toThrow();

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'connector_find',
              outcome: 'failure',
            }),
            error: { code: 'Error', message: 'Unauthorized' },
          })
        );
      });
    });

    test('calls unsecuredSavedObjectsClient with parameters and returns inMemoryConnectors correctly', async () => {
      const expectedResult = {
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: 'type',
            attributes: {
              name: 'test',
              actionTypeId: '.test-connector-type',
              isMissingSecrets: false,
              config: {
                foo: 'bar',
              },
            },
            score: 1,
            references: [],
          },
        ],
      };
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            '1': { doc_count: 6 },
            testPreconfigured: { doc_count: 2 },
            'system-connector-.cases': { doc_count: 2 },
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [
          createMockInMemoryConnector({
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            isPreconfigured: true,
            name: 'test',
            config: {
              foo: 'bar',
            },
          }),
          /**
           * System actions will not
           * be returned from getAll
           * if no options are provided
           */
          createMockInMemoryConnector({
            id: 'system-connector-.cases',
            actionTypeId: '.cases',
            name: 'System action: .cases',
            isSystemAction: true,
          }),
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
        encryptedSavedObjectsClient,
        isESOCanEncrypt,
        getAxiosInstanceWithAuth,
      });

      const result = await actionsClient.getAll();

      expect(result).toContainConnectorsFindResult([
        {
          id: '1',
          name: 'test',
          isMissingSecrets: false,
          config: { foo: 'bar' },
          referencedByCount: 6,
        },
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          name: 'test',
          isPreconfigured: true,
          referencedByCount: 2,
        },
      ]);
    });

    test.skip('get system actions correctly', async () => {
      const expectedResult = {
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: 'type',
            attributes: {
              name: 'test',
              isMissingSecrets: false,
              config: {
                foo: 'bar',
              },
            },
            score: 1,
            references: [],
          },
        ],
      };
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            '1': { doc_count: 6 },
            testPreconfigured: { doc_count: 2 },
            'system-connector-.cases': { doc_count: 2 },
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [
          createMockInMemoryConnector({
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            isPreconfigured: true,
            name: 'test',
            config: {
              foo: 'bar',
            },
          }),
          createMockInMemoryConnector({
            id: 'system-connector-.cases',
            actionTypeId: '.cases',
            name: 'System action: .cases',
            isSystemAction: true,
          }),
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
        encryptedSavedObjectsClient,
        isESOCanEncrypt,
        getAxiosInstanceWithAuth,
      });

      const result = await actionsClient.getAll({ includeSystemActions: true });

      expect(result).toContainConnectorsFindResult([
        {
          actionTypeId: '.cases',
          id: 'system-connector-.cases',
          isSystemAction: true,
          name: 'System action: .cases',
          referencedByCount: 2,
        },
        {
          id: '1',
          name: 'test',
          isMissingSecrets: false,
          config: { foo: 'bar' },
          referencedByCount: 6,
        },
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          name: 'test',
          isPreconfigured: true,
          referencedByCount: 2,
        },
      ]);
    });

    test('validates connectors before return', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: 'type',
            attributes: {
              name: 'test',
              isMissingSecrets: false,
              config: {
                foo: 'bar',
              },
            },
            score: 1,
            references: [],
          },
        ],
      });
      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            '1': { doc_count: 6 },
            testPreconfigured: { doc_count: 2 },
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [
          createMockInMemoryConnector({
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            isPreconfigured: true,
            name: 'test',
            config: {
              foo: 'bar',
            },
          }),
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
        encryptedSavedObjectsClient,
        isESOCanEncrypt,
        getAxiosInstanceWithAuth,
      });

      const result = await actionsClient.getAll({ includeSystemActions: true });
      expect(result).toContainConnectorsFindResult([
        {
          config: {
            foo: 'bar',
          },
          id: '1',
          isMissingSecrets: false,
          name: 'test',
          referencedByCount: 6,
          actionTypeId: undefined,
        },
        {
          actionTypeId: '.slack',
          id: 'testPreconfigured',
          isPreconfigured: true,
          name: 'test',
          referencedByCount: 2,
        },
      ]);

      expect(logger.warn).toHaveBeenCalledWith(
        'Error validating connector: 1, Error: [actionTypeId]: expected value of type [string] but got [undefined]'
      );
    });

    test('removes secrets before validation', async () => {
      const expectedResult = {
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: 'type',
            attributes: {
              name: 'test',
              actionTypeId: 'test',
              isMissingSecrets: false,
              config: {
                foo: 'bar',
              },
              secrets: { foo: 'bar' },
            },
            score: 1,
            references: [],
          },
        ],
      };
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            '1': { doc_count: 6 },
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
        encryptedSavedObjectsClient,
        isESOCanEncrypt,
        getAxiosInstanceWithAuth,
      });

      await actionsClient.getAll();

      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('filters out inference connectors without endpoints', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [],
      });

      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            testPreconfigured01: { doc_count: 2 },
            testPreconfigured02: { doc_count: 2 },
          },
        }
      );

      scopedClusterClient.asInternalUser.inference.get.mockResolvedValueOnce({
        endpoints: [{ inference_id: '2' } as InferenceInferenceEndpointInfo],
      });

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [
          createMockInMemoryConnector({
            id: 'testPreconfigured01',
            actionTypeId: '.inference',
            name: 'test1',
            config: {
              inferenceId: '1',
            },
            isSystemAction: true,
          }),
          createMockInMemoryConnector({
            id: 'testPreconfigured02',
            actionTypeId: '.inference',
            name: 'test2',
            config: {
              inferenceId: '2',
            },
            isSystemAction: true,
          }),
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
        encryptedSavedObjectsClient,
        isESOCanEncrypt,
        getAxiosInstanceWithAuth,
      });

      const result = await actionsClient.getAll({ includeSystemActions: true });
      expect(result).toContainConnectorsFindResult([
        {
          actionTypeId: '.inference',
          id: 'testPreconfigured02',
          isSystemAction: true,
          name: 'test2',
          referencedByCount: 2,
        },
      ]);
    });

    test('returns deprecated connectors', async () => {
      // force registry to return deprecated true
      actionTypeRegistry.isDeprecated = jest.fn().mockReturnValue(true);
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: 'type',
            attributes: {
              name: 'test',
              actionTypeId: '.test-connector-type',
              isMissingSecrets: false,
              config: {
                foo: 'bar',
              },
            },
            score: 1,
            references: [],
          },
        ],
      });
      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            '1': { doc_count: 6 },
            testPreconfigured: { doc_count: 2 },
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [
          createMockInMemoryConnector({
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            isPreconfigured: true,
            name: 'test',
            config: {
              foo: 'bar',
            },
          }),
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
        encryptedSavedObjectsClient,
        isESOCanEncrypt,
        getAxiosInstanceWithAuth,
      });

      const result = await actionsClient.getAll({ includeSystemActions: true });
      expect(result).toContainConnectorsFindResult([
        {
          config: {
            foo: 'bar',
          },
          id: '1',
          name: 'test',
          referencedByCount: 6,
          isConnectorTypeDeprecated: true,
          isMissingSecrets: false,
        },
        {
          actionTypeId: '.slack',
          id: 'testPreconfigured',
          isPreconfigured: true,
          name: 'test',
          referencedByCount: 2,
          isConnectorTypeDeprecated: true,
        },
      ]);
    });
  });

  describe('getAllSystemConnectors()', () => {
    describe('authorization', () => {
      function getAllOperation(): ReturnType<ActionsClient['getAll']> {
        scopedClusterClient.asInternalUser.search.mockResponse(
          // @ts-expect-error not full search response
          {
            aggregations: {
              'system-connector-.test': { doc_count: 2 },
            },
          }
        );

        actionsClient = new ActionsClient({
          logger,
          actionTypeRegistry,
          unsecuredSavedObjectsClient,
          scopedClusterClient,
          kibanaIndices,
          actionExecutor,
          bulkExecutionEnqueuer,
          request,
          authorization: authorization as unknown as ActionsAuthorization,
          inMemoryConnectors: [
            createMockInMemoryConnector({
              id: 'system-connector-.test',
              actionTypeId: '.test',
              name: 'Test system action',
              isSystemAction: true,
            }),
          ],
          connectorTokenClient: connectorTokenClientMock.create(),
          getEventLogClient,
          encryptedSavedObjectsClient,
          isESOCanEncrypt,
          getAxiosInstanceWithAuth,
        });

        return actionsClient.getAllSystemConnectors();
      }

      test('ensures user is authorised to get the type of action', async () => {
        await getAllOperation();
        expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
      });

      test('throws when user is not authorised to get the type of action', async () => {
        authorization.ensureAuthorized.mockRejectedValue(
          new Error(`Unauthorized to get all actions`)
        );

        await expect(getAllOperation()).rejects.toMatchInlineSnapshot(
          `[Error: Unauthorized to get all actions]`
        );

        expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
      });
    });

    describe('auditLogger', () => {
      test('logs audit event when not authorised to search connectors', async () => {
        authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

        await expect(actionsClient.getAllSystemConnectors()).rejects.toThrow();

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'connector_find',
              outcome: 'failure',
            }),
            error: { code: 'Error', message: 'Unauthorized' },
          })
        );
      });
    });

    test('get all system actions correctly', async () => {
      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            'system-connector-.test': { doc_count: 2 },
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [
          createMockInMemoryConnector({
            id: 'testPreconfigured',
            actionTypeId: 'my-action-type',
            secrets: {
              test: 'test1',
            },
            isPreconfigured: true,
            name: 'test',
            config: {
              foo: 'bar',
            },
          }),
          createMockInMemoryConnector({
            id: 'system-connector-.test',
            actionTypeId: '.test',
            name: 'Test system action',
            isSystemAction: true,
          }),
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
        encryptedSavedObjectsClient,
        isESOCanEncrypt,
        getAxiosInstanceWithAuth,
      });

      const result = await actionsClient.getAllSystemConnectors();

      expect(result).toContainConnectorsFindResult([
        {
          id: 'system-connector-.test',
          actionTypeId: '.test',
          name: 'Test system action',
          isSystemAction: true,
          referencedByCount: 2,
        },
      ]);
    });
  });
});

describe('getAllUnsecured()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    actionTypeRegistry.isDeprecated = jest.fn().mockReturnValue(false);
  });

  test('calls internalSavedObjectRepository with parameters and returns inMemoryConnectors correctly', async () => {
    const expectedResult = {
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'type',
          attributes: {
            name: 'test',
            actionTypeId: '.test-connector-type',
            isMissingSecrets: false,
            config: {
              foo: 'bar',
            },
            secrets: 'this should not be returned',
          },
          score: 1,
          references: [],
        },
      ],
    };
    internalSavedObjectsRepository.find.mockResolvedValueOnce(expectedResult);
    scopedClusterClient.asInternalUser.search.mockResponse(
      // @ts-expect-error not full search response
      {
        aggregations: {
          '1': { doc_count: 6 },
          testPreconfigured: { doc_count: 2 },
          'system-connector-.cases': { doc_count: 2 },
        },
      }
    );

    const result = await getAllUnsecured({
      esClient: scopedClusterClient.asInternalUser,
      inMemoryConnectors: [
        createMockInMemoryConnector({
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          isPreconfigured: true,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
          exposeConfig: true,
        }),
        /**
         * System actions will not
         * be returned from getAllUnsecured
         */
        createMockInMemoryConnector({
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          isSystemAction: true,
        }),
      ],
      internalSavedObjectsRepository,
      kibanaIndices,
      logger,
      spaceId: 'default',
      connectorTypeRegistry: actionTypeRegistry,
    });

    expect(result).toContainConnectorsFindResult([
      {
        id: '1',
        name: 'test',
        isMissingSecrets: false,
        config: { foo: 'bar' },
        referencedByCount: 6,
      },
      {
        id: 'testPreconfigured',
        actionTypeId: '.slack',
        name: 'test',
        isPreconfigured: true,
        referencedByCount: 2,
        config: { foo: 'bar' },
      },
    ]);

    expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
      perPage: 10000,
      type: 'action',
    });

    expect(scopedClusterClient.asInternalUser.search).toHaveBeenCalledWith({
      index: kibanaIndices,
      ignore_unavailable: true,
      aggs: {
        '1': {
          filter: {
            bool: {
              must: {
                nested: {
                  path: 'references',
                  query: {
                    bool: {
                      filter: {
                        bool: {
                          must: [
                            {
                              term: {
                                'references.id': '1',
                              },
                            },
                            {
                              term: {
                                'references.type': 'action',
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        testPreconfigured: {
          filter: {
            bool: {
              must: {
                nested: {
                  path: 'references',
                  query: {
                    bool: {
                      filter: {
                        bool: {
                          must: [
                            {
                              term: {
                                'references.id': 'testPreconfigured',
                              },
                            },
                            {
                              term: {
                                'references.type': 'action',
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      size: 0,
      query: {
        match_all: {},
      },
    });

    expect(auditLogger.log).not.toHaveBeenCalled();
    expect(authorization.ensureAuthorized).not.toHaveBeenCalled();
  });

  test('passed custom space id if defined', async () => {
    const expectedResult = {
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'type',
          attributes: {
            name: 'test',
            isMissingSecrets: false,
            actionTypeId: '.test-connector-type',
            config: {
              foo: 'bar',
            },
            secrets: 'this should not be returned',
          },
          score: 1,
          references: [],
        },
      ],
    };
    internalSavedObjectsRepository.find.mockResolvedValueOnce(expectedResult);
    scopedClusterClient.asInternalUser.search.mockResponse(
      // @ts-expect-error not full search response
      {
        aggregations: {
          '1': { doc_count: 6 },
          testPreconfigured: { doc_count: 2 },
          'system-connector-.cases': { doc_count: 2 },
        },
      }
    );

    const result = await getAllUnsecured({
      esClient: scopedClusterClient.asInternalUser,
      inMemoryConnectors: [
        createMockInMemoryConnector({
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          isPreconfigured: true,
          name: 'test',
          config: {
            foo: 'bar',
          },
        }),
        /**
         * System actions will not
         * be returned from getAllUnsecured
         */
        createMockInMemoryConnector({
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          isSystemAction: true,
        }),
      ],
      internalSavedObjectsRepository,
      kibanaIndices,
      logger,
      spaceId: 'custom',
      connectorTypeRegistry: actionTypeRegistry,
    });

    expect(result).toContainConnectorsFindResult([
      {
        id: '1',
        name: 'test',
        isMissingSecrets: false,
        config: { foo: 'bar' },
        referencedByCount: 6,
      },
      {
        id: 'testPreconfigured',
        actionTypeId: '.slack',
        name: 'test',
        isPreconfigured: true,
        referencedByCount: 2,
      },
    ]);

    expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
      perPage: 10000,
      type: 'action',
      namespaces: ['custom'],
    });

    expect(scopedClusterClient.asInternalUser.search).toHaveBeenCalledWith({
      index: kibanaIndices,
      ignore_unavailable: true,
      aggs: {
        '1': {
          filter: {
            bool: {
              must: {
                nested: {
                  path: 'references',
                  query: {
                    bool: {
                      filter: {
                        bool: {
                          must: [
                            {
                              term: {
                                'references.id': '1',
                              },
                            },
                            {
                              term: {
                                'references.type': 'action',
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        testPreconfigured: {
          filter: {
            bool: {
              must: {
                nested: {
                  path: 'references',
                  query: {
                    bool: {
                      filter: {
                        bool: {
                          must: [
                            {
                              term: {
                                'references.id': 'testPreconfigured',
                              },
                            },
                            {
                              term: {
                                'references.type': 'action',
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      size: 0,
      query: {
        match_all: {},
      },
    });

    expect(auditLogger.log).not.toHaveBeenCalled();
    expect(authorization.ensureAuthorized).not.toHaveBeenCalled();
  });

  test('validates connectors before return', async () => {
    internalSavedObjectsRepository.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'type',
          attributes: {
            name: 'test',
            isMissingSecrets: false,
            config: {
              foo: 'bar',
            },
          },
          score: 1,
          references: [],
        },
      ],
    });
    scopedClusterClient.asInternalUser.search.mockResponse(
      // @ts-expect-error not full search response
      {
        aggregations: {
          '1': { doc_count: 6 },
          testPreconfigured: { doc_count: 2 },
        },
      }
    );

    const result = await getAllUnsecured({
      esClient: scopedClusterClient.asInternalUser,
      inMemoryConnectors: [
        createMockInMemoryConnector({
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          isPreconfigured: true,
          name: 'test',
          config: {
            foo: 'bar',
          },
        }),
      ],
      internalSavedObjectsRepository,
      kibanaIndices,
      logger,
      spaceId: 'default',
      connectorTypeRegistry: actionTypeRegistry,
    });

    expect(result).toContainConnectorsFindResult([
      {
        config: {
          foo: 'bar',
        },
        id: '1',
        actionTypeId: undefined,
        isMissingSecrets: false,
        name: 'test',
        referencedByCount: 6,
      },
      {
        actionTypeId: '.slack',
        id: 'testPreconfigured',
        isPreconfigured: true,
        name: 'test',
        referencedByCount: 2,
      },
    ]);

    expect(logger.warn).toHaveBeenCalledWith(
      'Error validating connector: 1, Error: [actionTypeId]: expected value of type [string] but got [undefined]'
    );
  });
});
