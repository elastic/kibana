/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskPriority, TaskStatus } from '@kbn/task-manager-plugin/server';
import { SavedObject } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import {
  Rule,
  RuleTypeParams,
  RecoveredActionGroup,
  RuleMonitoring,
  RuleLastRunOutcomeOrderMap,
  RuleLastRunOutcomes,
  SanitizedRule,
  SanitizedRuleAction,
} from '../../common';
import { getDefaultMonitoring } from '../lib/monitoring';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { AlertHit, RawRule } from '../types';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';

interface GeneratorParams {
  [key: string]: string | number | boolean | undefined | object[] | boolean[] | object;
}

export const RULE_NAME = 'rule-name';
export const RULE_ID = '1';
export const RULE_TYPE_ID = 'test';
export const DATE_1969 = '1969-12-31T00:00:00.000Z';
export const DATE_1970 = '1970-01-01T00:00:00.000Z';
export const DATE_1970_5_MIN = '1969-12-31T23:55:00.000Z';
export const DATE_9999 = '9999-12-31T12:34:56.789Z';
export const MOCK_DURATION = '86400000000000';

export const RULE_ACTIONS = [
  {
    actionTypeId: 'action',
    group: 'default',
    id: '1',
    params: {
      foo: true,
    },
    uuid: '111-111',
  },
  {
    actionTypeId: 'action',
    group: 'recovered',
    id: '2',
    params: {
      isResolved: true,
    },
    uuid: '222-222',
  },
];

const defaultHistory = [
  {
    success: true,
    timestamp: 0,
  },
];

export const generateRuleUpdateParams = ({
  error = null,
  warning = null,
  status = 'ok',
  outcome = 'succeeded',
  nextRun = '1970-01-01T00:00:10.000Z',
  successRatio = 1,
  history = defaultHistory,
  alertsCount,
}: {
  error?: null | { reason: string; message: string };
  warning?: null | { reason: string; message: string };
  status?: string;
  outcome?: RuleLastRunOutcomes;
  nextRun?: string | null;
  successRatio?: number;
  history?: RuleMonitoring['run']['history'];
  alertsCount?: Record<string, number>;
}) => [
  {
    id: `alert:1`,
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    doc: {
      alert: {
        monitoring: {
          run: {
            calculated_metrics: {
              success_ratio: successRatio,
            },
            history,
            last_run: {
              timestamp: '1970-01-01T00:00:00.000Z',
              metrics: {
                duration: 0,
                gap_duration_s: null,
                // TODO: uncomment after intermidiate release
                // gap_range: null,
                total_alerts_created: null,
                total_alerts_detected: null,
                total_indexing_duration_ms: null,
                total_search_duration_ms: null,
              },
            },
          },
        },
        executionStatus: {
          error,
          lastDuration: 0,
          lastExecutionDate: '1970-01-01T00:00:00.000Z',
          status,
          warning,
        },
        lastRun: {
          outcome,
          outcomeOrder: RuleLastRunOutcomeOrderMap[outcome],
          outcomeMsg:
            (error?.message && [error?.message]) ||
            (warning?.message && [warning?.message]) ||
            null,
          warning: error?.reason || warning?.reason || null,
          alertsCount: {
            active: 0,
            ignored: 0,
            new: 0,
            recovered: 0,
            ...(alertsCount || {}),
          },
        },
        nextRun,
        running: false,
      },
    },
  },
  { ignore: [404] },
];

export const GENERIC_ERROR_MESSAGE = 'GENERIC ERROR MESSAGE';

export const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: RULE_TYPE_ID,
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  category: 'test',
  producer: 'alerts',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  autoRecoverAlerts: true,
  validate: {
    params: { validate: (params) => params },
  },
  alerts: {
    context: 'test',
    mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
  },
  validLegacyConsumers: [],
};

export const mockRunNowResponse = {
  id: 1,
} as jest.ResolvedValue<unknown>;

export const mockDate = new Date('2019-02-12T21:01:22.479Z');

export const mockedRuleTypeSavedObject: Rule<RuleTypeParams> = {
  id: '1',
  consumer: 'bar',
  createdAt: mockDate,
  updatedAt: mockDate,
  throttle: null,
  muteAll: false,
  notifyWhen: 'onActiveAlert',
  enabled: true,
  alertTypeId: ruleType.id,
  apiKey: '',
  apiKeyOwner: 'elastic',
  schedule: { interval: '10s' },
  name: RULE_NAME,
  tags: ['rule-', '-tags'],
  createdBy: 'rule-creator',
  updatedBy: 'rule-updater',
  mutedInstanceIds: [],
  params: {
    bar: true,
  },
  actions: [
    {
      group: 'default',
      id: '1',
      actionTypeId: 'action',
      params: {
        foo: true,
      },
      uuid: '111-111',
    },
    {
      group: RecoveredActionGroup.id,
      id: '2',
      actionTypeId: 'action',
      params: {
        isResolved: true,
      },
      uuid: '222-222',
    },
  ],
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
  monitoring: getDefaultMonitoring('2020-08-20T19:23:38Z'),
  revision: 0,
};

export const mockedRawRuleSO: SavedObject<RawRule> = {
  id: '1',
  type: RULE_SAVED_OBJECT_TYPE,
  references: [],
  attributes: {
    legacyId: '1',
    consumer: 'bar',
    createdAt: mockDate.toString(),
    updatedAt: mockDate.toString(),
    throttle: null,
    muteAll: false,
    notifyWhen: 'onActiveAlert',
    enabled: true,
    alertTypeId: ruleType.id,
    apiKey: 'MTIzOmFiYw==',
    apiKeyOwner: 'elastic',
    schedule: { interval: '10s' },
    name: RULE_NAME,
    tags: ['rule-', '-tags'],
    createdBy: 'rule-creator',
    updatedBy: 'rule-updater',
    mutedInstanceIds: [],
    params: {
      bar: true,
    },
    actions: [
      {
        group: 'default',
        actionTypeId: 'action',
        params: {
          foo: true,
        },
        uuid: '111-111',
        actionRef: '1',
      },
      {
        group: RecoveredActionGroup.id,
        actionTypeId: 'action',
        params: {
          isResolved: true,
        },
        uuid: '222-222',
        actionRef: '2',
      },
    ],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z').toString(),
      error: null,
      warning: null,
    },
    monitoring: getDefaultMonitoring('2020-08-20T19:23:38Z'),
    revision: 0,
  },
};

export const mockedRule: SanitizedRule<typeof mockedRawRuleSO.attributes.params> = {
  id: mockedRawRuleSO.id,
  ...mockedRawRuleSO.attributes,
  nextRun: undefined,
  createdAt: new Date(mockedRawRuleSO.attributes.createdAt),
  updatedAt: new Date(mockedRawRuleSO.attributes.updatedAt),
  executionStatus: {
    ...mockedRawRuleSO.attributes.executionStatus,
    lastExecutionDate: new Date(mockedRawRuleSO.attributes.executionStatus.lastExecutionDate),
    error: undefined,
    warning: undefined,
  },
  actions: mockedRawRuleSO.attributes.actions.map((action) => {
    return {
      ...action,
      id: action.uuid,
    } as SanitizedRuleAction;
  }),
  isSnoozedUntil: undefined,
};

export const mockTaskInstance = () => ({
  id: '',
  attempts: 0,
  status: TaskStatus.Running,
  version: '123',
  runAt: new Date(),
  schedule: { interval: '10s' },
  scheduledAt: new Date(),
  startedAt: new Date(),
  retryAt: new Date(Date.now() + 5 * 60 * 1000),
  state: {},
  taskType: 'alerting:test',
  params: {
    alertId: RULE_ID,
    spaceId: 'default',
    consumer: 'bar',
  },
  ownerId: null,
});

export const generateAlertOpts = ({
  action,
  group,
  state,
  id,
  maintenanceWindowIds,
}: GeneratorParams = {}) => {
  id = id ?? '1';
  let message: string = '';
  switch (action) {
    case EVENT_LOG_ACTIONS.newInstance:
      message = `test:1: 'rule-name' created new alert: '${id}'`;
      break;
    case EVENT_LOG_ACTIONS.activeInstance:
      message = `test:1: 'rule-name' active alert: '${id}' in actionGroup: 'default'`;
      break;
    case EVENT_LOG_ACTIONS.recoveredInstance:
      message = `test:1: 'rule-name' alert '${id}' has recovered`;
      break;
  }
  return {
    action,
    id,
    uuid: expect.any(String),
    message,
    state,
    ...(group ? { group } : {}),
    flapping: false,
    ...(maintenanceWindowIds ? { maintenanceWindowIds } : {}),
  };
};

export const generateActionOpts = ({ id, alertGroup, alertId, uuid }: GeneratorParams = {}) => ({
  id: id ?? '1',
  typeId: 'action',
  uuid: uuid ?? '111-111',
  alertId: alertId ?? '1',
  alertGroup: alertGroup ?? 'default',
});

export const generateRunnerResult = ({
  successRatio = 1,
  history = Array(false),
  state = false,
  interval = '10s',
  alertInstances = {},
  alertRecoveredInstances = {},
  summaryActions = {},
  taskRunError,
}: GeneratorParams = {}) => {
  return {
    monitoring: {
      run: {
        calculated_metrics: {
          success_ratio: successRatio,
        },
        // @ts-ignore
        history: history.map((success) => ({ success, timestamp: 0 })),
        last_run: {
          metrics: {
            duration: 0,
            gap_duration_s: null,
            // TODO: uncomment after intermidiate release
            // gap_range: null,
            total_alerts_created: null,
            total_alerts_detected: null,
            total_indexing_duration_ms: null,
            total_search_duration_ms: null,
          },
          timestamp: '1970-01-01T00:00:00.000Z',
        },
      },
    },
    schedule: {
      interval,
    },
    state: {
      ...(state && { alertInstances }),
      ...(state && { alertRecoveredInstances }),
      ...(state && { alertTypeState: {} }),
      ...(state && { previousStartedAt: new Date('1970-01-01T00:00:00.000Z').toISOString() }),
      ...(state && { summaryActions }),
    },
    taskRunError,
  };
};

export const generateEnqueueFunctionInput = ({
  id = '1',
  uuid = '111-111',
  isBulk = false,
  isResolved,
  foo,
  consumer,
  actionTypeId,
  priority,
  apiKeyId,
}: {
  uuid?: string;
  id: string;
  isBulk?: boolean;
  isResolved?: boolean;
  foo?: boolean;
  consumer?: string;
  actionTypeId?: string;
  priority?: TaskPriority;
  apiKeyId?: string;
}) => {
  const input = {
    actionTypeId: actionTypeId || 'action',
    apiKey: 'MTIzOmFiYw==',
    executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
    id,
    uuid,
    params: {
      ...(isResolved !== undefined ? { isResolved } : {}),
      ...(foo !== undefined ? { foo } : {}),
    },
    consumer: consumer ?? 'bar',
    relatedSavedObjects: [
      {
        id: '1',
        namespace: undefined,
        type: RULE_SAVED_OBJECT_TYPE,
        typeId: RULE_TYPE_ID,
      },
    ],
    source: {
      source: {
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
      },
      type: 'SAVED_OBJECT',
    },
    spaceId: 'default',
    ...(priority && { priority }),
    ...(apiKeyId && { apiKeyId }),
  };
  return isBulk ? [input] : input;
};

export const generateAlertInstance = (
  { id, duration, start, flappingHistory, actions, maintenanceWindowIds }: GeneratorParams = {
    id: 1,
    flappingHistory: [false],
  }
) => ({
  [String(id)]: {
    meta: {
      uuid: expect.any(String),
      lastScheduledActions: {
        date: new Date(DATE_1970).toISOString(),
        group: 'default',
        ...(actions && { actions }),
      },
      flappingHistory,
      flapping: false,
      maintenanceWindowIds: maintenanceWindowIds || [],
      pendingRecoveredCount: 0,
      activeCount: 1,
    },
    state: {
      bar: false,
      duration,
      start,
    },
  },
});

export const mockAAD = {
  '@timestamp': '2022-12-07T15:38:43.472Z',
  event: {
    kind: 'signal',
    action: 'active',
  },
  kibana: {
    version: '8.7.0',
    space_ids: ['default'],
    alert: {
      instance: { id: '*' },
      uuid: '2d3e8fe5-3e8b-4361-916e-9eaab0bf2084',
      status: 'active',
      workflow_status: 'open',
      reason: 'system.cpu is 90% in the last 1 min for all hosts. Alert when > 50%.',
      time_range: { gte: '2022-01-01T12:00:00.000Z' },
      start: '2022-12-07T15:23:13.488Z',
      duration: { us: 100000 },
      flapping: false,
      rule: {
        category: 'Metric threshold',
        consumer: 'alerts',
        execution: { uuid: 'c35db7cc-5bf7-46ea-b43f-b251613a5b72' },
        name: 'test-rule',
        producer: 'infrastructure',
        revision: 0,
        rule_type_id: 'metrics.alert.threshold',
        uuid: '0de91960-7643-11ed-b719-bb9db8582cb6',
        tags: [],
      },
    },
  },
} as unknown as AlertHit;
