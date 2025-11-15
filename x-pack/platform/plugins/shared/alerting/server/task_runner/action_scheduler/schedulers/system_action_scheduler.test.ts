/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { actionsClientMock, actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { alertsClientMock } from '../../../alerts_client/alerts_client.mock';
import { alertingEventLoggerMock } from '../../../lib/alerting_event_logger/alerting_event_logger.mock';
import { RuleRunMetricsStore } from '../../../lib/rule_run_metrics_store';
import { mockAAD } from '../../fixtures';
import type { Alert } from '../../../alert';
import type { AlertInstanceContext, AlertInstanceState } from '@kbn/alerting-state-types';
import { ActionsCompletion } from '@kbn/alerting-state-types';
import { getRule, getRuleType, getDefaultSchedulerContext, generateAlert } from '../test_fixtures';
import { SystemActionScheduler } from './system_action_scheduler';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import {
  getErrorSource,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running/errors';
import type { CombinedSummarizedAlerts } from '../../../types';
import { schema } from '@kbn/config-schema';
import { TaskPriority } from '@kbn/task-manager-plugin/server';
import type { RuleSystemAction } from '@kbn/alerting-types';

const alertingEventLogger = alertingEventLoggerMock.create();
const actionsClient = actionsClientMock.create();
const alertsClient = alertsClientMock.create();
const mockActionsPlugin = actionsMock.createStart();
const logger = loggingSystemMock.create().get();

let ruleRunMetricsStore: RuleRunMetricsStore;
const rule = getRule({
  id: 'rule-id-1',
  systemActions: [
    {
      id: 'system-action-1',
      actionTypeId: '.test-system-action',
      params: { myParams: 'test' },
      uuid: 'xxx-xxx',
    },
  ],
});
const ruleType = getRuleType();
const defaultSchedulerContext = getDefaultSchedulerContext(
  logger,
  mockActionsPlugin,
  alertingEventLogger,
  actionsClient,
  alertsClient
);

const actionsParams = { myParams: 'test' };
const buildActionParams = jest.fn().mockReturnValue({ ...actionsParams, foo: 'bar' });
defaultSchedulerContext.taskRunnerContext.connectorAdapterRegistry.register({
  connectorTypeId: '.test-system-action',
  ruleActionParamsSchema: schema.object({}),
  buildActionParams,
});

// @ts-ignore
const getSchedulerContext = (params = {}) => {
  return { ...defaultSchedulerContext, rule, ...params, ruleRunMetricsStore };
};

const getResult = (
  actionId: string,
  actionUuid: string,
  summary: CombinedSummarizedAlerts,
  priority?: number,
  apiKeyId?: string
) => ({
  actionToEnqueue: {
    actionTypeId: '.test-system-action',
    apiKey: 'MTIzOmFiYw==',
    consumer: 'rule-consumer',
    executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
    id: actionId,
    uuid: actionUuid,
    relatedSavedObjects: [{ id: 'rule-id-1', namespace: 'test1', type: 'alert', typeId: 'test' }],
    source: { source: { id: 'rule-id-1', type: 'alert' }, type: 'SAVED_OBJECT' },
    spaceId: 'test1',
    ...(priority && { priority }),
    ...(apiKeyId && { apiKeyId }),
  },
  actionToLog: {
    alertSummary: {
      new: summary.new.count,
      ongoing: summary.ongoing.count,
      recovered: summary.recovered.count,
    },
    id: actionId,
    uuid: actionUuid,
    typeId: '.test-system-action',
  },
});

let clock: sinon.SinonFakeTimers;

describe('System Action Scheduler', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockActionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    mockActionsPlugin.isActionExecutable.mockReturnValue(true);
    mockActionsPlugin.getActionsClientWithRequest.mockResolvedValue(actionsClient);
    ruleRunMetricsStore = new RuleRunMetricsStore();
  });

  afterAll(() => {
    clock.restore();
  });

  test('should initialize with only system actions', () => {
    const scheduler = new SystemActionScheduler(getSchedulerContext());

    // @ts-expect-error private variable
    expect(scheduler.actions).toHaveLength(1);
    // @ts-expect-error private variable
    expect(scheduler.actions).toEqual(rule.systemActions);
  });

  test('should not initialize any system actions if rule type does not support summarized alerts', () => {
    const scheduler = new SystemActionScheduler(
      getSchedulerContext({ ruleType: { ...ruleType, alerts: undefined } })
    );

    // @ts-expect-error private variable
    expect(scheduler.actions).toHaveLength(0);
  });

  describe('getActionsToSchedule', () => {
    let newAlert1: Record<
      string,
      Alert<AlertInstanceState, AlertInstanceContext, 'default' | 'other-group'>
    >;
    let newAlert2: Record<
      string,
      Alert<AlertInstanceState, AlertInstanceContext, 'default' | 'other-group'>
    >;
    let alerts: Record<
      string,
      Alert<AlertInstanceState, AlertInstanceContext, 'default' | 'other-group'>
    >;

    beforeEach(() => {
      newAlert1 = generateAlert({ id: 1 });
      newAlert2 = generateAlert({ id: 2 });
      alerts = { ...newAlert1, ...newAlert2 };
    });

    test('should create actions to schedule for each system action', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);

      const summarizedAlerts = {
        new: { count: 2, data: [mockAAD, mockAAD] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const scheduler = new SystemActionScheduler(getSchedulerContext());
      const results = await scheduler.getActionsToSchedule({});

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(1);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(1);
      expect(ruleRunMetricsStore.getStatusByConnectorType('.test-system-action')).toEqual({
        numberOfGeneratedActions: 1,
        numberOfTriggeredActions: 1,
      });

      expect(results).toHaveLength(1);

      const finalSummary = { ...summarizedAlerts, all: { count: 2, data: [mockAAD, mockAAD] } };
      expect(results).toEqual([getResult('system-action-1', 'xxx-xxx', finalSummary)]);
    });

    test('should create actions to schedule with priority if specified for each system action', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);

      const summarizedAlerts = {
        new: { count: 2, data: [mockAAD, mockAAD] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const scheduler = new SystemActionScheduler({
        ...getSchedulerContext(),
        priority: TaskPriority.Low,
      });
      const results = await scheduler.getActionsToSchedule({});

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(1);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(1);
      expect(ruleRunMetricsStore.getStatusByConnectorType('.test-system-action')).toEqual({
        numberOfGeneratedActions: 1,
        numberOfTriggeredActions: 1,
      });

      expect(results).toHaveLength(1);

      const finalSummary = { ...summarizedAlerts, all: { count: 2, data: [mockAAD, mockAAD] } };
      expect(results).toEqual([getResult('system-action-1', 'xxx-xxx', finalSummary, 1)]);
    });

    test('should create actions to schedule with apiKeyId if specified for each system action', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);

      const summarizedAlerts = {
        new: { count: 2, data: [mockAAD, mockAAD] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const scheduler = new SystemActionScheduler({
        ...getSchedulerContext(),
        apiKeyId: '464tfbwer5q43h',
      });
      const results = await scheduler.getActionsToSchedule({});

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(1);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(1);
      expect(ruleRunMetricsStore.getStatusByConnectorType('.test-system-action')).toEqual({
        numberOfGeneratedActions: 1,
        numberOfTriggeredActions: 1,
      });

      expect(results).toHaveLength(1);

      const finalSummary = { ...summarizedAlerts, all: { count: 2, data: [mockAAD, mockAAD] } };
      expect(results).toEqual([
        getResult('system-action-1', 'xxx-xxx', finalSummary, undefined, '464tfbwer5q43h'),
      ]);
    });

    test('should remove new alerts from summary if suppressed by maintenance window', async () => {
      const newAlertWithMaintenanceWindow = generateAlert({
        id: 1,
        maintenanceWindowIds: ['mw-1'],
      });
      const alertsWithMaintenanceWindow = { ...newAlertWithMaintenanceWindow, ...newAlert2 };
      alertsClient.getProcessedAlerts.mockReturnValue(alertsWithMaintenanceWindow);
      const newAADAlerts = [
        { ...mockAAD, [ALERT_UUID]: newAlertWithMaintenanceWindow[1].getUuid() },
        mockAAD,
      ];
      const summarizedAlerts = {
        new: { count: 2, data: newAADAlerts },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const scheduler = new SystemActionScheduler(getSchedulerContext());
      const results = await scheduler.getActionsToSchedule({});

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(1);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(1);
      expect(ruleRunMetricsStore.getStatusByConnectorType('.test-system-action')).toEqual({
        numberOfGeneratedActions: 1,
        numberOfTriggeredActions: 1,
      });

      expect(results).toHaveLength(1);

      const finalSummary = {
        all: { count: 1, data: [newAADAlerts[1]] },
        new: { count: 1, data: [newAADAlerts[1]] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      expect(results).toEqual([getResult('system-action-1', 'xxx-xxx', finalSummary)]);
    });

    test('should skip creating actions to schedule for summary action when no alerts found', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: { count: 0, data: [] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const scheduler = new SystemActionScheduler(getSchedulerContext());
      const results = await scheduler.getActionsToSchedule({});

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(0);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(0);

      expect(results).toHaveLength(0);
    });

    test('should throw framework error if getSummarizedAlerts throws error', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      alertsClient.getSummarizedAlerts.mockImplementation(() => {
        throw new Error('no alerts for you');
      });

      const scheduler = new SystemActionScheduler(getSchedulerContext());

      try {
        await scheduler.getActionsToSchedule({});
      } catch (err) {
        expect(err.message).toEqual(`no alerts for you`);
        expect(getErrorSource(err)).toBe(TaskErrorSource.FRAMEWORK);
      }
    });

    test('should skip creating actions to schedule if overall max actions limit exceeded', async () => {
      const anotherSystemAction = {
        id: 'system-action-1',
        actionTypeId: '.test-system-action',
        params: { myParams: 'foo' },
        uuid: 'yyy-yyy',
      };

      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: { count: 2, data: [mockAAD, mockAAD] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const defaultContext = getSchedulerContext();
      const scheduler = new SystemActionScheduler({
        ...defaultContext,
        rule: { ...rule, systemActions: [rule.systemActions?.[0]!, anotherSystemAction] },
        taskRunnerContext: {
          ...defaultContext.taskRunnerContext,
          actionsConfigMap: {
            default: { max: 1 },
          },
        },
      });
      const results = await scheduler.getActionsToSchedule({});

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(2);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenNthCalledWith(1, {
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
      });
      expect(alertsClient.getSummarizedAlerts).toHaveBeenNthCalledWith(2, {
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(2);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(1);
      expect(ruleRunMetricsStore.getStatusByConnectorType('.test-system-action')).toEqual({
        numberOfGeneratedActions: 2,
        numberOfTriggeredActions: 1,
        triggeredActionsStatus: ActionsCompletion.PARTIAL,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        `Rule "rule-id-1" skipped scheduling action "system-action-1" because the maximum number of allowed actions has been reached.`
      );

      expect(results).toHaveLength(1);

      const finalSummary = { ...summarizedAlerts, all: { count: 2, data: [mockAAD, mockAAD] } };
      expect(results).toEqual([getResult('system-action-1', 'xxx-xxx', finalSummary)]);
    });

    test('should skip creating actions to schedule if connector type max actions limit exceeded', async () => {
      const anotherSystemAction = {
        id: 'system-action-1',
        actionTypeId: '.test-system-action',
        params: { myParams: 'foo' },
        uuid: 'yyy-yyy',
      };

      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: { count: 2, data: [mockAAD, mockAAD] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const defaultContext = getSchedulerContext();
      const scheduler = new SystemActionScheduler({
        ...defaultContext,
        rule: { ...rule, systemActions: [rule.systemActions?.[0]!, anotherSystemAction] },
        taskRunnerContext: {
          ...defaultContext.taskRunnerContext,
          actionsConfigMap: {
            default: { max: 1000 },
            '.test-system-action': { max: 1 },
          },
        },
      });
      const results = await scheduler.getActionsToSchedule({});

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(2);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenNthCalledWith(1, {
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
      });
      expect(alertsClient.getSummarizedAlerts).toHaveBeenNthCalledWith(2, {
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(2);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(1);
      expect(ruleRunMetricsStore.getStatusByConnectorType('.test-system-action')).toEqual({
        numberOfGeneratedActions: 2,
        numberOfTriggeredActions: 1,
        triggeredActionsStatus: ActionsCompletion.PARTIAL,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        `Rule "rule-id-1" skipped scheduling action "system-action-1" because the maximum number of allowed actions for connector type .test-system-action has been reached.`
      );

      expect(results).toHaveLength(1);

      const finalSummary = { ...summarizedAlerts, all: { count: 2, data: [mockAAD, mockAAD] } };
      expect(results).toEqual([getResult('system-action-1', 'xxx-xxx', finalSummary)]);
    });

    test('should skip creating actions to schedule if no connector adapter exists for connector type', async () => {
      const differentSystemAction = {
        id: 'different-action-1',
        actionTypeId: '.test-bad-system-action',
        params: { myParams: 'foo' },
        uuid: 'zzz-zzz',
      };

      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: { count: 2, data: [mockAAD, mockAAD] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const defaultContext = getSchedulerContext();
      const scheduler = new SystemActionScheduler({
        ...defaultContext,
        rule: { ...rule, systemActions: [differentSystemAction] },
      });
      const results = await scheduler.getActionsToSchedule({});

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(1);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(0);

      expect(logger.warn).toHaveBeenCalledWith(
        `Rule "rule-id-1" skipped scheduling system action "different-action-1" because no connector adapter is configured`
      );

      expect(results).toHaveLength(0);
    });

    describe('frequency and throttling', () => {
      const summarySystemActionWithThrottle: RuleSystemAction = {
        id: 'system-action-throttle',
        actionTypeId: '.test-system-action',
        params: { myParams: 'test' },
        uuid: 'throttle-uuid',
        frequency: {
          summary: true,
          notifyWhen: 'onThrottleInterval',
          throttle: '1h',
        },
      };

      test('should create actions to schedule for summary system action with throttle interval', async () => {
        clock.setSystemTime(new Date('2020-01-01T12:00:00.000Z'));
        alertsClient.getProcessedAlerts.mockReturnValue(alerts);

        const summarizedAlerts = {
          new: { count: 2, data: [mockAAD, mockAAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
        };
        alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

        const scheduler = new SystemActionScheduler({
          ...getSchedulerContext(),
          rule: { ...rule, systemActions: [summarySystemActionWithThrottle] },
        });

        const throttledSummaryActions = {};
        const results = await scheduler.getActionsToSchedule({
          throttledSummaryActions,
        });

        expect(throttledSummaryActions).toEqual({
          'throttle-uuid': { date: '2020-01-01T12:00:00.000Z' },
        });
        expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
        expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
          excludedAlertInstanceIds: [],
          ruleId: 'rule-id-1',
          spaceId: 'test1',
          start: new Date('2020-01-01T11:00:00.000Z'),
          end: new Date('2020-01-01T12:00:00.000Z'),
        });

        expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(1);
        expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(1);

        expect(results).toHaveLength(1);
        const finalSummary = { ...summarizedAlerts, all: { count: 2, data: [mockAAD, mockAAD] } };
        expect(results).toEqual([
          getResult('system-action-throttle', 'throttle-uuid', finalSummary),
        ]);
      });

      test('should skip creating actions to schedule for summary system action when throttled', async () => {
        clock.setSystemTime(new Date('2020-01-01T12:00:00.000Z'));

        const scheduler = new SystemActionScheduler({
          ...getSchedulerContext(),
          rule: { ...rule, systemActions: [summarySystemActionWithThrottle] },
        });

        const throttledSummaryActions = {
          'throttle-uuid': { date: '2020-01-01T11:30:00.000Z' },
        };
        const results = await scheduler.getActionsToSchedule({
          throttledSummaryActions,
        });

        expect(throttledSummaryActions).toEqual({
          'throttle-uuid': { date: '2020-01-01T11:30:00.000Z' },
        });
        expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(
          `skipping scheduling the action '.test-system-action:system-action-throttle', summary action is still being throttled`
        );

        expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(0);
        expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(0);

        expect(results).toHaveLength(0);
      });

      test('should update throttled state after executing summary system action with throttle', async () => {
        clock.setSystemTime(new Date('2020-01-01T12:00:00.000Z'));
        alertsClient.getProcessedAlerts.mockReturnValue(alerts);

        const summarizedAlerts = {
          new: { count: 1, data: [mockAAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
        };
        alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

        const scheduler = new SystemActionScheduler({
          ...getSchedulerContext(),
          rule: { ...rule, systemActions: [summarySystemActionWithThrottle] },
        });

        const throttledSummaryActions = {};
        await scheduler.getActionsToSchedule({
          throttledSummaryActions,
        });

        expect(throttledSummaryActions).toEqual({
          'throttle-uuid': { date: '2020-01-01T12:00:00.000Z' },
        });
      });
    });

    describe('per-alert execution mode', () => {
      const perAlertSystemAction: RuleSystemAction = {
        id: 'system-action-per-alert',
        actionTypeId: '.test-system-action',
        params: { myParams: 'test' },
        uuid: 'per-alert-uuid',
        frequency: {
          summary: false,
          notifyWhen: 'onActiveAlert',
          throttle: null,
        },
      };

      test('should create separate actions for each alert when summary is false', async () => {
        alertsClient.getProcessedAlerts.mockReturnValue(alerts);

        const alert1Uuid = newAlert1[1].getUuid();
        const alert2Uuid = newAlert2[2].getUuid();
        const alert1AAD = { ...mockAAD, [ALERT_UUID]: alert1Uuid };
        const alert2AAD = { ...mockAAD, [ALERT_UUID]: alert2Uuid };

        const summarizedAlerts = {
          new: { count: 2, data: [alert1AAD, alert2AAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
        };
        alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

        const scheduler = new SystemActionScheduler({
          ...getSchedulerContext(),
          rule: { ...rule, systemActions: [perAlertSystemAction] },
        });

        const results = await scheduler.getActionsToSchedule({});

        expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
        expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
          excludedAlertInstanceIds: [],
          executionUuid: defaultSchedulerContext.executionId,
          ruleId: 'rule-id-1',
          spaceId: 'test1',
        });

        expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(2);
        expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(2);

        expect(results).toHaveLength(2);

        const alert1Summary: CombinedSummarizedAlerts = {
          new: { count: 1, data: [alert1AAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
          all: { count: 1, data: [alert1AAD] },
        };

        const alert2Summary: CombinedSummarizedAlerts = {
          new: { count: 1, data: [alert2AAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
          all: { count: 1, data: [alert2AAD] },
        };

        expect(results).toEqual([
          getResult('system-action-per-alert', 'per-alert-uuid', alert1Summary),
          getResult('system-action-per-alert', 'per-alert-uuid', alert2Summary),
        ]);
      });

      test('should create single action for single alert when summary is false', async () => {
        alertsClient.getProcessedAlerts.mockReturnValue(newAlert1);

        const alert1Uuid = newAlert1[1].getUuid();
        const alert1AAD = { ...mockAAD, [ALERT_UUID]: alert1Uuid };

        const summarizedAlerts = {
          new: { count: 1, data: [alert1AAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
        };
        alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

        const scheduler = new SystemActionScheduler({
          ...getSchedulerContext(),
          rule: { ...rule, systemActions: [perAlertSystemAction] },
        });

        const results = await scheduler.getActionsToSchedule({});

        expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(1);
        expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(1);

        expect(results).toHaveLength(1);

        const alert1Summary: CombinedSummarizedAlerts = {
          new: { count: 1, data: [alert1AAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
          all: { count: 1, data: [alert1AAD] },
        };

        expect(results).toEqual([
          getResult('system-action-per-alert', 'per-alert-uuid', alert1Summary),
        ]);
      });

      test('should correctly categorize alerts in per-alert mode (new/ongoing/recovered)', async () => {
        alertsClient.getProcessedAlerts.mockReturnValue(alerts);

        const alert1Uuid = newAlert1[1].getUuid();
        const alert2Uuid = newAlert2[2].getUuid();
        const alert1AAD = { ...mockAAD, [ALERT_UUID]: alert1Uuid };
        const alert2AAD = { ...mockAAD, [ALERT_UUID]: alert2Uuid };

        const summarizedAlerts = {
          new: { count: 1, data: [alert1AAD] },
          ongoing: { count: 1, data: [alert2AAD] },
          recovered: { count: 0, data: [] },
        };
        alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

        const scheduler = new SystemActionScheduler({
          ...getSchedulerContext(),
          rule: { ...rule, systemActions: [perAlertSystemAction] },
        });

        const results = await scheduler.getActionsToSchedule({});

        expect(results).toHaveLength(2);

        const alert1Summary: CombinedSummarizedAlerts = {
          new: { count: 1, data: [alert1AAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
          all: { count: 1, data: [alert1AAD] },
        };

        const alert2Summary: CombinedSummarizedAlerts = {
          new: { count: 0, data: [] },
          ongoing: { count: 1, data: [alert2AAD] },
          recovered: { count: 0, data: [] },
          all: { count: 1, data: [alert2AAD] },
        };

        expect(results).toEqual([
          getResult('system-action-per-alert', 'per-alert-uuid', alert1Summary),
          getResult('system-action-per-alert', 'per-alert-uuid', alert2Summary),
        ]);
      });

      test('should not throttle per-alert system actions', async () => {
        clock.setSystemTime(new Date('2020-01-01T12:00:00.000Z'));
        alertsClient.getProcessedAlerts.mockReturnValue(alerts);

        const perAlertActionWithThrottle: RuleSystemAction = {
          ...perAlertSystemAction,
          frequency: {
            summary: false,
            notifyWhen: 'onThrottleInterval',
            throttle: '1h',
          },
        };

        const alert1Uuid = newAlert1[1].getUuid();
        const alert2Uuid = newAlert2[2].getUuid();
        const alert1AAD = { ...mockAAD, [ALERT_UUID]: alert1Uuid };
        const alert2AAD = { ...mockAAD, [ALERT_UUID]: alert2Uuid };

        const summarizedAlerts = {
          new: { count: 2, data: [alert1AAD, alert2AAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
        };
        alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

        const scheduler = new SystemActionScheduler({
          ...getSchedulerContext(),
          rule: { ...rule, systemActions: [perAlertActionWithThrottle] },
        });

        const throttledSummaryActions = {
          'per-alert-uuid': { date: '2020-01-01T11:30:00.000Z' },
        };
        const results = await scheduler.getActionsToSchedule({
          throttledSummaryActions,
        });

        // Per-alert actions should not be throttled, so they should execute
        expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
        expect(logger.debug).not.toHaveBeenCalledWith(
          expect.stringContaining('summary action is still being throttled')
        );

        expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(2);
        expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(2);

        expect(results).toHaveLength(2);
      });

      test('should handle mixed system actions (summary and per-alert)', async () => {
        alertsClient.getProcessedAlerts.mockReturnValue(alerts);

        const summarySystemAction: RuleSystemAction = {
          id: 'system-action-summary',
          actionTypeId: '.test-system-action',
          params: { myParams: 'summary' },
          uuid: 'summary-uuid',
          frequency: {
            summary: true,
            notifyWhen: 'onActiveAlert',
            throttle: null,
          },
        };

        const alert1Uuid = newAlert1[1].getUuid();
        const alert2Uuid = newAlert2[2].getUuid();
        const alert1AAD = { ...mockAAD, [ALERT_UUID]: alert1Uuid };
        const alert2AAD = { ...mockAAD, [ALERT_UUID]: alert2Uuid };

        const summarizedAlerts = {
          new: { count: 2, data: [alert1AAD, alert2AAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
        };
        alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

        const scheduler = new SystemActionScheduler({
          ...getSchedulerContext(),
          rule: { ...rule, systemActions: [summarySystemAction, perAlertSystemAction] },
        });

        const results = await scheduler.getActionsToSchedule({});

        // Summary action: 1 execution with all alerts
        // Per-alert action: 2 executions (one per alert)
        expect(results).toHaveLength(3);

        const allAlertsSummary: CombinedSummarizedAlerts = {
          ...summarizedAlerts,
          all: { count: 2, data: [alert1AAD, alert2AAD] },
        };

        const alert1Summary: CombinedSummarizedAlerts = {
          new: { count: 1, data: [alert1AAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
          all: { count: 1, data: [alert1AAD] },
        };

        const alert2Summary: CombinedSummarizedAlerts = {
          new: { count: 1, data: [alert2AAD] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
          all: { count: 1, data: [alert2AAD] },
        };

        expect(results).toEqual([
          getResult('system-action-summary', 'summary-uuid', allAlertsSummary),
          getResult('system-action-per-alert', 'per-alert-uuid', alert1Summary),
          getResult('system-action-per-alert', 'per-alert-uuid', alert2Summary),
        ]);
      });

      test('should skip per-alert actions when no alerts found', async () => {
        alertsClient.getProcessedAlerts.mockReturnValue({});

        const summarizedAlerts = {
          new: { count: 0, data: [] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
        };
        alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

        const scheduler = new SystemActionScheduler({
          ...getSchedulerContext(),
          rule: { ...rule, systemActions: [perAlertSystemAction] },
        });

        const results = await scheduler.getActionsToSchedule({});

        expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(0);
        expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(0);
        expect(results).toHaveLength(0);
      });
    });
  });
});
