/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import moment from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';
import { MockedLogger, loggerMock } from '@kbn/logging-mocks';
import {
  DEFAULT_MICROSOFT_EXCHANGE_URL,
  DEFAULT_MICROSOFT_GRAPH_API_SCOPE,
  DEFAULT_MICROSOFT_GRAPH_API_URL,
} from '../../common';
import { ActionTypeRegistry, ActionTypeRegistryOpts } from '../action_type_registry';
import { ActionsClient } from './actions_client';
import { ExecutorType, ActionType } from '../types';
import {
  ActionExecutor,
  TaskRunnerFactory,
  ILicenseState,
  asHttpRequestExecutionSource,
} from '../lib';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { getActionsConfigurationUtilities } from '../actions_config';
import { licenseStateMock } from '../lib/license_state.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import {
  httpServerMock,
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { actionExecutorMock } from '../lib/action_executor.mock';
import { v4 as uuidv4 } from 'uuid';
import { ActionsAuthorization } from '../authorization/actions_authorization';
import { actionsAuthorizationMock } from '../authorization/actions_authorization.mock';
import { ConnectorTokenClient } from '../lib/connector_token_client';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { SavedObject } from '@kbn/core/server';
import { connectorTokenClientMock } from '../lib/connector_token_client.mock';
import { inMemoryMetricsMock } from '../monitoring/in_memory_metrics.mock';
import { getOAuthJwtAccessToken } from '../lib/get_oauth_jwt_access_token';
import { getOAuthClientCredentialsAccessToken } from '../lib/get_oauth_client_credentials_access_token';
import { OAuthParams } from '../routes/get_oauth_access_token';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { GetGlobalExecutionKPIParams, GetGlobalExecutionLogParams } from '../../common';
import { estypes } from '@elastic/elasticsearch';
import { DEFAULT_USAGE_API_URL } from '../config';

jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');
  return {
    ...actual,
    SavedObjectsUtils: {
      generateId: () => 'mock-saved-object-id',
    },
  };
});

jest.mock('../lib/get_oauth_jwt_access_token', () => ({
  getOAuthJwtAccessToken: jest.fn(),
}));
jest.mock('../lib/get_oauth_client_credentials_access_token', () => ({
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
const mockTaskManager = taskManagerMock.createSetup();
const configurationUtilities = actionsConfigMock.create();
const eventLogClient = eventLogClientMock.create();
const getEventLogClient = jest.fn();
const preSaveHook = jest.fn();
const postSaveHook = jest.fn();
const postDeleteHook = jest.fn();

let actionsClient: ActionsClient;
let mockedLicenseState: jest.Mocked<ILicenseState>;
let actionTypeRegistry: ActionTypeRegistry;
let actionTypeRegistryParams: ActionTypeRegistryOpts;
const executor: ExecutorType<{}, {}, {}, void> = async (options) => {
  return { status: 'ok', actionId: options.actionId };
};

const connectorTokenClient = connectorTokenClientMock.create();
const inMemoryMetrics = inMemoryMetricsMock.create();

const actionTypeIdFromSavedObjectMock = (actionTypeId: string = 'my-action-type') => {
  return {
    attributes: {
      actionTypeId,
    },
  } as SavedObject;
};

let logger: MockedLogger;

beforeEach(() => {
  jest.resetAllMocks();
  logger = loggerMock.create();
  mockedLicenseState = licenseStateMock.create();
  actionTypeRegistryParams = {
    licensing: licensingMock.createSetup(),
    taskManager: mockTaskManager,
    taskRunnerFactory: new TaskRunnerFactory(
      new ActionExecutor({ isESOCanEncrypt: true }),
      inMemoryMetrics
    ),
    actionsConfigUtils: actionsConfigMock.create(),
    licenseState: mockedLicenseState,
    inMemoryConnectors: [],
  };
  actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
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
  });
  (getOAuthJwtAccessToken as jest.Mock).mockResolvedValue(`Bearer jwttokentokentoken`);
  (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValue(
    `Bearer clienttokentokentoken`
  );
  getEventLogClient.mockResolvedValue(eventLogClient);
});

describe('create()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to create this type of action', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      await actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: {},
        },
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: 'create',
        actionTypeId: 'my-action-type',
      });
    });

    test('throws when user is not authorised to create this type of action', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to create a "my-action-type" action`)
      );

      await expect(
        actionsClient.create({
          action: {
            name: 'my name',
            actionTypeId: 'my-action-type',
            config: {},
            secrets: {},
          },
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to create a "my-action-type" action]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: 'create',
        actionTypeId: 'my-action-type',
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
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      actionTypeRegistry.register({
        id: savedObjectCreateResult.attributes.actionTypeId,
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      await actionsClient.create({
        action: {
          ...savedObjectCreateResult.attributes,
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
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      actionTypeRegistry.register({
        id: savedObjectCreateResult.attributes.actionTypeId,
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        async () =>
          await actionsClient.create({
            action: {
              ...savedObjectCreateResult.attributes,
              secrets: {},
            },
          })
      ).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_create',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: 'mock-saved-object-id',
              type: 'action',
            },
          },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });

  test('creates an action with all given properties', async () => {
    const savedObjectCreateResult = {
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
        config: {},
      },
      references: [],
    };
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
      preSaveHook,
      postSaveHook,
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);
    const result = await actionsClient.create({
      action: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        config: {},
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: '1',
      isPreconfigured: false,
      isSystemAction: false,
      isDeprecated: false,
      name: 'my name',
      actionTypeId: 'my-action-type',
      isMissingSecrets: false,
      config: {},
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {},
          "isMissingSecrets": false,
          "name": "my name",
          "secrets": Object {},
        },
        Object {
          "id": "mock-saved-object-id",
        },
      ]
    `);
    expect(preSaveHook).toHaveBeenCalledTimes(1);
    expect(postSaveHook).toHaveBeenCalledTimes(1);
  });

  test('validates config', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
        config: {
          schema: schema.object({
            param1: schema.string(),
          }),
        },
      },
      executor,
    });
    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  test('validates connector: config and secrets', async () => {
    const connectorValidator = () => {
      return '[param1] is required';
    };
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({ param1: schema.string() }) },
        params: { schema: schema.object({}) },
        connector: connectorValidator,
      },
      executor,
    });
    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: { param1: '1' },
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: [param1] is required"`
    );
  });

  test(`throws an error when an action type doesn't exist`, async () => {
    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'unregistered-action-type',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"unregistered-action-type\\" is not registered."`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: {
          schema: schema.object({ a: schema.boolean(), b: schema.boolean(), c: schema.boolean() }),
        },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
      references: [],
    });
    const result = await actionsClient.create({
      action: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: '1',
      isPreconfigured: false,
      isSystemAction: false,
      isDeprecated: false,
      name: 'my name',
      actionTypeId: 'my-action-type',
      isMissingSecrets: false,
      config: {
        a: true,
        b: true,
        c: true,
      },
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {
            "a": true,
            "b": true,
            "c": true,
          },
          "isMissingSecrets": false,
          "name": "my name",
          "secrets": Object {},
        },
        Object {
          "id": "mock-saved-object-id",
        },
      ]
    `);
  });

  test('throws error creating action with disabled actionType', async () => {
    const localConfigUtils = getActionsConfigurationUtilities({
      enabledActionTypes: ['some-not-ignored-action-type'],
      allowedHosts: ['*'],
      preconfiguredAlertHistoryEsIndex: false,
      preconfigured: {},
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
      maxResponseContentLength: new ByteSizeValue(1000000),
      responseTimeout: moment.duration('60s'),
      ssl: {
        verificationMode: 'full',
        proxyVerificationMode: 'full',
      },
      enableFooterInEmail: true,
      microsoftGraphApiUrl: DEFAULT_MICROSOFT_GRAPH_API_URL,
      microsoftGraphApiScope: DEFAULT_MICROSOFT_GRAPH_API_SCOPE,
      microsoftExchangeUrl: DEFAULT_MICROSOFT_EXCHANGE_URL,
      usage: {
        url: DEFAULT_USAGE_API_URL,
      },
    });

    const localActionTypeRegistryParams = {
      licensing: licensingMock.createSetup(),
      taskManager: mockTaskManager,
      taskRunnerFactory: new TaskRunnerFactory(
        new ActionExecutor({ isESOCanEncrypt: true }),
        inMemoryMetrics
      ),
      actionsConfigUtils: localConfigUtils,
      licenseState: licenseStateMock.create(),
      inMemoryConnectors: [],
    };

    actionTypeRegistry = new ActionTypeRegistry(localActionTypeRegistryParams);
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
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    const savedObjectCreateResult = {
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
        config: {},
      },
      references: [],
    };
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"action type \\"my-action-type\\" is not enabled in the Kibana config xpack.actions.enabledActionTypes"`
    );
  });

  test('throws error when ensureActionTypeEnabled throws', async () => {
    const savedObjectCreateResult = {
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
        config: {},
      },
      references: [],
    };
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });
    mockedLicenseState.ensureLicenseForActionType.mockImplementation(() => {
      throw new Error('Fail');
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);
    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });

  test('throws error when predefined id match a pre-configure action id', async () => {
    const preDefinedId = 'mySuperRadTestPreconfiguredId';
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });

    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      inMemoryConnectors: [
        {
          id: preDefinedId,
          actionTypeId: 'my-action-type',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],

      actionExecutor,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: {},
        },
        options: {
          id: preDefinedId,
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"This mySuperRadTestPreconfiguredId already exists in a preconfigured action."`
    );
  });

  it('throws when creating a system connector', async () => {
    actionTypeRegistry.register({
      id: '.cases',
      name: 'Cases',
      minimumLicenseRequired: 'platinum',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      isSystemActionType: true,
      executor,
    });

    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: '.cases',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"System action creation is forbidden. Action type: .cases."`
    );
  });

  it('throws when creating a system connector where the action type is not registered but a system connector exists in the in-memory list', async () => {
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
        {
          actionTypeId: '.cases',
          config: {},
          id: 'system-connector-.cases',
          name: 'System action: .cases',
          secrets: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: '.cases',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Action type \\".cases\\" is not registered."`);
  });
});

describe('get()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to get the type of action', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'type',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      });

      await actionsClient.get({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('ensures user is authorised to get preconfigured type of action', async () => {
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
          {
            id: 'testPreconfigured',
            actionTypeId: 'my-action-type',
            secrets: {
              test: 'test1',
            },
            isPreconfigured: true,
            isDeprecated: false,
            isSystemAction: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
      });

      await actionsClient.get({ id: 'testPreconfigured' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('ensures user is authorised to get a system action', async () => {
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
          {
            actionTypeId: '.cases',
            config: {},
            id: 'system-connector-.cases',
            name: 'System action: .cases',
            secrets: {},
            isPreconfigured: false,
            isDeprecated: false,
            isSystemAction: true,
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
      });

      await expect(actionsClient.get({ id: 'system-connector-.cases' })).rejects.toThrow();

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('throws when user is not authorised to get the type of action', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'type',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      });

      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get a "my-action-type" action`)
      );

      await expect(actionsClient.get({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get a "my-action-type" action]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('throws when user is not authorised to get preconfigured of action', async () => {
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
          {
            id: 'testPreconfigured',
            actionTypeId: 'my-action-type',
            secrets: {
              test: 'test1',
            },
            isPreconfigured: true,
            isDeprecated: false,
            isSystemAction: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
      });

      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get a "my-action-type" action`)
      );

      await expect(actionsClient.get({ id: 'testPreconfigured' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get a "my-action-type" action]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('throws when user is not authorised to get a system action', async () => {
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
          {
            actionTypeId: '.cases',
            config: {},
            id: 'system-connector-.cases',
            name: 'System action: .cases',
            secrets: {},
            isPreconfigured: false,
            isDeprecated: false,
            isSystemAction: true,
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
      });

      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get a "system-connector-.cases" action`)
      );

      await expect(
        actionsClient.get({ id: 'system-connector-.cases' })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get a "system-connector-.cases" action]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when getting a connector', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'type',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      });

      await actionsClient.get({ id: '1' });

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

    test('logs audit event when not authorised to get a connector', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'type',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      });

      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(actionsClient.get({ id: '1' })).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_get',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
    });
  });

  test('calls unsecuredSavedObjectsClient with id', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'type',
      attributes: {},
      references: [],
    });
    const result = await actionsClient.get({ id: '1' });
    expect(result).toEqual({
      id: '1',
      isPreconfigured: false,
      isSystemAction: false,
      isDeprecated: false,
    });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        "1",
      ]
    `);
  });

  test('return predefined action with id', async () => {
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
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    const result = await actionsClient.get({ id: 'testPreconfigured' });
    expect(result).toEqual({
      id: 'testPreconfigured',
      actionTypeId: '.slack',
      isPreconfigured: true,
      isDeprecated: false,
      isSystemAction: false,
      name: 'test',
    });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
  });

  it('throws when getting a system action by default', async () => {
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
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    await expect(
      actionsClient.get({ id: 'system-connector-.cases' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Connector system-connector-.cases not found"`);
  });

  it('does not throw when getting a system action if throwIfSystemAction=false', async () => {
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
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    expect(
      await actionsClient.get({ id: 'system-connector-.cases', throwIfSystemAction: false })
    ).toEqual({
      actionTypeId: '.cases',
      id: 'system-connector-.cases',
      isDeprecated: false,
      isPreconfigured: false,
      isSystemAction: true,
      name: 'System action: .cases',
    });
  });
});

describe('getBulk()', () => {
  describe('authorization', () => {
    function getBulkOperation(): ReturnType<ActionsClient['getBulk']> {
      unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: 'action',
            attributes: {
              actionTypeId: 'test',
              name: 'test',
              config: {
                foo: 'bar',
              },
              isMissingSecrets: false,
            },
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
          {
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            secrets: {},
            isPreconfigured: true,
            isDeprecated: false,
            isSystemAction: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
      });
      return actionsClient.getBulk({ ids: ['1', 'testPreconfigured'] });
    }

    test('ensures user is authorised to get the type of action', async () => {
      await getBulkOperation();
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get all actions`)
      );

      await expect(getBulkOperation()).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get all actions]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when bulk getting connectors', async () => {
      unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: 'action',
            attributes: {
              actionTypeId: 'test',
              name: 'test',
              config: {
                foo: 'bar',
              },
              isMissingSecrets: false,
            },
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

      await actionsClient.getBulk({ ids: ['1'] });

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

    test('logs audit event when not authorised to bulk get connectors', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(actionsClient.getBulk({ ids: ['1'] })).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_get',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
    });
  });

  test('calls getBulk unsecuredSavedObjectsClient with parameters and return inMemoryConnectors correctly', async () => {
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
            name: 'test',
            config: {
              foo: 'bar',
            },
            isMissingSecrets: false,
          },
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
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    const result = await actionsClient.getBulk({ ids: ['1', 'testPreconfigured'] });

    expect(result).toEqual([
      {
        id: 'testPreconfigured',
        actionTypeId: '.slack',
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isDeprecated: false,
        name: 'test',
        config: { foo: 'bar' },
      },
      {
        id: '1',
        actionTypeId: 'test',
        name: 'test',
        config: { foo: 'bar' },
        isMissingSecrets: false,
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
      },
    ]);
  });

  test('should throw an error if a system action is requested by default', async () => {
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
            name: 'test',
            config: {
              foo: 'bar',
            },
            isMissingSecrets: false,
          },
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
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    await expect(
      actionsClient.getBulk({ ids: ['1', 'testPreconfigured', 'system-connector-.cases'] })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Connector system-connector-.cases not found"`);
  });

  test('should throw an error if a system action is requested', async () => {
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
            name: 'test',
            config: {
              foo: 'bar',
            },
            isMissingSecrets: false,
          },
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
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    expect(
      await actionsClient.getBulk({
        ids: ['1', 'testPreconfigured', 'system-connector-.cases'],
        throwIfSystemAction: false,
      })
    ).toEqual([
      {
        actionTypeId: '.slack',
        config: { foo: 'bar' },
        id: 'testPreconfigured',
        isDeprecated: false,
        isPreconfigured: true,
        isSystemAction: false,
        name: 'test',
        secrets: {},
      },
      {
        actionTypeId: '.cases',
        config: {},
        id: 'system-connector-.cases',
        isDeprecated: false,
        isMissingSecrets: false,
        isPreconfigured: false,
        isSystemAction: true,
        name: 'System action: .cases',
        secrets: {},
      },
      {
        actionTypeId: 'test',
        config: { foo: 'bar' },
        id: '1',
        isDeprecated: false,
        isMissingSecrets: false,
        isPreconfigured: false,
        isSystemAction: false,
        name: 'test',
      },
    ]);
  });
});

describe('getOAuthAccessToken()', () => {
  function getOAuthAccessToken(
    requestBody: OAuthParams
  ): ReturnType<ActionsClient['getOAuthAccessToken']> {
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
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          isSystemAction: false,
          isDeprecated: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });
    return actionsClient.getOAuthAccessToken(requestBody, configurationUtilities);
  }

  describe('authorization', () => {
    test('ensures user is authorised to get the type of action', async () => {
      await getOAuthAccessToken({
        type: 'jwt',
        options: {
          tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
          config: {
            clientId: 'abc',
            jwtKeyId: 'def',
            userIdentifierValue: 'userA',
          },
          secrets: {
            clientSecret: 'iamasecret',
            privateKey: 'xyz',
          },
        },
      });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'update' });
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error(`Unauthorized to update actions`));

      await expect(
        getOAuthAccessToken({
          type: 'jwt',
          options: {
            tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
            config: {
              clientId: 'abc',
              jwtKeyId: 'def',
              userIdentifierValue: 'userA',
            },
            secrets: {
              clientSecret: 'iamasecret',
              privateKey: 'xyz',
            },
          },
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to update actions]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'update' });
    });
  });

  test('throws when tokenUrl is not using http or https', async () => {
    await expect(
      getOAuthAccessToken({
        type: 'jwt',
        options: {
          tokenUrl: 'ftp://testurl.service-now.com/oauth_token.do',
          config: {
            clientId: 'abc',
            jwtKeyId: 'def',
            userIdentifierValue: 'userA',
          },
          secrets: {
            clientSecret: 'iamasecret',
            privateKey: 'xyz',
          },
        },
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Token URL must use http or https]`);

    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'update' });
  });

  test('throws when tokenUrl does not contain hostname', async () => {
    await expect(
      getOAuthAccessToken({
        type: 'jwt',
        options: {
          tokenUrl: '/path/to/myfile',
          config: {
            clientId: 'abc',
            jwtKeyId: 'def',
            userIdentifierValue: 'userA',
          },
          secrets: {
            clientSecret: 'iamasecret',
            privateKey: 'xyz',
          },
        },
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Token URL must contain hostname]`);

    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'update' });
  });

  test('throws when tokenUrl is not in allowed hosts', async () => {
    configurationUtilities.ensureUriAllowed.mockImplementationOnce(() => {
      throw new Error('URI not allowed');
    });

    await expect(
      getOAuthAccessToken({
        type: 'jwt',
        options: {
          tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
          config: {
            clientId: 'abc',
            jwtKeyId: 'def',
            userIdentifierValue: 'userA',
          },
          secrets: {
            clientSecret: 'iamasecret',
            privateKey: 'xyz',
          },
        },
      })
    ).rejects.toMatchInlineSnapshot(`[Error: URI not allowed]`);

    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'update' });
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
      `https://testurl.service-now.com/oauth_token.do`
    );
  });

  test('calls getOAuthJwtAccessToken when type="jwt"', async () => {
    const result = await getOAuthAccessToken({
      type: 'jwt',
      options: {
        tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
        config: {
          clientId: 'abc',
          jwtKeyId: 'def',
          userIdentifierValue: 'userA',
        },
        secrets: {
          clientSecret: 'iamasecret',
          privateKey: 'xyz',
        },
      },
    });
    expect(result).toEqual({
      accessToken: 'Bearer jwttokentokentoken',
    });
    expect(getOAuthJwtAccessToken as jest.Mock).toHaveBeenCalledWith({
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: 'abc',
          jwtKeyId: 'def',
          userIdentifierValue: 'userA',
        },
        secrets: {
          clientSecret: 'iamasecret',
          privateKey: 'xyz',
        },
      },
      tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
    });
    expect(getOAuthClientCredentialsAccessToken).not.toHaveBeenCalled();
    expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
      Array [
        Array [
          "Successfully retrieved access token using JWT OAuth with tokenUrl https://testurl.service-now.com/oauth_token.do and config {\\"clientId\\":\\"abc\\",\\"jwtKeyId\\":\\"def\\",\\"userIdentifierValue\\":\\"userA\\"}",
        ],
      ]
    `);
  });

  test('calls getOAuthClientCredentialsAccessToken when type="client"', async () => {
    const result = await getOAuthAccessToken({
      type: 'client',
      options: {
        tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
        scope: 'https://graph.microsoft.com/.default',
        config: {
          clientId: 'abc',
          tenantId: 'def',
        },
        secrets: {
          clientSecret: 'iamasecret',
        },
      },
    });
    expect(result).toEqual({
      accessToken: 'Bearer clienttokentokentoken',
    });
    expect(getOAuthClientCredentialsAccessToken as jest.Mock).toHaveBeenCalledWith({
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: 'abc',
          tenantId: 'def',
        },
        secrets: {
          clientSecret: 'iamasecret',
        },
      },
      tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
      oAuthScope: 'https://graph.microsoft.com/.default',
    });
    expect(getOAuthJwtAccessToken).not.toHaveBeenCalled();
    expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
      Array [
        Array [
          "Successfully retrieved access token using Client Credentials OAuth with tokenUrl https://login.microsoftonline.com/98765/oauth2/v2.0/token, scope https://graph.microsoft.com/.default and config {\\"clientId\\":\\"abc\\",\\"tenantId\\":\\"def\\"}",
        ],
      ]
    `);
  });

  test('throws when getOAuthJwtAccessToken throws error', async () => {
    (getOAuthJwtAccessToken as jest.Mock).mockRejectedValue(new Error(`Something went wrong!`));

    await expect(
      getOAuthAccessToken({
        type: 'jwt',
        options: {
          tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
          config: {
            clientId: 'abc',
            jwtKeyId: 'def',
            userIdentifierValue: 'userA',
          },
          secrets: {
            clientSecret: 'iamasecret',
            privateKey: 'xyz',
          },
        },
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Failed to retrieve access token]`);

    expect(getOAuthJwtAccessToken as jest.Mock).toHaveBeenCalled();
    expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
      Array [
        Array [
          "Failed to retrieve access token using JWT OAuth with tokenUrl https://testurl.service-now.com/oauth_token.do and config {\\"clientId\\":\\"abc\\",\\"jwtKeyId\\":\\"def\\",\\"userIdentifierValue\\":\\"userA\\"} - Something went wrong!",
        ],
      ]
    `);
  });

  test('throws when getOAuthClientCredentialsAccessToken throws error', async () => {
    (getOAuthClientCredentialsAccessToken as jest.Mock).mockRejectedValue(
      new Error(`Something went wrong!`)
    );

    await expect(
      getOAuthAccessToken({
        type: 'client',
        options: {
          tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
          scope: 'https://graph.microsoft.com/.default',
          config: {
            clientId: 'abc',
            tenantId: 'def',
          },
          secrets: {
            clientSecret: 'iamasecret',
          },
        },
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Failed to retrieve access token]`);

    expect(getOAuthClientCredentialsAccessToken as jest.Mock).toHaveBeenCalled();
    expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
      Array [
        Array [
          "Failed to retrieved access token using Client Credentials OAuth with tokenUrl https://login.microsoftonline.com/98765/oauth2/v2.0/token, scope https://graph.microsoft.com/.default and config {\\"clientId\\":\\"abc\\",\\"tenantId\\":\\"def\\"} - Something went wrong!",
        ],
      ]
    `);
  });
});

describe('delete()', () => {
  beforeEach(() => {
    actionTypeRegistry.register({
      id: 'my-action-delete',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
      postDeleteHook: async (options) => postDeleteHook(options),
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-delete',
        isMissingSecrets: false,
        config: {},
        secrets: {},
      },
      references: [],
    });
  });

  describe('authorization', () => {
    test('ensures user is authorised to delete actions', async () => {
      await actionsClient.delete({ id: '1' });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'delete' });
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to delete all actions`)
      );

      await expect(actionsClient.delete({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to delete all actions]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'delete' });
    });

    test(`deletes any existing authorization tokens`, async () => {
      await actionsClient.delete({ id: '1' });
      expect(connectorTokenClient.deleteConnectorTokens).toHaveBeenCalledTimes(1);
    });

    test(`failing to delete tokens logs error instead of throw`, async () => {
      connectorTokenClient.deleteConnectorTokens.mockRejectedValueOnce(new Error('Fail'));
      await expect(actionsClient.delete({ id: '1' })).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to delete auth tokens for connector "1" after delete: Fail`
      );
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when deleting a connector', async () => {
      await actionsClient.delete({ id: '1' });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_delete',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
        })
      );
    });

    test('logs audit event when not authorised to delete a connector', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(actionsClient.delete({ id: '1' })).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_delete',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
    });
  });

  test('calls unsecuredSavedObjectsClient with id', async () => {
    const expectedResult = Symbol();
    unsecuredSavedObjectsClient.delete.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.delete({ id: '1' });
    expect(result).toEqual(expectedResult);
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        "1",
      ]
    `);
  });

  test('calls postDeleteHook', async () => {
    const expectedResult = Symbol();
    unsecuredSavedObjectsClient.delete.mockResolvedValueOnce(expectedResult);

    const result = await actionsClient.delete({ id: '1' });
    expect(result).toEqual(expectedResult);
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledTimes(1);
    expect(postDeleteHook).toHaveBeenCalledTimes(1);
  });

  it('throws when trying to delete a preconfigured connector', async () => {
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      inMemoryConnectors: [
        {
          id: 'testPreconfigured',
          actionTypeId: 'my-action-type',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
      actionExecutor,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    await expect(
      actionsClient.delete({ id: 'testPreconfigured' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Preconfigured action testPreconfigured is not allowed to delete."`
    );
  });

  it('throws when trying to delete a system connector', async () => {
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      inMemoryConnectors: [
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      actionExecutor,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    await expect(
      actionsClient.delete({ id: 'system-connector-.cases' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"System action system-connector-.cases is not allowed to delete."`
    );
  });

  test('deleting unregistered action types works as expected', async () => {
    const expectedResult = Symbol();
    unsecuredSavedObjectsClient.delete.mockResolvedValueOnce(expectedResult);
    unsecuredSavedObjectsClient.get = jest.fn().mockResolvedValueOnce({
      id: '2',
      type: 'action',
      attributes: {
        actionTypeId: 'unregistered-action-type-id',
        isMissingSecrets: false,
        config: {},
        secrets: {},
      },
      references: [],
    });

    const result = await actionsClient.delete({ id: '2' });
    expect(result).toEqual(expectedResult);

    // the event is logged but no error is thrown as expected
    expect(logger.error).toHaveBeenCalledWith(
      `Failed fetching action type from registry: Action type \"unregistered-action-type-id\" is not registered. - deletion will proceed.`
    );

    // deletion is called with the right params
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        "2",
      ]
    `);
  });
});

describe('update()', () => {
  function updateOperation(): ReturnType<ActionsClient['update']> {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
      },
      references: [],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
        name: 'my name',
        config: {},
        secrets: {},
      },
      references: [],
    });
    return actionsClient.update({
      id: 'my-action',
      action: {
        name: 'my name',
        config: {},
        secrets: {},
      },
    });
  }

  describe('authorization', () => {
    test('ensures user is authorised to update actions', async () => {
      await updateOperation();
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'update' });
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to update all actions`)
      );

      await expect(updateOperation()).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to update all actions]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'update' });
    });

    test(`deletes any existing authorization tokens`, async () => {
      await updateOperation();
      expect(connectorTokenClient.deleteConnectorTokens).toHaveBeenCalledTimes(1);
    });

    test(`failing to delete tokens logs error instead of throw`, async () => {
      connectorTokenClient.deleteConnectorTokens.mockRejectedValueOnce(new Error('Fail'));
      await expect(updateOperation()).resolves.toBeTruthy();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to delete auth tokens for connector "my-action" after update: Fail`
      );
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when updating a connector', async () => {
      await updateOperation();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_update',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: 'my-action', type: 'action' } },
        })
      );
    });

    test('logs audit event when not authorised to update a connector', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(updateOperation()).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_update',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: 'my-action', type: 'action' } },
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
    });
  });

  test('updates an action with all given properties', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
      preSaveHook,
      postSaveHook,
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
      },
      references: [],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
        name: 'my name',
        config: {},
        secrets: {},
      },
      references: [],
    });
    const result = await actionsClient.update({
      id: 'my-action',
      action: {
        name: 'my name',
        config: {},
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: 'my-action',
      isPreconfigured: false,
      isSystemAction: false,
      isDeprecated: false,
      actionTypeId: 'my-action-type',
      isMissingSecrets: false,
      name: 'my name',
      config: {},
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {},
          "isMissingSecrets": false,
          "name": "my name",
          "secrets": Object {},
        },
        Object {
          "id": "my-action",
          "overwrite": true,
          "references": Array [],
        },
      ]
    `);
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        "my-action",
      ]
    `);

    expect(preSaveHook).toHaveBeenCalledTimes(1);
    expect(postSaveHook).toHaveBeenCalledTimes(1);
  });

  test('updates an action with isMissingSecrets "true" (set true as the import result), to isMissingSecrets', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: true,
      },
      references: [],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: true,
        name: 'my name',
        config: {},
        secrets: {},
      },
      references: [],
    });
    const result = await actionsClient.update({
      id: 'my-action',
      action: {
        name: 'my name',
        config: {},
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: 'my-action',
      isPreconfigured: false,
      isSystemAction: false,
      isDeprecated: false,
      actionTypeId: 'my-action-type',
      isMissingSecrets: true,
      name: 'my name',
      config: {},
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {},
          "isMissingSecrets": false,
          "name": "my name",
          "secrets": Object {},
        },
        Object {
          "id": "my-action",
          "overwrite": true,
          "references": Array [],
        },
      ]
    `);
  });

  test('validates config', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
        config: {
          schema: schema.object({
            param1: schema.string(),
          }),
        },
      },
      executor,
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
      },
      references: [],
    });
    await expect(
      actionsClient.update({
        id: 'my-action',
        action: {
          name: 'my name',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  test('validates connector: config and secrets', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
        connector: () => {
          return '[param1] is required';
        },
      },
      executor,
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
      },
      references: [],
    });
    await expect(
      actionsClient.update({
        id: 'my-action',
        action: {
          name: 'my name',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: [param1] is required"`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: {
          schema: schema.object({ a: schema.boolean(), b: schema.boolean(), c: schema.boolean() }),
        },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
      },
      references: [],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: true,
        name: 'my name',
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
      references: [],
    });
    const result = await actionsClient.update({
      id: 'my-action',
      action: {
        name: 'my name',
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: 'my-action',
      isPreconfigured: false,
      isSystemAction: false,
      isDeprecated: false,
      actionTypeId: 'my-action-type',
      isMissingSecrets: true,
      name: 'my name',
      config: {
        a: true,
        b: true,
        c: true,
      },
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {
            "a": true,
            "b": true,
            "c": true,
          },
          "isMissingSecrets": false,
          "name": "my name",
          "secrets": Object {},
        },
        Object {
          "id": "my-action",
          "overwrite": true,
          "references": Array [],
        },
      ]
    `);
  });

  test('throws an error when ensureActionTypeEnabled throws', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });
    mockedLicenseState.ensureLicenseForActionType.mockImplementation(() => {
      throw new Error('Fail');
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
      },
      references: [],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
        name: 'my name',
        config: {},
        secrets: {},
      },
      references: [],
    });
    await expect(
      actionsClient.update({
        id: 'my-action',
        action: {
          name: 'my name',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });

  it('throws when trying to update a preconfigured connector', async () => {
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      inMemoryConnectors: [
        {
          id: 'testPreconfigured',
          actionTypeId: 'my-action-type',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
      actionExecutor,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    await expect(
      actionsClient.update({
        id: 'testPreconfigured',
        action: {
          name: 'my name',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Preconfigured action testPreconfigured can not be updated."`
    );
  });

  it('throws when trying to update a system connector', async () => {
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      inMemoryConnectors: [
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      actionExecutor,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    await expect(
      actionsClient.update({
        id: 'system-connector-.cases',
        action: {
          name: 'my name',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"System action system-connector-.cases can not be updated."`
    );
  });
});

describe('execute()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to excecute actions', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());
      await actionsClient.execute({
        actionId: 'action-id',
        params: {
          name: 'my name',
        },
        source: asHttpRequestExecutionSource(request),
      });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        actionTypeId: 'my-action-type',
        operation: 'execute',
        additionalPrivileges: [],
      });
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to execute all actions`)
      );

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());

      await expect(
        actionsClient.execute({
          actionId: 'action-id',
          params: {
            name: 'my name',
          },
          source: asHttpRequestExecutionSource(request),
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to execute all actions]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        actionTypeId: 'my-action-type',
        operation: 'execute',
        additionalPrivileges: [],
      });
    });

    test('ensures that system actions privileges are being authorized correctly', async () => {
      actionsClient = new ActionsClient({
        inMemoryConnectors: [
          {
            id: 'system-connector-.cases',
            actionTypeId: '.cases',
            name: 'System action: .cases',
            config: {},
            secrets: {},
            isDeprecated: false,
            isMissingSecrets: false,
            isPreconfigured: false,
            isSystemAction: true,
          },
        ],
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        auditLogger,
        usageCounter: mockUsageCounter,
        connectorTokenClient,
        getEventLogClient,
      });

      actionTypeRegistry.register({
        id: '.cases',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        getKibanaPrivileges: () => ['test/create'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());

      await actionsClient.execute({
        actionId: 'system-connector-.cases',
        params: {},
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        actionTypeId: '.cases',
        operation: 'execute',
        additionalPrivileges: ['test/create'],
      });
    });

    test('does not authorize kibana privileges for non system actions', async () => {
      actionsClient = new ActionsClient({
        inMemoryConnectors: [
          {
            id: 'testPreconfigured',
            actionTypeId: 'my-action-type',
            secrets: {
              test: 'test1',
            },
            isPreconfigured: true,
            isDeprecated: false,
            isSystemAction: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        auditLogger,
        usageCounter: mockUsageCounter,
        connectorTokenClient,
        getEventLogClient,
      });

      actionTypeRegistry.register({
        id: '.cases',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        getKibanaPrivileges: () => ['test/create'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());

      await actionsClient.execute({
        actionId: 'testPreconfigured',
        params: {},
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        actionTypeId: 'my-action-type',
        operation: 'execute',
        additionalPrivileges: [],
      });
    });

    test('pass the params to the actionTypeRegistry when authorizing system actions', async () => {
      const getKibanaPrivileges = jest.fn().mockReturnValue(['test/create']);

      actionsClient = new ActionsClient({
        inMemoryConnectors: [
          {
            id: 'system-connector-.cases',
            actionTypeId: '.cases',
            name: 'System action: .cases',
            config: {},
            secrets: {},
            isDeprecated: false,
            isMissingSecrets: false,
            isPreconfigured: false,
            isSystemAction: true,
          },
        ],
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        auditLogger,
        usageCounter: mockUsageCounter,
        connectorTokenClient,
        getEventLogClient,
      });

      actionTypeRegistry.register({
        id: '.cases',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        getKibanaPrivileges,
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(actionTypeIdFromSavedObjectMock());

      await actionsClient.execute({
        actionId: 'system-connector-.cases',
        params: { foo: 'bar' },
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        actionTypeId: '.cases',
        operation: 'execute',
        additionalPrivileges: ['test/create'],
      });

      expect(getKibanaPrivileges).toHaveBeenCalledWith({ params: { foo: 'bar' } });
    });
  });

  test('calls the actionExecutor with the appropriate parameters', async () => {
    const actionId = uuidv4();
    const actionExecutionId = uuidv4();
    actionExecutor.execute.mockResolvedValue({ status: 'ok', actionId });
    await expect(
      actionsClient.execute({
        actionId,
        params: {
          name: 'my name',
        },
        source: asHttpRequestExecutionSource(request),
      })
    ).resolves.toMatchObject({ status: 'ok', actionId });

    expect(actionExecutor.execute).toHaveBeenCalledWith({
      actionId,
      request,
      params: {
        name: 'my name',
      },
      actionExecutionId,
      source: asHttpRequestExecutionSource(request),
    });

    await expect(
      actionsClient.execute({
        actionId,
        params: {
          name: 'my name',
        },
        source: asHttpRequestExecutionSource(request),
        relatedSavedObjects: [
          {
            id: 'some-id',
            typeId: 'some-type-id',
            type: 'some-type',
          },
        ],
      })
    ).resolves.toMatchObject({ status: 'ok', actionId });

    expect(actionExecutor.execute).toHaveBeenCalledWith({
      actionId,
      request,
      params: {
        name: 'my name',
      },
      relatedSavedObjects: [
        {
          id: 'some-id',
          typeId: 'some-type-id',
          type: 'some-type',
        },
      ],
      actionExecutionId,
      source: asHttpRequestExecutionSource(request),
    });

    await expect(
      actionsClient.execute({
        actionId,
        params: {
          name: 'my name',
        },
        source: asHttpRequestExecutionSource(request),
        relatedSavedObjects: [
          {
            id: 'some-id',
            typeId: 'some-type-id',
            type: 'some-type',
            namespace: 'some-namespace',
          },
        ],
      })
    ).resolves.toMatchObject({ status: 'ok', actionId });

    expect(actionExecutor.execute).toHaveBeenCalledWith({
      actionId,
      request,
      params: {
        name: 'my name',
      },
      source: asHttpRequestExecutionSource(request),
      relatedSavedObjects: [
        {
          id: 'some-id',
          typeId: 'some-type-id',
          type: 'some-type',
          namespace: 'some-namespace',
        },
      ],
      actionExecutionId,
    });
  });
});

describe('bulkEnqueueExecution()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to execute actions', async () => {
      await actionsClient.bulkEnqueueExecution([
        {
          id: uuidv4(),
          params: {},
          spaceId: 'default',
          executionId: '123abc',
          apiKey: null,
          source: asHttpRequestExecutionSource(request),
          actionTypeId: 'my-action-type',
        },
        {
          id: uuidv4(),
          params: {},
          spaceId: 'default',
          executionId: '456def',
          apiKey: null,
          source: asHttpRequestExecutionSource(request),
          actionTypeId: 'my-action-type',
        },
      ]);
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        actionTypeId: 'my-action-type',
        operation: 'execute',
      });
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to execute all actions`)
      );

      await expect(
        actionsClient.bulkEnqueueExecution([
          {
            id: uuidv4(),
            params: {},
            spaceId: 'default',
            executionId: '123abc',
            apiKey: null,
            source: asHttpRequestExecutionSource(request),
            actionTypeId: 'my-action-type',
          },
          {
            id: uuidv4(),
            params: {},
            spaceId: 'default',
            executionId: '456def',
            apiKey: null,
            source: asHttpRequestExecutionSource(request),
            actionTypeId: 'my-action-type',
          },
        ])
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to execute all actions]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: 'execute',
      });
    });
  });

  test('calls the bulkExecutionEnqueuer with the appropriate parameters', async () => {
    const opts = [
      {
        id: uuidv4(),
        params: {},
        spaceId: 'default',
        executionId: '123abc',
        apiKey: null,
        source: asHttpRequestExecutionSource(request),
        actionTypeId: 'my-action-type',
      },
      {
        id: uuidv4(),
        params: {},
        spaceId: 'default',
        executionId: '456def',
        apiKey: null,
        source: asHttpRequestExecutionSource(request),
        actionTypeId: 'my-action-type',
      },
    ];
    await expect(actionsClient.bulkEnqueueExecution(opts)).resolves.toMatchInlineSnapshot(
      `undefined`
    );

    expect(bulkExecutionEnqueuer).toHaveBeenCalledWith(unsecuredSavedObjectsClient, opts);
  });
});

describe('isActionTypeEnabled()', () => {
  const fooActionType: ActionType = {
    id: 'foo',
    name: 'Foo',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({}) },
      secrets: { schema: schema.object({}) },
      params: { schema: schema.object({}) },
    },
    executor: jest.fn(),
  };
  beforeEach(() => {
    actionTypeRegistry.register(fooActionType);
  });

  test('should call isLicenseValidForActionType of the license state with notifyUsage false by default', () => {
    mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
    actionsClient.isActionTypeEnabled('foo');
    expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(fooActionType, {
      notifyUsage: false,
    });
  });

  test('should call isLicenseValidForActionType of the license state with notifyUsage true when specified', () => {
    mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
    actionsClient.isActionTypeEnabled('foo', { notifyUsage: true });
    expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(fooActionType, {
      notifyUsage: true,
    });
  });
});

describe('isPreconfigured()', () => {
  test('should return true if the connector is a preconfigured connector', () => {
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
        {
          id: 'testPreconfigured',
          actionTypeId: 'my-action-type',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      connectorTokenClient: new ConnectorTokenClient({
        unsecuredSavedObjectsClient: savedObjectsClientMock.create(),
        encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
        logger,
      }),
      getEventLogClient,
    });

    expect(actionsClient.isPreconfigured('testPreconfigured')).toEqual(true);
  });

  test('should return false if the connector is not preconfigured connector', () => {
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
        {
          id: 'testPreconfigured',
          actionTypeId: 'my-action-type',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      connectorTokenClient: new ConnectorTokenClient({
        unsecuredSavedObjectsClient: savedObjectsClientMock.create(),
        encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
        logger,
      }),
      getEventLogClient,
    });

    expect(actionsClient.isPreconfigured(uuidv4())).toEqual(false);
  });
});

describe('isSystemAction()', () => {
  test('should return true if the connector is a system connectors', () => {
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
        {
          id: 'testPreconfigured',
          actionTypeId: 'my-action-type',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      connectorTokenClient: new ConnectorTokenClient({
        unsecuredSavedObjectsClient: savedObjectsClientMock.create(),
        encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
        logger,
      }),
      getEventLogClient,
    });

    expect(actionsClient.isSystemAction('system-connector-.cases')).toEqual(true);
  });

  test('should return false if connector id is not a system action', () => {
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
        {
          id: 'testPreconfigured',
          actionTypeId: 'my-action-type',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      connectorTokenClient: new ConnectorTokenClient({
        unsecuredSavedObjectsClient: savedObjectsClientMock.create(),
        encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
        logger,
      }),
      getEventLogClient,
    });

    expect(actionsClient.isSystemAction(uuidv4())).toEqual(false);
  });
});

describe('getGlobalExecutionLogWithAuth()', () => {
  const opts: GetGlobalExecutionLogParams = {
    dateStart: '2023-01-09T08:55:56-08:00',
    dateEnd: '2023-01-10T08:55:56-08:00',
    page: 1,
    perPage: 50,
    sort: [{ timestamp: { order: 'desc' } }],
  };
  const results = {
    aggregations: {
      executionLogAgg: {
        doc_count: 5,
        executionUuid: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [],
        },
        executionUuidCardinality: { doc_count: 5, executionUuidCardinality: { value: 5 } },
      },
    },
    hits: {
      total: { value: 5, relation: 'eq' },
      hits: [],
    } as estypes.SearchHitsMetadata<unknown>,
  };
  describe('authorization', () => {
    test('ensures user is authorised to access logs', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue(results);

      await actionsClient.getGlobalExecutionLogWithAuth(opts);
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('throws when user is not authorised to access logs', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error(`Unauthorized to access logs`));

      await expect(actionsClient.getGlobalExecutionLogWithAuth(opts)).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to access logs]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });
  });

  test('calls the eventLogClient with the appropriate parameters', async () => {
    eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue(results);

    await expect(actionsClient.getGlobalExecutionLogWithAuth(opts)).resolves.toMatchInlineSnapshot(`
      Object {
        "data": Array [],
        "total": 5,
      }
    `);
    expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalled();
  });
});

describe('getGlobalExecutionKpiWithAuth()', () => {
  const opts: GetGlobalExecutionKPIParams = {
    dateStart: '2023-01-09T08:55:56-08:00',
    dateEnd: '2023-01-10T08:55:56-08:00',
  };
  const results = {
    aggregations: {
      executionKpiAgg: {
        doc_count: 5,
        executionUuid: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [],
        },
      },
    },
    hits: {
      total: { value: 5, relation: 'eq' },
      hits: [],
    } as estypes.SearchHitsMetadata<unknown>,
  };
  describe('authorization', () => {
    test('ensures user is authorised to access kpi', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue(results);

      await actionsClient.getGlobalExecutionKpiWithAuth(opts);
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('throws when user is not authorised to access kpi', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error(`Unauthorized to access kpi`));

      await expect(actionsClient.getGlobalExecutionKpiWithAuth(opts)).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to access kpi]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });
  });

  test('calls the eventLogClient with the appropriate parameters', async () => {
    eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue(results);

    await expect(actionsClient.getGlobalExecutionKpiWithAuth(opts)).resolves.toMatchInlineSnapshot(`
      Object {
        "failure": 0,
        "success": 0,
        "unknown": 0,
        "warning": 0,
      }
    `);
    expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalled();
  });
});
