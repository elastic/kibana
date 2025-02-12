/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../rules_client';
import { GetActionErrorLogByIdParams } from '../methods/get_action_error_log';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { fromKueryExpression } from '@kbn/es-query';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/mocks';
import { SavedObject } from '@kbn/core/server';
import { RawRule } from '../../types';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, mockedDateString, setGlobalDate } from './lib';
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { backfillClientMock } from '../../backfill_client/backfill_client.mock';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const eventLogClient = eventLogClientMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const kibanaVersion = 'v7.10.0';
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry, eventLogClient);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

const RuleIntervalSeconds = 1;

const BaseRuleSavedObject: SavedObject<RawRule> = {
  id: '1',
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: {
    enabled: true,
    name: 'rule-name',
    tags: ['tag-1', 'tag-2'],
    alertTypeId: '123',
    consumer: 'rule-consumer',
    legacyId: null,
    schedule: { interval: `${RuleIntervalSeconds}s` },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: mockedDateString,
    updatedAt: mockedDateString,
    apiKey: null,
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: '2020-08-20T19:23:38Z',
      error: null,
      warning: null,
    },
    revision: 0,
  },
  references: [],
};

const findResults = {
  page: 1,
  per_page: 500,
  total: 5,
  data: [
    {
      _id: 'test-id-0',
      _index: 'test',
      _seq_no: 1,
      _primary_term: 1,
      '@timestamp': '2022-03-23T17:37:07.106Z',
      event: {
        provider: 'actions',
        action: 'execute',
        kind: 'action',
        start: '2022-03-23T17:37:07.105Z',
        end: '2022-03-23T17:37:07.105Z',
        duration: '0',
        outcome: 'failure',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'action',
            id: '9e67b8b0-9e2c-11ec-bd64-774ed95c43ef',
            type_id: '.server-log',
          },
          {
            rel: 'primary',
            type: RULE_SAVED_OBJECT_TYPE,
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            type_id: 'example.always-firing',
          },
        ],
        task: {
          scheduled: '2022-03-23T17:37:04.674Z',
          schedule_delay: 2431000000,
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      message: 'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s',
      error: {
        message:
          'an error occurred while running the action executor: something funky with the server log',
      },
      ecs: {
        version: '1.8.0',
      },
    },
    {
      _id: 'test-id-1',
      _index: 'test',
      _seq_no: 1,
      _primary_term: 1,
      '@timestamp': '2022-03-23T17:37:07.102Z',
      event: {
        provider: 'actions',
        action: 'execute',
        kind: 'action',
        start: '2022-03-23T17:37:07.101Z',
        end: '2022-03-23T17:37:07.102Z',
        duration: '1000000',
        outcome: 'failure',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'action',
            id: '9e67b8b0-9e2c-11ec-bd64-774ed95c43ef',
            type_id: '.server-log',
          },
          {
            rel: 'primary',
            type: RULE_SAVED_OBJECT_TYPE,
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            type_id: 'example.always-firing',
          },
        ],
        task: {
          scheduled: '2022-03-23T17:37:04.676Z',
          schedule_delay: 2425000000,
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      message: 'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s',
      error: {
        message:
          'an error occurred while running the action executor: something funky with the server log',
      },
      ecs: {
        version: '1.8.0',
      },
    },
    {
      _id: 'test-id-2',
      _index: 'test',
      _seq_no: 1,
      _primary_term: 1,
      '@timestamp': '2022-03-23T17:37:07.098Z',
      event: {
        provider: 'actions',
        action: 'execute',
        kind: 'action',
        start: '2022-03-23T17:37:07.098Z',
        end: '2022-03-23T17:37:07.098Z',
        duration: '0',
        outcome: 'failure',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'action',
            id: '9e67b8b0-9e2c-11ec-bd64-774ed95c43ef',
            type_id: '.server-log',
          },
          {
            rel: 'primary',
            type: RULE_SAVED_OBJECT_TYPE,
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            type_id: 'example.always-firing',
          },
        ],
        task: {
          scheduled: '2022-03-23T17:37:04.673Z',
          schedule_delay: 2425000000,
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      message: 'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s',
      error: {
        message:
          'an error occurred while running the action executor: something funky with the server log',
      },
      ecs: {
        version: '1.8.0',
      },
    },
    {
      _id: 'test-id-3',
      _index: 'test',
      _seq_no: 1,
      _primary_term: 1,
      '@timestamp': '2022-03-23T17:37:07.096Z',
      event: {
        provider: 'actions',
        action: 'execute',
        kind: 'action',
        start: '2022-03-23T17:37:07.095Z',
        end: '2022-03-23T17:37:07.096Z',
        duration: '1000000',
        outcome: 'failure',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'action',
            id: '9e67b8b0-9e2c-11ec-bd64-774ed95c43ef',
            type_id: '.server-log',
          },
          {
            rel: 'primary',
            type: RULE_SAVED_OBJECT_TYPE,
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            type_id: 'example.always-firing',
          },
        ],
        task: {
          scheduled: '2022-03-23T17:37:04.677Z',
          schedule_delay: 2418000000,
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      message: 'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s',
      error: {
        message:
          'an error occurred while running the action executor: something funky with the server log',
      },
      ecs: {
        version: '1.8.0',
      },
    },
    {
      _id: 'test-id-4',
      _index: 'test',
      _seq_no: 1,
      _primary_term: 1,
      '@timestamp': '2022-03-23T17:37:07.086Z',
      event: {
        provider: 'actions',
        action: 'execute',
        kind: 'action',
        start: '2022-03-23T17:37:07.084Z',
        end: '2022-03-23T17:37:07.086Z',
        duration: '2000000',
        outcome: 'failure',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'action',
            id: '9e67b8b0-9e2c-11ec-bd64-774ed95c43ef',
            type_id: '.server-log',
          },
          {
            rel: 'primary',
            type: RULE_SAVED_OBJECT_TYPE,
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            type_id: 'example.always-firing',
          },
        ],
        task: {
          scheduled: '2022-03-23T17:37:04.678Z',
          schedule_delay: 2406000000,
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      message: 'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s',
      error: {
        message:
          'an error occurred while running the action executor: something funky with the server log',
      },
      ecs: {
        version: '1.8.0',
      },
    },
  ],
};

const getRuleSavedObject = (attributes: Partial<RawRule> = {}): SavedObject<RawRule> => {
  return {
    ...BaseRuleSavedObject,
    attributes: { ...BaseRuleSavedObject.attributes, ...attributes },
  };
};

const getActionErrorLogParams = (overwrites = {}) => {
  return {
    id: '1',
    dateStart: new Date(Date.now() - 3600000).toISOString(),
    page: 1,
    perPage: 10,
    sort: [
      {
        '@timestamp': {
          order: 'asc',
        },
      },
    ] as GetActionErrorLogByIdParams['sort'],
    ...overwrites,
  };
};

describe('getActionErrorLog()', () => {
  let rulesClient: RulesClient;

  beforeEach(() => {
    rulesClient = new RulesClient(rulesClientParams);
  });

  test('returns the expected return values when called', async () => {
    const ruleSO = getRuleSavedObject({});
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ruleSO);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    const result = await rulesClient.getActionErrorLog(getActionErrorLogParams());
    expect(result).toEqual({
      totalErrors: 5,
      errors: [
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.106Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.102Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.098Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.096Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.086Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
      ],
    });
  });

  test('calls event log client with legacy ids param', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(
      getRuleSavedObject({ legacyId: '99999' })
    );

    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    await rulesClient.getActionErrorLog(getActionErrorLogParams());

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds.mock.calls[0]).toEqual([
      RULE_SAVED_OBJECT_TYPE,
      ['1'],
      {
        page: 1,
        per_page: 10,
        filter:
          'event.provider:actions AND ((event.action:execute AND (event.outcome:failure OR kibana.alerting.status:warning)) OR (event.action:execute-timeout))',
        sort: [{ sort_field: '@timestamp', sort_order: 'asc' }],
        end: mockedDateString,
        start: '2019-02-12T20:01:22.479Z',
      },
      ['99999'],
    ]);
  });

  test('calls event log client with end date, filter, and paging', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    await rulesClient.getActionErrorLog(
      getActionErrorLogParams({
        page: 3,
        perPage: 20,
        dateEnd: new Date(Date.now() - 2700000).toISOString(),
        filter: 'message: "test" AND runId: 123',
      })
    );

    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds.mock.calls[0]).toEqual([
      RULE_SAVED_OBJECT_TYPE,
      ['1'],
      {
        page: 3,
        per_page: 20,
        filter:
          '(event.provider:actions AND ((event.action:execute AND (event.outcome:failure OR kibana.alerting.status:warning)) OR (event.action:execute-timeout))) AND (message: "test" AND runId: 123)',
        sort: [{ sort_field: '@timestamp', sort_order: 'asc' }],
        end: '2019-02-12T20:16:22.479Z',
        start: '2019-02-12T20:01:22.479Z',
      },
      undefined,
    ]);
  });

  test('throws error when eventLog.findEventsBySavedObjectIds throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.findEventsBySavedObjectIds.mockRejectedValueOnce(new Error('OMG 3!'));

    await expect(
      rulesClient.getActionErrorLog(getActionErrorLogParams())
    ).rejects.toMatchInlineSnapshot(`[Error: OMG 3!]`);
  });
  describe('authorization', () => {
    beforeEach(() => {
      const ruleSO = getRuleSavedObject({});
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ruleSO);
    });

    test('ensures user is authorised to get this type of alert under the consumer', async () => {
      eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);
      await rulesClient.getActionErrorLog(getActionErrorLogParams());

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'rule-consumer',
        operation: 'get',
        ruleTypeId: '123',
      });
    });

    test('throws when user is not authorised to get this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValueOnce(
        new Error(`Unauthorized to get a "myType" alert for "myApp"`)
      );

      await expect(
        rulesClient.getActionErrorLog(getActionErrorLogParams())
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to get a "myType" alert for "myApp"]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'rule-consumer',
        operation: 'get',
        ruleTypeId: '123',
      });
    });
  });

  describe('auditLogger', () => {
    beforeEach(() => {
      const ruleSO = getRuleSavedObject({});
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ruleSO);
    });

    test('logs audit event when getting a rule execution log', async () => {
      eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);
      await rulesClient.getActionErrorLog(getActionErrorLogParams());
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_get_action_error_log',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'rule-name' } },
        })
      );
    });

    test('logs audit event when not authorised to get a rule', async () => {
      // first call occurs during rule SO get
      authorization.ensureAuthorized.mockResolvedValueOnce();
      authorization.ensureAuthorized.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(
        rulesClient.getActionErrorLog(getActionErrorLogParams())
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_get_action_error_log',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: '1',
              type: RULE_SAVED_OBJECT_TYPE,
              name: 'rule-name',
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
});

describe('getActionErrorLogWithAuth()', () => {
  let rulesClient: RulesClient;

  beforeEach(() => {
    rulesClient = new RulesClient(rulesClientParams);
  });

  test('returns the expected return values when called', async () => {
    const ruleSO = getRuleSavedObject({});
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      filter: fromKueryExpression('*'),
      ensureRuleTypeIsAuthorized() {},
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ruleSO);
    eventLogClient.findEventsWithAuthFilter.mockResolvedValueOnce(findResults);

    const result = await rulesClient.getActionErrorLogWithAuth(getActionErrorLogParams());
    expect(result).toEqual({
      totalErrors: 5,
      errors: [
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.106Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.102Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.098Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.096Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.086Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
      ],
    });
  });
});
