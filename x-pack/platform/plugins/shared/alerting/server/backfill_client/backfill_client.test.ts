/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adHocRunStatus } from '../../common/constants';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { SavedObject, SavedObjectsBulkResponse } from '@kbn/core/server';
import { savedObjectsClientMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { ScheduleBackfillParam } from '../application/backfill/methods/schedule/types';
import { RuleDomain } from '../application/rule/types';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { BackfillClient } from './backfill_client';
import { AdHocRunSO } from '../data/ad_hoc_run/types';
import { transformAdHocRunToBackfillResult } from '../application/backfill/transforms';
import { RecoveredActionGroup } from '@kbn/alerting-types';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { TaskRunnerFactory } from '../task_runner';
import { TaskPriority } from '@kbn/task-manager-plugin/server';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { eventLogClientMock, eventLoggerMock } from '@kbn/event-log-plugin/server/mocks';
import { updateGaps } from '../lib/rule_gaps/update/update_gaps';

jest.mock('../lib/rule_gaps/update/update_gaps', () => ({
  updateGaps: jest.fn(),
}));
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { RawRule, RawRuleAction } from '../types';

const logger = loggingSystemMock.create().get();
const taskManagerSetup = taskManagerMock.createSetup();
const taskManagerStart = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const auditLogger = auditLoggerMock.create();
const eventLogClient = eventLogClientMock.create();
const eventLogger = eventLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const actionsClient = actionsClientMock.create();

function getMockData(overwrites: Record<string, unknown> = {}): ScheduleBackfillParam {
  return {
    ruleId: '1',
    start: '2023-11-16T08:00:00.000Z',
    runActions: true,
    ...overwrites,
  };
}

const mockRuleType: jest.Mocked<UntypedNormalizedRuleType> = {
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
  executor: jest.fn(),
  category: 'test',
  producer: 'alerts',
  validate: {
    params: { validate: (params) => params },
  },
  validLegacyConsumers: [],
  autoRecoverAlerts: false,
};

const MOCK_API_KEY = Buffer.from('123:abc').toString('base64');
function getMockRule(overwrites: Record<string, unknown> = {}): RuleDomain {
  return {
    id: '1',
    actions: [],
    alertTypeId: 'myType',
    apiKey: MOCK_API_KEY,
    apiKeyCreatedByUser: false,
    apiKeyOwner: 'user',
    consumer: 'myApp',
    createdAt: new Date('2019-02-12T21:01:22.479Z'),
    createdBy: 'user',
    enabled: true,
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
      status: 'pending',
    },
    muteAll: false,
    mutedInstanceIds: [],
    name: 'my rule name',
    notifyWhen: null,
    // @ts-expect-error
    params: {},
    revision: 0,
    schedule: { interval: '12h' },
    scheduledTaskId: 'task-123',
    snoozeSchedule: [],
    tags: ['foo'],
    throttle: null,
    updatedAt: new Date('2019-02-12T21:01:22.479Z'),
    updatedBy: 'user',
    ...overwrites,
  };
}

function getMockAdHocRunAttributes({
  ruleId,
  overwrites,
  omitApiKey = false,
  actions = [],
}: {
  ruleId?: string;
  overwrites?: Record<string, unknown>;
  omitApiKey?: boolean;
  actions?: RawRule['actions'];
} = {}): AdHocRunSO {
  // @ts-expect-error
  return {
    ...(omitApiKey ? {} : { apiKeyId: '123', apiKeyToUse: 'MTIzOmFiYw==' }),
    createdAt: '2024-01-30T00:00:00.000Z',
    duration: '12h',
    enabled: true,
    rule: {
      ...(ruleId ? { id: ruleId } : {}),
      name: 'my rule name',
      tags: ['foo'],
      alertTypeId: 'myType',
      actions,
      params: {},
      apiKeyOwner: 'user',
      apiKeyCreatedByUser: false,
      consumer: 'myApp',
      enabled: true,
      schedule: {
        interval: '12h',
      },
      createdBy: 'user',
      updatedBy: 'user',
      createdAt: '2019-02-12T21:01:22.479Z',
      updatedAt: '2019-02-12T21:01:22.479Z',
      revision: 0,
    },
    spaceId: 'default',
    start: '2023-10-19T15:07:40.011Z',
    status: adHocRunStatus.PENDING,
    schedule: [
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T03:07:40.011Z',
      },
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T15:07:40.011Z',
      },
    ],
    ...overwrites,
  };
}

function getBulkCreateParam(
  id: string,
  ruleId: string,
  attributes: AdHocRunSO
): SavedObject<AdHocRunSO> {
  return {
    type: 'ad_hoc_rule_run_params',
    id,
    namespaces: ['default'],
    attributes,
    references: [
      {
        id: ruleId,
        name: 'rule',
        type: 'alert',
      },
    ],
    managed: false,
    coreMigrationVersion: '8.8.0',
    updated_at: '2024-02-07T16:05:39.296Z',
    created_at: '2024-02-07T16:05:39.296Z',
    version: 'WzcsMV0=',
  };
}

const mockCreatePointInTimeFinderAsInternalUser = (
  response: {
    saved_objects: Array<{
      id: string;
      type: string;
      attributes: AdHocRunSO;
      references?: Array<{ id: string; name: string; type: string }>;
      version?: string;
    }>;
  } = {
    saved_objects: [
      {
        id: 'abc',
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        attributes: getMockAdHocRunAttributes(),
        references: [{ id: '1', name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        version: '1',
      },
    ],
  }
) => {
  unsecuredSavedObjectsClient.createPointInTimeFinder = jest.fn().mockResolvedValue({
    close: jest.fn(),
    find: function* asyncGenerator() {
      yield response;
    },
  });
};

describe('BackfillClient', () => {
  let backfillClient: BackfillClient;
  let isSystemAction: jest.Mock;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-30T00:00:00.000Z'));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    isSystemAction = jest.fn().mockReturnValue(false);
    actionsClient.isSystemAction.mockImplementation(isSystemAction);

    ruleTypeRegistry.get.mockReturnValue(mockRuleType);
    backfillClient = new BackfillClient({
      logger,
      taskManagerSetup,
      taskManagerStartPromise: Promise.resolve(taskManagerStart),
      taskRunnerFactory: new TaskRunnerFactory(),
    });
  });

  afterAll(() => jest.useRealTimers());

  describe('constructor', () => {
    test('should register backfill task type', async () => {
      expect(taskManagerSetup.registerTaskDefinitions).toHaveBeenCalledWith({
        'ad_hoc_run-backfill': {
          title: 'Alerting Backfill Rule Run',
          priority: TaskPriority.Low,
          createTaskRunner: expect.any(Function),
        },
      });
    });
  });

  describe('bulkQueue()', () => {
    test('should successfully create backfill saved objects and queue backfill tasks', async () => {
      const mockData = [
        getMockData(),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' }),
      ];
      const rule1 = getMockRule();
      const rule2 = getMockRule({ id: '2' });
      const mockRules = [rule1, rule2];
      ruleTypeRegistry.get.mockReturnValue({ ...mockRuleType, ruleTaskTimeout: '1d' });

      const mockAttributes1 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const mockAttributes2 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-17T08:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
            {
              runAt: '2023-11-17T08:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes1),
          getBulkCreateParam('def', '2', mockAttributes2),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        actionsClient,
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });

      const bulkCreateParams = [
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes1,
          references: [{ id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes2,
          references: [{ id: rule2.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
      ];

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(bulkCreateParams);
      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'def', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=def]',
      });
      expect(taskManagerStart.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'abc',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'abc', spaceId: 'default' },
        },
        {
          id: 'def',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'def', spaceId: 'default' },
        },
      ]);
      expect(result).toEqual(
        bulkCreateResult.saved_objects.map((so, index) =>
          transformAdHocRunToBackfillResult({
            adHocRunSO: so,
            isSystemAction,
            originalSO: bulkCreateParams?.[index],
          })
        )
      );
    });

    test('should successfully schedule backfill for rule with actions when runActions=true', async () => {
      actionsClient.getBulk.mockResolvedValue([
        {
          id: '987',
          actionTypeId: 'test',
          config: {
            from: 'me@me.com',
            hasAuth: false,
            host: 'hello',
            port: 22,
            secure: null,
            service: null,
          },
          isMissingSecrets: false,
          name: 'email connector',
          isPreconfigured: false,
          isSystemAction: false,
          isDeprecated: false,
        },
      ]);
      const mockData = [
        getMockData(),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' }),
      ];
      const rule1 = getMockRule({
        actions: [
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            uuid: '123abc',
            frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
          },
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            uuid: 'xyz987',
            frequency: { notifyWhen: 'onActiveAlert', summary: true, throttle: null },
          },
        ],
      });
      const rule2 = getMockRule({
        id: '2',
        actions: [
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
          },
        ],
      });
      const mockRules = [rule1, rule2];
      ruleTypeRegistry.get.mockReturnValue({ ...mockRuleType, ruleTaskTimeout: '1d' });

      const mockAttributes1 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
        actions: [],
      });
      const mockAttributes2 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-17T08:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
            {
              runAt: '2023-11-17T08:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes1),
          getBulkCreateParam('def', '2', mockAttributes2),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        actionsClient,
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });

      const bulkCreateParams = [
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: {
            ...mockAttributes1,
            rule: {
              ...mockAttributes1.rule,
              actions: [
                {
                  actionRef: 'action_0',
                  group: 'default',
                  actionTypeId: 'test',
                  params: {},
                  uuid: '123abc',
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                } as RawRuleAction,
                {
                  actionRef: 'action_1',
                  group: 'default',
                  actionTypeId: 'test',
                  params: {},
                  uuid: 'xyz987',
                  frequency: { notifyWhen: 'onActiveAlert', summary: true, throttle: null },
                } as RawRuleAction,
              ],
            },
          },
          references: [
            { id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE },
            { id: '987', name: 'action_0', type: 'action' },
            { id: '987', name: 'action_1', type: 'action' },
          ],
        },
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: {
            ...mockAttributes2,
            rule: {
              ...mockAttributes1.rule,
              actions: [
                {
                  actionRef: 'action_0',
                  group: 'default',
                  actionTypeId: 'test',
                  params: {},
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                } as RawRuleAction,
              ],
            },
          },
          references: [
            { id: rule2.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE },
            { id: '987', name: 'action_0', type: 'action' },
          ],
        },
      ];

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(bulkCreateParams);
      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'def', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=def]',
      });
      expect(taskManagerStart.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'abc',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'abc', spaceId: 'default' },
        },
        {
          id: 'def',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'def', spaceId: 'default' },
        },
      ]);
      expect(result).toEqual(
        bulkCreateResult.saved_objects.map((so, index) =>
          transformAdHocRunToBackfillResult({
            adHocRunSO: so,
            isSystemAction,
            originalSO: bulkCreateParams?.[index],
          })
        )
      );
    });

    test('should successfully schedule backfill for rule with rule-level notifyWhen field', async () => {
      actionsClient.getBulk.mockResolvedValue([
        {
          id: '987',
          actionTypeId: 'test',
          config: {
            from: 'me@me.com',
            hasAuth: false,
            host: 'hello',
            port: 22,
            secure: null,
            service: null,
          },
          isMissingSecrets: false,
          name: 'email connector',
          isPreconfigured: false,
          isSystemAction: false,
          isDeprecated: false,
        },
      ]);
      const mockData = [
        getMockData(),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' }),
      ];
      const rule1 = getMockRule({
        notifyWhen: 'onActiveAlert',
        actions: [
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            uuid: '123abc',
          },
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            uuid: 'xyz987',
          },
        ],
      });
      const rule2 = getMockRule({
        id: '2',
        notifyWhen: 'onActiveAlert',
        actions: [
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
          },
        ],
      });
      const mockRules = [rule1, rule2];
      ruleTypeRegistry.get.mockReturnValue({ ...mockRuleType, ruleTaskTimeout: '1d' });

      const mockAttributes1 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
        actions: [],
      });
      const mockAttributes2 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-17T08:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
            {
              runAt: '2023-11-17T08:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes1),
          getBulkCreateParam('def', '2', mockAttributes2),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        actionsClient,
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });

      const bulkCreateParams = [
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: {
            ...mockAttributes1,
            rule: {
              ...mockAttributes1.rule,
              actions: [
                {
                  actionRef: 'action_0',
                  group: 'default',
                  actionTypeId: 'test',
                  params: {},
                  uuid: '123abc',
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                } as RawRuleAction,
                {
                  actionRef: 'action_1',
                  group: 'default',
                  actionTypeId: 'test',
                  params: {},
                  uuid: 'xyz987',
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                } as RawRuleAction,
              ],
            },
          },
          references: [
            { id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE },
            { id: '987', name: 'action_0', type: 'action' },
            { id: '987', name: 'action_1', type: 'action' },
          ],
        },
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: {
            ...mockAttributes2,
            rule: {
              ...mockAttributes1.rule,
              actions: [
                {
                  actionRef: 'action_0',
                  group: 'default',
                  actionTypeId: 'test',
                  params: {},
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                } as RawRuleAction,
              ],
            },
          },
          references: [
            { id: rule2.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE },
            { id: '987', name: 'action_0', type: 'action' },
          ],
        },
      ];

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(bulkCreateParams);
      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'def', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=def]',
      });
      expect(taskManagerStart.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'abc',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'abc', spaceId: 'default' },
        },
        {
          id: 'def',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'def', spaceId: 'default' },
        },
      ]);
      expect(result).toEqual(
        bulkCreateResult.saved_objects.map((so, index) =>
          transformAdHocRunToBackfillResult({
            adHocRunSO: so,
            isSystemAction,
            originalSO: bulkCreateParams?.[index],
          })
        )
      );
    });

    test('should ignore actions for rule with actions when runActions=false', async () => {
      const mockData = [
        getMockData({ runActions: false }),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z', runActions: false }),
      ];
      const rule1 = getMockRule({
        actions: [
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            uuid: '123abc',
            frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
          },
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            uuid: 'xyz987',
            frequency: { notifyWhen: 'onActiveAlert', summary: true, throttle: null },
          },
        ],
      });
      const rule2 = getMockRule({
        id: '2',
        actions: [
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
          },
        ],
      });
      const mockRules = [rule1, rule2];
      ruleTypeRegistry.get.mockReturnValue({ ...mockRuleType, ruleTaskTimeout: '1d' });

      const mockAttributes1 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
        actions: [],
      });
      const mockAttributes2 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-17T08:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
            {
              runAt: '2023-11-17T08:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes1),
          getBulkCreateParam('def', '2', mockAttributes2),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        actionsClient,
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });

      const bulkCreateParams = [
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes1,
          references: [{ id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes2,
          references: [{ id: rule2.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
      ];

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(bulkCreateParams);
      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'def', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=def]',
      });
      expect(taskManagerStart.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'abc',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'abc', spaceId: 'default' },
        },
        {
          id: 'def',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'def', spaceId: 'default' },
        },
      ]);
      expect(result).toEqual(
        bulkCreateResult.saved_objects.map((so, index) =>
          transformAdHocRunToBackfillResult({
            adHocRunSO: so,
            isSystemAction,
            originalSO: bulkCreateParams?.[index],
          })
        )
      );
    });

    test('should successfully schedule backfill for rule with system actions when runActions=true', async () => {
      actionsClient.isSystemAction.mockReturnValueOnce(false);
      actionsClient.isSystemAction.mockReturnValueOnce(true);
      actionsClient.getBulk.mockResolvedValue([
        {
          id: '987',
          actionTypeId: 'test',
          config: {
            from: 'me@me.com',
            hasAuth: false,
            host: 'hello',
            port: 22,
            secure: null,
            service: null,
          },
          isMissingSecrets: false,
          name: 'email connector',
          isPreconfigured: false,
          isSystemAction: false,
          isDeprecated: false,
        },
        {
          id: 'system_456',
          actionTypeId: 'test.system',
          name: 'System action: .cases',
          config: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ]);
      const mockData = [getMockData()];
      const rule = getMockRule({
        actions: [
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            uuid: '123abc',
            frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
          },
        ],
        systemActions: [
          {
            id: 'system_456',
            actionTypeId: 'test.system',
            params: {},
            uuid: 'aaaaaa',
          },
        ],
      });
      const mockRules = [rule];
      ruleTypeRegistry.get.mockReturnValue({ ...mockRuleType, ruleTaskTimeout: '1d' });

      const mockAttributes = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
        actions: [],
      });

      const bulkCreateResult = {
        saved_objects: [getBulkCreateParam('abc', '1', mockAttributes)],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        actionsClient,
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });

      const bulkCreateParams = [
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: {
            ...mockAttributes,
            rule: {
              ...mockAttributes.rule,
              actions: [
                {
                  actionRef: 'action_0',
                  group: 'default',
                  actionTypeId: 'test',
                  params: {},
                  uuid: '123abc',
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                } as RawRuleAction,
                {
                  actionRef: 'system_action:system_456',
                  actionTypeId: 'test.system',
                  params: {},
                  uuid: 'aaaaaa',
                } as RawRuleAction,
              ],
            },
          },
          references: [
            { id: rule.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE },
            { id: '987', name: 'action_0', type: 'action' },
          ],
        },
      ];

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(bulkCreateParams);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(taskManagerStart.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'abc',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'abc', spaceId: 'default' },
        },
      ]);
      expect(result).toEqual(
        bulkCreateResult.saved_objects.map((so, index) =>
          transformAdHocRunToBackfillResult({
            adHocRunSO: so,
            isSystemAction,
            originalSO: bulkCreateParams?.[index],
          })
        )
      );
    });

    test('should schedule backfill for rule with unsupported actions and return warning', async () => {
      actionsClient.getBulk.mockResolvedValue([
        {
          id: '987',
          actionTypeId: 'test',
          config: {
            from: 'me@me.com',
            hasAuth: false,
            host: 'hello',
            port: 22,
            secure: null,
            service: null,
          },
          isMissingSecrets: false,
          name: 'email connector',
          isPreconfigured: false,
          isSystemAction: false,
          isDeprecated: false,
        },
      ]);
      const mockData = [
        getMockData(),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' }),
      ];
      const rule1 = getMockRule({
        actions: [
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            uuid: '123abc',
            frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
          },
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            uuid: 'xyz987',
            frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1h' },
          },
        ],
      });
      const rule2 = getMockRule({
        id: '2',
        actions: [
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
          },
        ],
      });
      const mockRules = [rule1, rule2];
      ruleTypeRegistry.get.mockReturnValue({ ...mockRuleType, ruleTaskTimeout: '1d' });

      const mockAttributes1 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
        actions: [],
      });
      const mockAttributes2 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-17T08:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
            {
              runAt: '2023-11-17T08:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes1),
          getBulkCreateParam('def', '2', mockAttributes2),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        actionsClient,
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });

      const bulkCreateParams = [
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: {
            ...mockAttributes1,
            rule: {
              ...mockAttributes1.rule,
              actions: [
                {
                  actionRef: 'action_0',
                  group: 'default',
                  actionTypeId: 'test',
                  params: {},
                  uuid: '123abc',
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                } as RawRuleAction,
              ],
            },
          },
          references: [
            { id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE },
            { id: '987', name: 'action_0', type: 'action' },
          ],
        },
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: {
            ...mockAttributes2,
            rule: {
              ...mockAttributes1.rule,
              actions: [
                {
                  actionRef: 'action_0',
                  group: 'default',
                  actionTypeId: 'test',
                  params: {},
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                } as RawRuleAction,
              ],
            },
          },
          references: [
            { id: rule2.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE },
            { id: '987', name: 'action_0', type: 'action' },
          ],
        },
      ];

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(bulkCreateParams);
      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'def', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=def]',
      });
      expect(taskManagerStart.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'abc',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'abc', spaceId: 'default' },
        },
        {
          id: 'def',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'def', spaceId: 'default' },
        },
      ]);
      expect(result).toEqual([
        {
          ...transformAdHocRunToBackfillResult({
            adHocRunSO: bulkCreateResult.saved_objects[0],
            isSystemAction,
            originalSO: bulkCreateParams?.[0],
          }),
          warnings: [
            'Rule has actions that are not supported for backfill. Those actions will be skipped.',
          ],
        },
        transformAdHocRunToBackfillResult({
          adHocRunSO: bulkCreateResult.saved_objects[1],
          isSystemAction,
          originalSO: bulkCreateParams?.[1],
        }),
      ]);
    });

    test('should schedule backfill for rule with unsupported rule-level notifyWhen field and return warning', async () => {
      actionsClient.getBulk.mockResolvedValue([
        {
          id: '987',
          actionTypeId: 'test',
          config: {
            from: 'me@me.com',
            hasAuth: false,
            host: 'hello',
            port: 22,
            secure: null,
            service: null,
          },
          isMissingSecrets: false,
          name: 'email connector',
          isPreconfigured: false,
          isSystemAction: false,
          isDeprecated: false,
        },
      ]);
      const mockData = [
        getMockData(),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' }),
      ];
      const rule1 = getMockRule({
        notifyWhen: 'onThrottleInterval',
        throttle: '12h',
        actions: [
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            uuid: '123abc',
          },
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
            uuid: 'xyz987',
          },
        ],
      });
      const rule2 = getMockRule({
        id: '2',
        notifyWhen: 'onThrottleInterval',
        throttle: '12h',
        actions: [
          {
            group: 'default',
            id: '987',
            actionTypeId: 'test',
            params: {},
          },
        ],
      });
      const mockRules = [rule1, rule2];
      ruleTypeRegistry.get.mockReturnValue({ ...mockRuleType, ruleTaskTimeout: '1d' });

      const mockAttributes1 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
        actions: [],
      });
      const mockAttributes2 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-17T08:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
            {
              runAt: '2023-11-17T08:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes1),
          getBulkCreateParam('def', '2', mockAttributes2),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        actionsClient,
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });

      const bulkCreateParams = [
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: {
            ...mockAttributes1,
            rule: {
              ...mockAttributes1.rule,
              actions: [],
            },
          },
          references: [{ id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: {
            ...mockAttributes2,
            rule: {
              ...mockAttributes1.rule,
              actions: [],
            },
          },
          references: [{ id: rule2.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
      ];

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(bulkCreateParams);
      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'def', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=def]',
      });
      expect(taskManagerStart.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'abc',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'abc', spaceId: 'default' },
        },
        {
          id: 'def',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          timeoutOverride: '1d',
          params: { adHocRunParamsId: 'def', spaceId: 'default' },
        },
      ]);
      expect(result).toEqual([
        {
          ...transformAdHocRunToBackfillResult({
            adHocRunSO: bulkCreateResult.saved_objects[0],
            isSystemAction,
            originalSO: bulkCreateParams?.[0],
          }),
          warnings: [
            'Rule has actions that are not supported for backfill. Those actions will be skipped.',
          ],
        },
        {
          ...transformAdHocRunToBackfillResult({
            adHocRunSO: bulkCreateResult.saved_objects[1],
            isSystemAction,
            originalSO: bulkCreateParams?.[1],
          }),
          warnings: [
            'Rule has actions that are not supported for backfill. Those actions will be skipped.',
          ],
        },
      ]);
    });

    test('should successfully create multiple backfill saved objects for a single rule', async () => {
      const mockData = [getMockData(), getMockData({ end: '2023-11-17T08:00:00.000Z' })];
      const rule1 = getMockRule();
      const mockRules = [rule1];

      const mockAttributes1 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const mockAttributes2 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-17T08:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
            {
              runAt: '2023-11-17T08:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes1),
          getBulkCreateParam('def', '1', mockAttributes2),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        actionsClient,
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });

      const bulkCreateParams = [
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes1,
          references: [{ id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes2,
          references: [{ id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
      ];

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(bulkCreateParams);
      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'def', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=def]',
      });
      expect(taskManagerStart.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'abc',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          params: { adHocRunParamsId: 'abc', spaceId: 'default' },
        },
        {
          id: 'def',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          params: { adHocRunParamsId: 'def', spaceId: 'default' },
        },
      ]);
      expect(result).toEqual(
        bulkCreateResult.saved_objects.map((so, index) =>
          transformAdHocRunToBackfillResult({
            adHocRunSO: so,
            isSystemAction,
            originalSO: bulkCreateParams?.[index],
          })
        )
      );
    });

    test('should log warning if no rule found for backfill job', async () => {
      const mockData = [
        getMockData(),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' }),
      ];
      const rule1 = getMockRule();
      const mockRules = [rule1];

      const mockAttributes1 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });

      const bulkCreateResult = {
        saved_objects: [getBulkCreateParam('abc', '1', mockAttributes1)],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        actionsClient,
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });

      const bulkCreateParams = [
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes1,
          references: [{ id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
      ];
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(bulkCreateParams);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        `Error for ruleId 2 - not scheduling backfill for {\"ruleId\":\"2\",\"start\":\"2023-11-16T08:00:00.000Z\",\"runActions\":true,\"end\":\"2023-11-17T08:00:00.000Z\"}`
      );
      expect(taskManagerStart.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'abc',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          params: { adHocRunParamsId: 'abc', spaceId: 'default' },
        },
      ]);
      expect(result).toEqual([
        ...bulkCreateResult.saved_objects.map((so, index) =>
          transformAdHocRunToBackfillResult({
            adHocRunSO: so,
            isSystemAction,
            originalSO: bulkCreateParams?.[index],
          })
        ),
        {
          error: {
            message: 'Saved object [alert/2] not found',
            rule: { id: '2' },
          },
        },
      ]);
    });

    test('should return backfill result or error message for each backfill param', async () => {
      ruleTypeRegistry.get.mockReturnValueOnce({
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
        autoRecoverAlerts: true,
      });
      const mockData = [
        getMockData(), // this should return error due to unsupported rule type
        getMockData(), // this should succeed
        getMockData({ ruleId: '2', end: '2023-11-16T10:00:00.000Z' }), // this should return rule not found error
        getMockData({ ruleId: '3', end: '2023-11-16T12:00:00.000Z' }), // this should succeed
        getMockData({ end: '2023-11-16T09:00:00.000Z' }), // this should succeed
        getMockData({ ruleId: '4' }), // this should return error from saved objects client bulk create
        getMockData({ ruleId: '5' }), // this should succeed
        getMockData({ ruleId: '6' }), // this should return error due to disabled rule
        getMockData({ ruleId: '7' }), // this should return error due to null api key
      ];
      const rule1 = getMockRule({ id: '1' });
      const rule3 = getMockRule({ id: '3' });
      const rule4 = getMockRule({ id: '4' });
      const rule5 = getMockRule({ id: '5' });
      const rule6 = getMockRule({ id: '6', enabled: false });
      const rule7 = getMockRule({ id: '7', apiKey: null });
      const mockRules = [rule1, rule3, rule4, rule5, rule6, rule7];

      const mockAttributes = getMockAdHocRunAttributes();

      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes),
          getBulkCreateParam('def', '3', mockAttributes),
          getBulkCreateParam('ghi', '1', mockAttributes),
          {
            type: 'ad_hoc_rule_run_params',
            error: {
              error: 'my error',
              message: 'Unable to create',
            },
          },
          getBulkCreateParam('jkl', '5', mockAttributes),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(
        bulkCreateResult as SavedObjectsBulkResponse<AdHocRunSO>
      );
      const result = await backfillClient.bulkQueue({
        actionsClient,
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });
      expect(auditLogger.log).toHaveBeenCalledTimes(5);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'def', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=def]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(3, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'ghi', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=ghi]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(4, {
        error: { code: 'Error', message: 'Unable to create' },
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'failure',
          type: ['creation'],
        },
        kibana: {},
        message: 'Failed attempt to create ad hoc run for an ad hoc run',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(5, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'jkl', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=jkl]',
      });

      expect(taskManagerStart.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'abc',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          params: { adHocRunParamsId: 'abc', spaceId: 'default' },
        },
        {
          id: 'def',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          params: { adHocRunParamsId: 'def', spaceId: 'default' },
        },
        {
          id: 'ghi',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          params: { adHocRunParamsId: 'ghi', spaceId: 'default' },
        },
        {
          id: 'jkl',
          taskType: 'ad_hoc_run-backfill',
          state: {},
          params: { adHocRunParamsId: 'jkl', spaceId: 'default' },
        },
      ]);

      expect(result).toEqual([
        {
          error: {
            message: 'Rule type "myType" for rule 1 is not supported',
            rule: { id: '1', name: 'my rule name' },
          },
        },
        {
          id: 'abc',
          ...getMockAdHocRunAttributes({ ruleId: '1', omitApiKey: true }),
        },
        {
          error: {
            message: 'Saved object [alert/2] not found',
            rule: { id: '2' },
          },
        },
        {
          id: 'def',
          ...getMockAdHocRunAttributes({ ruleId: '3', omitApiKey: true }),
        },
        {
          id: 'ghi',
          ...getMockAdHocRunAttributes({ ruleId: '1', omitApiKey: true }),
        },
        {
          error: {
            message: 'Unable to create',
            rule: { id: '4', name: 'my rule name' },
          },
        },
        {
          id: 'jkl',
          ...getMockAdHocRunAttributes({ ruleId: '5', omitApiKey: true }),
        },
        {
          error: {
            message: 'Rule 6 is disabled',
            rule: { id: '6', name: 'my rule name' },
          },
        },
        {
          error: {
            message: 'Rule 7 has no API key',
            rule: { id: '7', name: 'my rule name' },
          },
        },
      ]);
    });

    test('should skip calling bulkCreate if no rules found for any backfill job', async () => {
      const mockData = [
        getMockData(), // this should succeed
        getMockData({ ruleId: '2', end: '2023-11-16T10:00:00.000Z' }), // this should return rule not found error
        getMockData({ ruleId: '3', end: '2023-11-16T12:00:00.000Z' }), // this should succeed
        getMockData({ end: '2023-11-16T09:00:00.000Z' }), // this should succeed
        getMockData({ ruleId: '4' }), // this should return error from saved objects client bulk create
        getMockData({ ruleId: '5' }), // this should succeed
      ];

      const result = await backfillClient.bulkQueue({
        actionsClient,
        auditLogger,
        params: mockData,
        rules: [],
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
      expect(taskManagerStart.bulkSchedule).not.toHaveBeenCalled();
      expect(result).toEqual([
        {
          error: {
            message: 'Saved object [alert/1] not found',
            rule: { id: '1' },
          },
        },
        {
          error: {
            message: 'Saved object [alert/2] not found',
            rule: { id: '2' },
          },
        },
        {
          error: {
            message: 'Saved object [alert/3] not found',
            rule: { id: '3' },
          },
        },
        {
          error: {
            message: 'Saved object [alert/1] not found',
            rule: { id: '1' },
          },
        },
        {
          error: {
            message: 'Saved object [alert/4] not found',
            rule: { id: '4' },
          },
        },
        {
          error: {
            message: 'Saved object [alert/5] not found',
            rule: { id: '5' },
          },
        },
      ]);
    });

    test('should skip calling bulkSchedule if no SOs were successfully created', async () => {
      ruleTypeRegistry.get.mockReturnValueOnce({
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
        autoRecoverAlerts: true,
      });
      const mockData = [
        getMockData(), // this should return error due to unsupported rule type
        getMockData({ ruleId: '2', end: '2023-11-16T10:00:00.000Z' }), // this should return rule not found error
        getMockData({ ruleId: '4' }), // this should return error from saved objects client bulk create
        getMockData({ ruleId: '6' }), // this should return error due to disabled rule
        getMockData({ ruleId: '7' }), // this should return error due to null api key
      ];
      const rule1 = getMockRule();
      const rule4 = getMockRule({ id: '4' });
      const rule6 = getMockRule({ id: '6', enabled: false });
      const rule7 = getMockRule({ id: '7', apiKey: null });
      const mockRules = [rule1, rule4, rule6, rule7];

      const bulkCreateResult = {
        saved_objects: [
          {
            type: 'ad_hoc_rule_run_params',
            error: {
              error: 'my error',
              message: 'Unable to create',
            },
          },
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(
        bulkCreateResult as SavedObjectsBulkResponse<AdHocRunSO>
      );
      const result = await backfillClient.bulkQueue({
        actionsClient,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
      });

      expect(taskManagerStart.bulkSchedule).not.toHaveBeenCalled();

      expect(result).toEqual([
        {
          error: {
            message: 'Rule type "myType" for rule 1 is not supported',
            rule: { id: '1', name: 'my rule name' },
          },
        },
        {
          error: {
            message: 'Saved object [alert/2] not found',
            rule: { id: '2' },
          },
        },
        {
          error: {
            message: 'Unable to create',
            rule: { id: '4', name: 'my rule name' },
          },
        },
        {
          error: {
            message: 'Rule 6 is disabled',
            rule: { id: '6', name: 'my rule name' },
          },
        },
        {
          error: {
            message: 'Rule 7 has no API key',
            rule: { id: '7', name: 'my rule name' },
          },
        },
      ]);
    });

    test('should call updateGaps with correct params for each backfill', async () => {
      const mockData = [getMockData(), getMockData({ ruleId: '2' })];
      const rule1 = getMockRule();
      const rule2 = getMockRule({ id: '2' });
      const mockRules = [rule1, rule2];

      const mockAttributes = getMockAdHocRunAttributes();
      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes),
          getBulkCreateParam('def', '2', mockAttributes),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      await backfillClient.bulkQueue({
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
        actionsClient,
      });

      expect(updateGaps).toHaveBeenCalledTimes(2);
      expect(updateGaps).toHaveBeenNthCalledWith(1, {
        backfillSchedule: mockAttributes.schedule,
        ruleId: '1',
        start: new Date(mockAttributes.start),
        end: new Date(),
        eventLogger,
        eventLogClient,
        savedObjectsRepository: internalSavedObjectsRepository,
        logger,
        backfillClient,
        actionsClient,
      });
      expect(updateGaps).toHaveBeenNthCalledWith(2, {
        backfillSchedule: mockAttributes.schedule,
        ruleId: '2',
        start: new Date(mockAttributes.start),
        end: new Date(),
        eventLogger,
        eventLogClient,
        savedObjectsRepository: internalSavedObjectsRepository,
        logger,
        backfillClient,
        actionsClient,
      });
    });

    test('should handle updateGaps errors gracefully', async () => {
      const mockData = [getMockData()];
      const rule1 = getMockRule();
      const mockRules = [rule1];

      const mockAttributes = getMockAdHocRunAttributes();
      const bulkCreateResult = {
        saved_objects: [getBulkCreateParam('abc', '1', mockAttributes)],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);
      (updateGaps as jest.Mock).mockRejectedValueOnce(new Error('Failed to update gaps'));

      await backfillClient.bulkQueue({
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
        actionsClient,
      });

      expect(logger.warn).toHaveBeenCalledWith('Error updating gaps for backfill jobs: abc');
    });

    test('should call updateGaps with end date from backfill param if provided', async () => {
      const endDate = '2024-02-01T00:00:00.000Z';
      const mockData = [getMockData({ end: endDate })];
      const rule1 = getMockRule();
      const mockRules = [rule1];

      const mockAttributes = getMockAdHocRunAttributes({
        overwrites: { end: endDate },
      });
      const bulkCreateResult = {
        saved_objects: [getBulkCreateParam('abc', '1', mockAttributes)],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      await backfillClient.bulkQueue({
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
        eventLogClient,
        internalSavedObjectsRepository,
        eventLogger,
        actionsClient,
      });

      expect(updateGaps).toHaveBeenCalledWith({
        backfillSchedule: mockAttributes.schedule,
        ruleId: '1',
        start: new Date(mockAttributes.start),
        end: new Date(endDate),
        eventLogger,
        eventLogClient,
        savedObjectsRepository: internalSavedObjectsRepository,
        logger,
        backfillClient,
        actionsClient,
      });
    });
  });

  describe('deleteBackfillForRules()', () => {
    test('should successfully delete backfill for single rule', async () => {
      mockCreatePointInTimeFinderAsInternalUser();
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [{ id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE, success: true }],
      });
      taskManagerStart.bulkRemove.mockResolvedValueOnce({
        statuses: [{ id: 'abc', type: 'task', success: true }],
      });
      await backfillClient.deleteBackfillForRules({
        ruleIds: ['1'],
        namespace: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(unsecuredSavedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 100,
        hasReference: [{ id: '1', type: RULE_SAVED_OBJECT_TYPE }],
        namespaces: ['default'],
      });
      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE },
      ]);
      expect(taskManagerStart.bulkRemove).toHaveBeenCalledWith(['abc']);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('should successfully delete multiple backfill for single rule', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            id: 'abc',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            attributes: getMockAdHocRunAttributes(),
          },
          {
            id: 'def',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            attributes: getMockAdHocRunAttributes(),
          },
        ],
      });
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE, success: true },
          { id: 'def', type: AD_HOC_RUN_SAVED_OBJECT_TYPE, success: true },
        ],
      });
      taskManagerStart.bulkRemove.mockResolvedValueOnce({
        statuses: [
          { id: 'abc', type: 'task', success: true },
          { id: 'def', type: 'task', success: true },
        ],
      });
      await backfillClient.deleteBackfillForRules({
        ruleIds: ['1'],
        unsecuredSavedObjectsClient,
      });

      expect(unsecuredSavedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 100,
        hasReference: [{ id: '1', type: RULE_SAVED_OBJECT_TYPE }],
      });
      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE },
        { id: 'def', type: AD_HOC_RUN_SAVED_OBJECT_TYPE },
      ]);
      expect(taskManagerStart.bulkRemove).toHaveBeenCalledWith(['abc', 'def']);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('should successfully delete backfill for multiple rules', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            id: 'abc',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            attributes: getMockAdHocRunAttributes(),
          },
          {
            id: 'def',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            attributes: getMockAdHocRunAttributes(),
          },
        ],
      });
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE, success: true },
          { id: 'def', type: AD_HOC_RUN_SAVED_OBJECT_TYPE, success: true },
        ],
      });
      taskManagerStart.bulkRemove.mockResolvedValueOnce({
        statuses: [
          { id: 'abc', type: 'task', success: true },
          { id: 'def', type: 'task', success: true },
        ],
      });
      await backfillClient.deleteBackfillForRules({
        ruleIds: ['1', '2', '3'],
        namespace: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(unsecuredSavedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 100,
        hasReference: [
          { id: '1', type: RULE_SAVED_OBJECT_TYPE },
          { id: '2', type: RULE_SAVED_OBJECT_TYPE },
          { id: '3', type: RULE_SAVED_OBJECT_TYPE },
        ],
        namespaces: ['default'],
      });
      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE },
        { id: 'def', type: AD_HOC_RUN_SAVED_OBJECT_TYPE },
      ]);
      expect(taskManagerStart.bulkRemove).toHaveBeenCalledWith(['abc', 'def']);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('should not delete backfill if none found to delete', async () => {
      mockCreatePointInTimeFinderAsInternalUser({ saved_objects: [] });
      await backfillClient.deleteBackfillForRules({
        ruleIds: ['1', '2', '3'],
        namespace: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(unsecuredSavedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 100,
        hasReference: [
          { id: '1', type: RULE_SAVED_OBJECT_TYPE },
          { id: '2', type: RULE_SAVED_OBJECT_TYPE },
          { id: '3', type: RULE_SAVED_OBJECT_TYPE },
        ],
        namespaces: ['default'],
      });
      expect(unsecuredSavedObjectsClient.bulkDelete).not.toHaveBeenCalled();
      expect(taskManagerStart.bulkRemove).not.toHaveBeenCalled();
    });

    test('should handle errors from createPointInTimeFinder', async () => {
      unsecuredSavedObjectsClient.createPointInTimeFinder = jest
        .fn()
        .mockRejectedValueOnce(new Error('error!'));

      await backfillClient.deleteBackfillForRules({
        ruleIds: ['1', '2', '3'],
        namespace: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(unsecuredSavedObjectsClient.bulkDelete).not.toHaveBeenCalled();
      expect(taskManagerStart.bulkRemove).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        `Error deleting backfill jobs for rule IDs: 1,2,3 - error!`
      );
    });

    test('should handle errors from bulkDelete', async () => {
      mockCreatePointInTimeFinderAsInternalUser();
      unsecuredSavedObjectsClient.bulkDelete.mockRejectedValueOnce(new Error('delete error!'));

      await backfillClient.deleteBackfillForRules({
        ruleIds: ['1', '2', '3'],
        namespace: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        `Error deleting backfill jobs for rule IDs: 1,2,3 - delete error!`
      );

      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE },
      ]);
      expect(taskManagerStart.bulkRemove).not.toHaveBeenCalled();
    });

    test('should handle errors from bulkRemove', async () => {
      mockCreatePointInTimeFinderAsInternalUser();
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [{ id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE, success: true }],
      });
      taskManagerStart.bulkRemove.mockRejectedValueOnce(new Error('delete task error!'));

      await backfillClient.deleteBackfillForRules({
        ruleIds: ['1', '2', '3'],
        namespace: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        `Error deleting backfill jobs for rule IDs: 1,2,3 - delete task error!`
      );

      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE },
      ]);
      expect(taskManagerStart.bulkRemove).toHaveBeenCalledWith(['abc']);
    });

    test('should handle individual errors from bulkDelete', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            id: 'abc',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            attributes: getMockAdHocRunAttributes(),
          },
          {
            id: 'def',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            attributes: getMockAdHocRunAttributes(),
          },
        ],
      });
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE, success: true },
          {
            id: 'def',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            success: false,
            error: { error: 'Error', message: 'delete failed', statusCode: 409 },
          },
        ],
      });
      taskManagerStart.bulkRemove.mockResolvedValueOnce({
        statuses: [{ id: 'abc', type: 'task', success: true }],
      });

      await backfillClient.deleteBackfillForRules({
        ruleIds: ['1', '2', '3'],
        namespace: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE },
        { id: 'def', type: AD_HOC_RUN_SAVED_OBJECT_TYPE },
      ]);
      expect(taskManagerStart.bulkRemove).toHaveBeenCalledWith(['abc']);

      expect(logger.warn).toHaveBeenCalledWith(
        `Error deleting backfill jobs with IDs: def with errors: delete failed - jobs and associated task were not deleted.`
      );
    });

    test('should handle individual errors from bulkRemove', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            id: 'abc',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            attributes: getMockAdHocRunAttributes(),
          },
          {
            id: 'def',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            attributes: getMockAdHocRunAttributes(),
          },
        ],
      });
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE, success: true },
          { id: 'def', type: AD_HOC_RUN_SAVED_OBJECT_TYPE, success: true },
        ],
      });
      taskManagerStart.bulkRemove.mockResolvedValueOnce({
        statuses: [
          { id: 'abc', type: 'task', success: true },
          {
            id: 'def',
            type: 'task',
            success: false,
            error: { error: 'Error', message: 'delete failed', statusCode: 409 },
          },
        ],
      });

      await backfillClient.deleteBackfillForRules({
        ruleIds: ['1', '2', '3'],
        namespace: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { id: 'abc', type: AD_HOC_RUN_SAVED_OBJECT_TYPE },
        { id: 'def', type: AD_HOC_RUN_SAVED_OBJECT_TYPE },
      ]);
      expect(taskManagerStart.bulkRemove).toHaveBeenCalledWith(['abc', 'def']);

      expect(logger.warn).toHaveBeenCalledWith(
        `Error deleting tasks with IDs: def with errors: delete failed`
      );
    });
  });

  describe('findOverlappingBackfills()', () => {
    test('should find overlapping backfills', async () => {
      const mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
      const mockStart = new Date('2024-01-01T00:00:00.000Z');
      const mockEnd = new Date('2024-01-02T00:00:00.000Z');

      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            id: 'abc',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            attributes: getMockAdHocRunAttributes(),
            references: [{ id: '1', name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
            version: '1',
          },
          {
            id: 'def',
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            attributes: getMockAdHocRunAttributes(),
            references: [{ id: '1', name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
            version: '1',
          },
        ],
      });

      mockSavedObjectsRepository.createPointInTimeFinder =
        unsecuredSavedObjectsClient.createPointInTimeFinder;

      const result = await backfillClient.findOverlappingBackfills({
        ruleId: '1',
        start: mockStart,
        end: mockEnd,
        savedObjectsRepository: mockSavedObjectsRepository,
        actionsClient,
      });

      expect(mockSavedObjectsRepository.createPointInTimeFinder).toHaveBeenCalledWith({
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 100,
        hasReference: [{ id: '1', type: RULE_SAVED_OBJECT_TYPE }],
        filter: `
        ad_hoc_run_params.attributes.start <= "${mockEnd.toISOString()}" and
        ad_hoc_run_params.attributes.end >= "${mockStart.toISOString()}"
      `,
      });

      expect(result).toHaveLength(2);
      expect('id' in result[0] && result[0].id).toBe('abc');
      expect('id' in result[1] && result[1].id).toBe('def');
    });

    test('should handle errors and close finder', async () => {
      const mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
      const mockStart = new Date('2024-01-01T00:00:00.000Z');
      const mockEnd = new Date('2024-01-02T00:00:00.000Z');

      mockSavedObjectsRepository.createPointInTimeFinder = jest.fn().mockResolvedValue({
        close: jest.fn(),
        find: function* asyncGenerator() {
          throw new Error('Failed to find');
        },
      });

      await expect(
        backfillClient.findOverlappingBackfills({
          ruleId: '1',
          start: mockStart,
          end: mockEnd,
          savedObjectsRepository: mockSavedObjectsRepository,
          actionsClient,
        })
      ).rejects.toThrow('Failed to find');
    });

    test('should return empty array when no overlapping backfills found', async () => {
      const mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
      const mockStart = new Date('2024-01-01T00:00:00.000Z');
      const mockEnd = new Date('2024-01-02T00:00:00.000Z');

      mockCreatePointInTimeFinderAsInternalUser({ saved_objects: [] });

      mockSavedObjectsRepository.createPointInTimeFinder =
        unsecuredSavedObjectsClient.createPointInTimeFinder;

      const result = await backfillClient.findOverlappingBackfills({
        ruleId: '1',
        start: mockStart,
        end: mockEnd,
        savedObjectsRepository: mockSavedObjectsRepository,
        actionsClient,
      });

      expect(result).toHaveLength(0);
    });
  });
});
