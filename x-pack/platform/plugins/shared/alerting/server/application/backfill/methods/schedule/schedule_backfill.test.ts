/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { RULE_SAVED_OBJECT_TYPE } from '../../../..';
import { AlertingAuthorization } from '../../../../authorization';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { RecoveredActionGroup } from '@kbn/alerting-types';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { fromKueryExpression } from '@kbn/es-query';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { asyncForEach } from '@kbn/std';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { ConstructorOptions, RulesClient } from '../../../../rules_client';
import { ScheduleBackfillParam } from './types';
import { adHocRunStatus } from '../../../../../common/constants';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';

const kibanaVersion = 'v8.0.0';
const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const backfillClient = backfillClientMock.create();
const eventLogger = eventLoggerMock.create();
const eventLogClient = eventLogClientMock.create();

const filter = fromKueryExpression(
  '((alert.attributes.alertTypeId:myType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myOtherApp))'
);

const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient,
  isSystemAction: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  eventLogger,
};

const fakeRuleName = 'fakeRuleName';

const existingRule = {
  id: '1',
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: {
    enabled: false,
    tags: ['foo'],
    createdBy: 'user',
    createdAt: '2019-02-12T21:01:22.479Z',
    updatedAt: '2019-02-12T21:01:22.479Z',
    legacyId: null,
    muteAll: false,
    mutedInstanceIds: [],
    snoozeSchedule: [],
    alertTypeId: 'myType',
    schedule: { interval: '1m' },
    consumer: 'myApp',
    scheduledTaskId: 'task-123',
    executionStatus: {
      lastExecutionDate: '2019-02-12T21:01:22.479Z',
      status: 'pending',
    },
    params: {},
    throttle: null,
    notifyWhen: null,
    actions: [],
    systemActions: [],
    name: fakeRuleName,
    revision: 0,
  },
  references: [],
  version: '123',
};
const MOCK_API_KEY = Buffer.from('123:abc').toString('base64');
const existingDecryptedRule1 = {
  ...existingRule,
  attributes: {
    ...existingRule.attributes,
    apiKey: MOCK_API_KEY,
    apiKeyCreatedByUser: false,
  },
};
const existingDecryptedRule2 = {
  ...existingRule,
  id: '2',
  attributes: {
    ...existingRule.attributes,
    apiKey: MOCK_API_KEY,
    apiKeyCreatedByUser: false,
  },
};

const mockBulkQueueResult = [
  {
    ruleId: '1',
    status: 'pending',
    backfillId: 'abc',
    backfillRuns: [
      {
        start: '2023-11-16T08:00:00.000Z',
        end: '2023-11-16T08:05:00.000Z',
        status: adHocRunStatus.PENDING,
      },
      {
        start: '2023-11-16T08:05:00.000Z',
        end: '2023-11-16T08:10:00.000Z',
        status: adHocRunStatus.PENDING,
      },
    ],
  },
  {
    ruleId: '2',
    status: 'pending',
    backfillId: 'def',
    backfillRuns: [
      {
        start: '2023-11-16T08:00:00.000Z',
        end: '2023-11-16T08:05:00.000Z',
        status: adHocRunStatus.PENDING,
      },
      {
        start: '2023-11-16T08:05:00.000Z',
        end: '2023-11-16T08:10:00.000Z',
        status: adHocRunStatus.PENDING,
      },
    ],
  },
];

const mockCreatePointInTimeFinderAsInternalUser = (
  response = { saved_objects: [existingDecryptedRule1, existingDecryptedRule2] }
) => {
  encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
    .fn()
    .mockResolvedValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield response;
      },
    });
};

function getMockData(overwrites: Record<string, unknown> = {}): ScheduleBackfillParam {
  return {
    ruleId: '1',
    start: '2023-11-16T08:00:00.000Z',
    runActions: true,
    ...overwrites,
  };
}

describe('scheduleBackfill()', () => {
  let rulesClient: RulesClient;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-12-16T08:00:00.000Z'));
  });
  beforeEach(async () => {
    jest.resetAllMocks();
    rulesClient = new RulesClient(rulesClientParams);
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      filter,
      ensureRuleTypeIsAuthorized() {},
    });
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      aggregations: {
        alertTypeId: {
          buckets: [{ key: ['myType', 'myApp'], key_as_string: 'myType|myApp', doc_count: 1 }],
        },
      },
      saved_objects: [],
      per_page: 0,
      page: 0,
      total: 1,
    });
    ruleTypeRegistry.get.mockReturnValue({
      id: 'myType',
      name: 'Test',
      actionGroups: [
        { id: 'default', name: 'Default' },
        { id: 'custom', name: 'Not the Default' },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      async executor() {
        return { state: {} };
      },
      category: 'test',
      producer: 'alerts',
      validate: {
        params: { validate: (params) => params },
      },
      validLegacyConsumers: [],
      autoRecoverAlerts: false,
    });
    mockCreatePointInTimeFinderAsInternalUser({
      saved_objects: [
        {
          ...existingDecryptedRule1,
          attributes: { ...existingDecryptedRule1.attributes, enabled: true },
        },
        {
          ...existingDecryptedRule2,
          attributes: { ...existingDecryptedRule2.attributes, enabled: true },
        },
      ],
    });
    backfillClient.bulkQueue.mockResolvedValue(mockBulkQueueResult);
  });
  afterAll(() => jest.useRealTimers());

  test('should successfully schedule backfill', async () => {
    const mockData = [getMockData(), getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' })];
    rulesClientParams.getEventLogClient.mockResolvedValue(eventLogClient);

    const result = await rulesClient.scheduleBackfill(mockData);

    expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
      filterOpts: {
        fieldNames: {
          consumer: 'alert.attributes.consumer',
          ruleTypeId: 'alert.attributes.alertTypeId',
        },
        type: 'kql',
      },
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      aggs: {
        alertTypeId: {
          multi_terms: {
            terms: [
              { field: 'alert.attributes.alertTypeId' },
              { field: 'alert.attributes.consumer' },
            ],
          },
        },
      },
      filter: {
        arguments: [
          {
            arguments: [
              {
                arguments: [
                  { isQuoted: false, type: 'literal', value: 'alert.id' },
                  { isQuoted: false, type: 'literal', value: 'alert:1' },
                ],
                function: 'is',
                type: 'function',
              },
              {
                arguments: [
                  { isQuoted: false, type: 'literal', value: 'alert.id' },
                  { isQuoted: false, type: 'literal', value: 'alert:2' },
                ],
                function: 'is',
                type: 'function',
              },
            ],
            function: 'or',
            type: 'function',
          },
          {
            arguments: [
              {
                arguments: [
                  {
                    arguments: [
                      { isQuoted: false, type: 'literal', value: 'alert.attributes.alertTypeId' },
                      { isQuoted: false, type: 'literal', value: 'myType' },
                    ],
                    function: 'is',
                    type: 'function',
                  },
                  {
                    arguments: [
                      { isQuoted: false, type: 'literal', value: 'alert.attributes.consumer' },
                      { isQuoted: false, type: 'literal', value: 'myApp' },
                    ],
                    function: 'is',
                    type: 'function',
                  },
                ],
                function: 'and',
                type: 'function',
              },
              {
                arguments: [
                  {
                    arguments: [
                      { isQuoted: false, type: 'literal', value: 'alert.attributes.alertTypeId' },
                      { isQuoted: false, type: 'literal', value: 'myOtherType' },
                    ],
                    function: 'is',
                    type: 'function',
                  },
                  {
                    arguments: [
                      { isQuoted: false, type: 'literal', value: 'alert.attributes.consumer' },
                      { isQuoted: false, type: 'literal', value: 'myApp' },
                    ],
                    function: 'is',
                    type: 'function',
                  },
                ],
                function: 'and',
                type: 'function',
              },
              {
                arguments: [
                  {
                    arguments: [
                      { isQuoted: false, type: 'literal', value: 'alert.attributes.alertTypeId' },
                      { isQuoted: false, type: 'literal', value: 'myOtherType' },
                    ],
                    function: 'is',
                    type: 'function',
                  },
                  {
                    arguments: [
                      { isQuoted: false, type: 'literal', value: 'alert.attributes.consumer' },
                      { isQuoted: false, type: 'literal', value: 'myOtherApp' },
                    ],
                    function: 'is',
                    type: 'function',
                  },
                ],
                function: 'and',
                type: 'function',
              },
            ],
            function: 'or',
            type: 'function',
          },
        ],
        function: 'and',
        type: 'function',
      },
      page: 1,
      perPage: 0,
      namespaces: ['default'],
      type: 'alert',
    });

    expect(auditLogger.log).toHaveBeenCalledTimes(2);
    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      event: {
        action: 'rule_schedule_backfill',
        category: ['database'],
        outcome: 'success',
        type: ['access'],
      },
      kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'fakeRuleName' } },
      message: 'User has scheduled backfill for rule [id=1] [name=fakeRuleName]',
    });
    expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
      event: {
        action: 'rule_schedule_backfill',
        category: ['database'],
        outcome: 'success',
        type: ['access'],
      },
      kibana: { saved_object: { id: '2', type: RULE_SAVED_OBJECT_TYPE, name: 'fakeRuleName' } },
      message: 'User has scheduled backfill for rule [id=2] [name=fakeRuleName]',
    });

    expect(backfillClient.bulkQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        auditLogger,
        params: mockData,
        ruleTypeRegistry,
        unsecuredSavedObjectsClient,
        spaceId: 'default',
        rules: [
          {
            id: existingDecryptedRule1.id,
            legacyId: null,
            actions: existingDecryptedRule1.attributes.actions,
            alertTypeId: existingDecryptedRule1.attributes.alertTypeId,
            apiKey: existingDecryptedRule1.attributes.apiKey,
            apiKeyCreatedByUser: existingDecryptedRule1.attributes.apiKeyCreatedByUser,
            consumer: existingDecryptedRule1.attributes.consumer,
            createdAt: new Date(existingDecryptedRule1.attributes.createdAt),
            createdBy: existingDecryptedRule1.attributes.createdBy,
            enabled: true,
            executionStatus: {
              ...existingDecryptedRule1.attributes.executionStatus,
              lastExecutionDate: new Date(
                existingDecryptedRule1.attributes.executionStatus.lastExecutionDate
              ),
            },
            muteAll: existingDecryptedRule1.attributes.muteAll,
            mutedInstanceIds: existingDecryptedRule1.attributes.mutedInstanceIds,
            name: existingDecryptedRule1.attributes.name,
            notifyWhen: existingDecryptedRule1.attributes.notifyWhen,
            params: existingDecryptedRule1.attributes.params,
            revision: existingDecryptedRule1.attributes.revision,
            schedule: existingDecryptedRule1.attributes.schedule,
            scheduledTaskId: existingDecryptedRule1.attributes.scheduledTaskId,
            snoozeSchedule: existingDecryptedRule1.attributes.snoozeSchedule,
            systemActions: existingDecryptedRule1.attributes.systemActions,
            tags: existingDecryptedRule1.attributes.tags,
            throttle: existingDecryptedRule1.attributes.throttle,
            updatedAt: new Date(existingDecryptedRule1.attributes.updatedAt),
          },
          {
            id: existingDecryptedRule2.id,
            legacyId: null,
            actions: existingDecryptedRule2.attributes.actions,
            alertTypeId: existingDecryptedRule2.attributes.alertTypeId,
            apiKey: existingDecryptedRule2.attributes.apiKey,
            apiKeyCreatedByUser: existingDecryptedRule2.attributes.apiKeyCreatedByUser,
            consumer: existingDecryptedRule2.attributes.consumer,
            createdAt: new Date(existingDecryptedRule2.attributes.createdAt),
            createdBy: existingDecryptedRule2.attributes.createdBy,
            enabled: true,
            executionStatus: {
              ...existingDecryptedRule2.attributes.executionStatus,
              lastExecutionDate: new Date(
                existingDecryptedRule2.attributes.executionStatus.lastExecutionDate
              ),
            },
            muteAll: existingDecryptedRule2.attributes.muteAll,
            mutedInstanceIds: existingDecryptedRule2.attributes.mutedInstanceIds,
            name: existingDecryptedRule2.attributes.name,
            notifyWhen: existingDecryptedRule2.attributes.notifyWhen,
            params: existingDecryptedRule2.attributes.params,
            revision: existingDecryptedRule2.attributes.revision,
            schedule: existingDecryptedRule2.attributes.schedule,
            scheduledTaskId: existingDecryptedRule2.attributes.scheduledTaskId,
            snoozeSchedule: existingDecryptedRule2.attributes.snoozeSchedule,
            systemActions: existingDecryptedRule2.attributes.systemActions,
            tags: existingDecryptedRule2.attributes.tags,
            throttle: existingDecryptedRule2.attributes.throttle,
            updatedAt: new Date(existingDecryptedRule2.attributes.updatedAt),
          },
        ],
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      })
    );
    expect(result).toEqual(mockBulkQueueResult);
  });

  describe('error handling', () => {
    test('should throw error when params are invalid', async () => {
      await expect(
        // @ts-expect-error
        rulesClient.scheduleBackfill(getMockData())
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Error validating backfill schedule parameters \\"{\\"ruleId\\":\\"1\\",\\"start\\":\\"2023-11-16T08:00:00.000Z\\",\\"runActions\\":true}\\" - expected value of type [array] but got [Object]"`
      );

      await expect(
        rulesClient.scheduleBackfill([getMockData({ ruleId: 1 })])
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Error validating backfill schedule parameters \\"[{\\"ruleId\\":1,\\"start\\":\\"2023-11-16T08:00:00.000Z\\",\\"runActions\\":true}]\\" - [0.ruleId]: expected value of type [string] but got [number]"`
      );
    });

    test('should throw error when timestamps are invalid', async () => {
      await expect(
        rulesClient.scheduleBackfill([
          getMockData(),
          getMockData({
            ruleId: '2',
            start: '2023-11-17T08:00:00.000Z',
            end: '2023-11-17T08:00:00.000Z',
          }),
        ])
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Error validating backfill schedule parameters \\"[{\\"ruleId\\":\\"1\\",\\"start\\":\\"2023-11-16T08:00:00.000Z\\",\\"runActions\\":true},{\\"ruleId\\":\\"2\\",\\"start\\":\\"2023-11-17T08:00:00.000Z\\",\\"runActions\\":true,\\"end\\":\\"2023-11-17T08:00:00.000Z\\"}]\\" - [1]: Backfill end must be greater than backfill start"`
      );

      await expect(
        rulesClient.scheduleBackfill([
          getMockData(),
          getMockData({
            ruleId: '2',
            start: '2023-11-17T08:00:00.000Z',
            end: '2023-11-16T08:00:00.000Z',
          }),
        ])
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Error validating backfill schedule parameters \\"[{\\"ruleId\\":\\"1\\",\\"start\\":\\"2023-11-16T08:00:00.000Z\\",\\"runActions\\":true},{\\"ruleId\\":\\"2\\",\\"start\\":\\"2023-11-17T08:00:00.000Z\\",\\"runActions\\":true,\\"end\\":\\"2023-11-16T08:00:00.000Z\\"}]\\" - [1]: Backfill end must be greater than backfill start"`
      );
    });

    test('should throw error if user is not authorized to access rules', async () => {
      authorization.getFindAuthorizationFilter.mockRejectedValueOnce(new Error('not authorized'));
      await expect(
        rulesClient.scheduleBackfill([getMockData()])
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"not authorized"`);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: { code: 'Error', message: 'not authorized' },
        event: {
          action: 'rule_schedule_backfill',
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: { saved_object: undefined },
        message: 'Failed attempt to schedule backfill for a rule',
      });
    });

    test('should throw error if no rules found for scheduling', async () => {
      await asyncForEach(
        [{}, { alertTypeId: {} }, { alertTypeId: { buckets: [] } }],
        async (aggregations) => {
          unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
            aggregations,
            saved_objects: [],
            per_page: 0,
            page: 0,
            total: 1,
          });
          await expect(
            rulesClient.scheduleBackfill([getMockData()])
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"No rules matching ids 1 found to schedule backfill"`
          );
        }
      );
    });

    test('should throw error if any scheduled rule types are disabled', async () => {
      const mockData = [
        getMockData(),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' }),
      ];
      ruleTypeRegistry.ensureRuleTypeEnabled.mockImplementationOnce(() => {
        throw new Error('Not enabled');
      });

      await expect(
        rulesClient.scheduleBackfill(mockData)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Not enabled"`);
    });

    test('should throw error if any scheduled rule types are not authorized for this user', async () => {
      const mockData = [
        getMockData(),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' }),
      ];
      authorization.ensureAuthorized.mockImplementationOnce(() => {
        throw new Error('Unauthorized');
      });

      await expect(
        rulesClient.scheduleBackfill(mockData)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unauthorized"`);

      expect(auditLogger?.log).toHaveBeenCalledWith({
        error: { code: 'Error', message: 'Unauthorized' },
        event: {
          action: 'rule_schedule_backfill',
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: { saved_object: undefined },
        message: 'Failed attempt to schedule backfill for a rule',
      });
    });

    test('should throw if error bulk scheduling backfill tasks', async () => {
      const mockData = [
        getMockData(),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' }),
      ];
      backfillClient.bulkQueue.mockImplementationOnce(() => {
        throw new Error('error bulk queuing!');
      });
      await expect(
        rulesClient.scheduleBackfill(mockData)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"error bulk queuing!"`);

      expect(authorization.getFindAuthorizationFilter).toHaveBeenCalled();
      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalled();
      expect(backfillClient.bulkQueue).toHaveBeenCalled();
    });
  });
});
