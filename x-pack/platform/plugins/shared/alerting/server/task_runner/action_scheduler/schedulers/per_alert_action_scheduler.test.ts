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
import { PerAlertActionScheduler } from './per_alert_action_scheduler';
import {
  getRule,
  getRuleType,
  getDefaultSchedulerContext,
  generateAlert,
  generateRecoveredAlert,
} from '../test_fixtures';
import type { SanitizedRuleAction } from '@kbn/alerting-types';
import { ALERT_STATUS_DELAYED, ALERT_UUID } from '@kbn/rule-data-utils';
import { Alert } from '../../../alert';
import type { AlertInstanceContext, AlertInstanceState } from '@kbn/alerting-state-types';
import { ActionsCompletion } from '@kbn/alerting-state-types';
import { TaskPriority } from '@kbn/task-manager-plugin/server';
import { transformActionParams } from '../../transform_action_params';

const alertingEventLogger = alertingEventLoggerMock.create();
const actionsClient = actionsClientMock.create();
const alertsClient = alertsClientMock.create();
const mockActionsPlugin = actionsMock.createStart();
const logger = loggingSystemMock.create().get();

let ruleRunMetricsStore: RuleRunMetricsStore;
const rule = getRule({
  id: 'rule-id-1',
  actions: [
    {
      id: 'action-1',
      group: 'default',
      actionTypeId: 'test',
      frequency: { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal:
          'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
      },
      uuid: '111-111',
    },
    {
      id: 'action-2',
      group: 'default',
      actionTypeId: 'test',
      frequency: { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal:
          'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
      },
      uuid: '222-222',
    },
    {
      id: 'action-3',
      group: 'default',
      actionTypeId: 'test',
      frequency: { summary: true, notifyWhen: 'onActiveAlert' },
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal:
          'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
      },
      uuid: '333-333',
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

// @ts-ignore
const getSchedulerContext = (params = {}) => {
  return { ...defaultSchedulerContext, rule, ...params, ruleRunMetricsStore };
};

const getResult = (
  actionId: string,
  alertId: string,
  actionUuid: string,
  priority?: number,
  apiKeyId?: string
) => ({
  actionToEnqueue: {
    actionTypeId: 'test',
    apiKey: 'MTIzOmFiYw==',
    consumer: 'rule-consumer',
    executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
    id: actionId,
    uuid: actionUuid,
    relatedSavedObjects: [{ id: 'rule-id-1', namespace: 'test1', type: 'alert', typeId: 'test' }],
    source: { source: { id: 'rule-id-1', type: 'alert' }, type: 'SAVED_OBJECT' },
    spaceId: 'test1',
    ...(priority ? { priority } : {}),
    ...(apiKeyId ? { apiKeyId } : {}),
  },
  actionToLog: { alertGroup: 'default', alertId, id: actionId, uuid: actionUuid, typeId: 'test' },
});

jest.mock('../../transform_action_params', () => ({
  transformActionParams: jest.fn(),
}));

let clock: sinon.SinonFakeTimers;

describe('Per-Alert Action Scheduler', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    mockActionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    mockActionsPlugin.isActionExecutable.mockReturnValue(true);
    mockActionsPlugin.getActionsClientWithRequest.mockResolvedValue(actionsClient);
    ruleRunMetricsStore = new RuleRunMetricsStore();
  });

  afterAll(() => {
    clock.restore();
  });

  test('should initialize with only per-alert actions', () => {
    const scheduler = new PerAlertActionScheduler(getSchedulerContext());

    // @ts-expect-error private variable
    expect(scheduler.actions).toHaveLength(2);
    // @ts-expect-error private variable
    expect(scheduler.actions).toEqual([rule.actions[0], rule.actions[1]]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('should not initialize action and log if rule type does not support summarized alerts and action has alertsFilter', () => {
    const actions = [
      {
        id: '1',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '111-111',
      },
      {
        id: '2',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
        alertsFilter: {
          query: { kql: 'kibana.alert.rule.name:foo', dsl: '{}', filters: [] },
        },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '222-222',
      },
    ];
    const scheduler = new PerAlertActionScheduler(
      getSchedulerContext({
        rule: {
          ...rule,
          actions,
        },
        ruleType: { ...ruleType, alerts: undefined },
      })
    );

    // @ts-expect-error private variable
    expect(scheduler.actions).toHaveLength(1);
    // @ts-expect-error private variable
    expect(scheduler.actions).toEqual([actions[0]]);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      `Skipping action \"2\" for rule \"rule-id-1\" because the rule type \"Test\" does not support alert-as-data.`
    );
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
      newAlert1 = generateAlert({ id: 1, activeCount: 3 });
      newAlert2 = generateAlert({ id: 2, activeCount: 5 });
      alerts = { ...newAlert1, ...newAlert2 };
    });

    test('should create action to schedule for each alert and each action', async () => {
      // 2 per-alert actions * 2 alerts = 4 actions to schedule
      const scheduler = new PerAlertActionScheduler(getSchedulerContext());
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(4);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(4);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 4,
        numberOfTriggeredActions: 4,
      });

      expect(results).toHaveLength(4);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-1', '2', '111-111'),
        getResult('action-2', '1', '222-222'),
        getResult('action-2', '2', '222-222'),
      ]);

      expect(transformActionParams).toHaveBeenCalledTimes(4);
      expect(transformActionParams).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'action-1',
          alertId: 'rule-id-1',
          consecutiveMatches: 3,
          alertUuid: expect.any(String),
        })
      );
    });

    test('test should create action to schedule with priority if specified for each alert and each action', async () => {
      // 2 per-alert actions * 2 alerts = 4 actions to schedule
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        priority: TaskPriority.Low,
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(4);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(4);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 4,
        numberOfTriggeredActions: 4,
      });

      expect(results).toHaveLength(4);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111', 1),
        getResult('action-1', '2', '111-111', 1),
        getResult('action-2', '1', '222-222', 1),
        getResult('action-2', '2', '222-222', 1),
      ]);
    });

    test('test should create action to schedule with apiKeyId if specified for each alert and each action', async () => {
      // 2 per-alert actions * 2 alerts = 4 actions to schedule
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        apiKeyId: '23534ybfsdsnsdf',
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(4);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(4);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 4,
        numberOfTriggeredActions: 4,
      });

      expect(results).toHaveLength(4);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111', undefined, '23534ybfsdsnsdf'),
        getResult('action-1', '2', '111-111', undefined, '23534ybfsdsnsdf'),
        getResult('action-2', '1', '222-222', undefined, '23534ybfsdsnsdf'),
        getResult('action-2', '2', '222-222', undefined, '23534ybfsdsnsdf'),
      ]);
    });

    test('should skip creating actions to schedule when alert has maintenance window', async () => {
      // 2 per-alert actions * 2 alerts = 4 actions to schedule
      // but alert 1 has maintenance window, so only actions for alert 2 should be scheduled
      const scheduler = new PerAlertActionScheduler(getSchedulerContext());
      const newAlertWithMaintenanceWindow = generateAlert({
        id: 1,
        maintenanceWindowIds: ['mw-1'],
      });
      const alertsWithMaintenanceWindow = { ...newAlertWithMaintenanceWindow, ...newAlert2 };
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alertsWithMaintenanceWindow,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenNthCalledWith(
        1,
        `no scheduling of actions \"action-1\" for alert \"1\" from rule \"rule-id-1\": has active maintenance windows mw-1.`
      );
      expect(logger.debug).toHaveBeenNthCalledWith(
        2,
        `no scheduling of actions \"action-2\" for alert \"1\" from rule \"rule-id-1\": has active maintenance windows mw-1.`
      );

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(2);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(2);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 2,
        numberOfTriggeredActions: 2,
      });

      expect(results).toHaveLength(2);
      expect(results).toEqual([
        getResult('action-1', '2', '111-111'),
        getResult('action-2', '2', '222-222'),
      ]);
    });

    test('should skip creating actions to schedule when alert has invalid action group', async () => {
      // 2 per-alert actions * 2 alerts = 4 actions to schedule
      // but alert 1 has invalid action group, so only actions for alert 2 should be scheduled
      const scheduler = new PerAlertActionScheduler(getSchedulerContext());
      const newAlertInvalidActionGroup = generateAlert({
        id: 1,
        // @ts-expect-error
        group: 'invalid',
      });
      const alertsWithInvalidActionGroup = { ...newAlertInvalidActionGroup, ...newAlert2 };
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alertsWithInvalidActionGroup,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        `Invalid action group \"invalid\" for rule \"test\".`
      );
      expect(logger.error).toHaveBeenNthCalledWith(
        2,
        `Invalid action group \"invalid\" for rule \"test\".`
      );

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(2);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(2);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 2,
        numberOfTriggeredActions: 2,
      });

      expect(results).toHaveLength(2);
      expect(results).toEqual([
        getResult('action-1', '2', '111-111'),
        getResult('action-2', '2', '222-222'),
      ]);
    });

    test('should skip creating actions to schedule when alert has no scheduled actions', async () => {
      // 2 per-alert actions * 2 alerts = 4 actions to schedule
      // but alert 1 has has no scheduled actions, so only actions for alert 2 should be scheduled
      const scheduler = new PerAlertActionScheduler(getSchedulerContext());
      const newAlertInvalidActionGroup = generateAlert({
        id: 1,
        scheduleActions: false,
      });
      const alertsWithInvalidActionGroup = { ...newAlertInvalidActionGroup, ...newAlert2 };
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alertsWithInvalidActionGroup,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(2);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(2);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 2,
        numberOfTriggeredActions: 2,
      });

      expect(results).toHaveLength(2);
      expect(results).toEqual([
        getResult('action-1', '2', '111-111'),
        getResult('action-2', '2', '222-222'),
      ]);
    });

    test('should skip creating actions to schedule when alert has pending recovered count greater than 0 and notifyWhen is onActiveAlert', async () => {
      // 2 per-alert actions * 2 alerts = 4 actions to schedule
      // but alert 1 has a pending recovered count > 0 & notifyWhen is onActiveAlert, so only actions for alert 2 should be scheduled
      const scheduler = new PerAlertActionScheduler(getSchedulerContext());
      const newAlertWithPendingRecoveredCount = generateAlert({
        id: 1,
        pendingRecoveredCount: 3,
      });
      const alertsWithPendingRecoveredCount = {
        ...newAlertWithPendingRecoveredCount,
        ...newAlert2,
      };
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alertsWithPendingRecoveredCount,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(2);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(2);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 2,
        numberOfTriggeredActions: 2,
      });

      expect(results).toHaveLength(2);
      expect(results).toEqual([
        getResult('action-1', '2', '111-111'),
        getResult('action-2', '2', '222-222'),
      ]);
    });

    test('should skip creating actions to schedule when alert has pending recovered count greater than 0 and notifyWhen is onThrottleInterval', async () => {
      // 2 per-alert actions * 2 alerts = 4 actions to schedule
      // but alert 1 has a pending recovered count > 0 & notifyWhen is onThrottleInterval, so only actions for alert 2 should be scheduled
      const onThrottleIntervalAction: SanitizedRuleAction = {
        id: 'action-4',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '444-444',
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], onThrottleIntervalAction] },
      });
      const newAlertWithPendingRecoveredCount = generateAlert({ id: 1, pendingRecoveredCount: 3 });
      const alertsWithPendingRecoveredCount = {
        ...newAlertWithPendingRecoveredCount,
        ...newAlert2,
      };
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alertsWithPendingRecoveredCount,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(2);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(2);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 2,
        numberOfTriggeredActions: 2,
      });

      expect(results).toHaveLength(2);
      expect(results).toEqual([
        getResult('action-1', '2', '111-111'),
        getResult('action-4', '2', '444-444'),
      ]);
    });

    test('should skip creating actions to schedule when alert is muted', async () => {
      // 2 per-alert actions * 2 alerts = 4 actions to schedule
      // but alert 2 is muted, so only actions for alert 1 should be scheduled
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, mutedInstanceIds: ['2'] },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenNthCalledWith(
        1,
        `skipping scheduling of actions for '2' in rule rule-label: alert is muted`
      );

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(2);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(2);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 2,
        numberOfTriggeredActions: 2,
      });

      expect(results).toHaveLength(2);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-2', '1', '222-222'),
      ]);

      // @ts-expect-error private variable
      expect(scheduler.skippedAlerts).toEqual({ '2': { reason: 'muted' } });
    });

    test('should auto-unmute alert when conditional snooze TTL expires (rule SO)', async () => {
      // Alert 2 has a conditional snooze with an expired TTL (carried on alert from initializeExecution).
      const expiredSnooze = {
        instanceId: '2',
        expiresAt: new Date(Date.now() - 60000).toISOString(),
      };
      alerts['2'].setSnoozeConfig(expiredSnooze);
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: {
          ...rule,
          snoozedInstances: [expiredSnooze],
        },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      // Alert 2 should be scheduled (not muted) because snooze expired
      expect(results).toHaveLength(4);
      expect(scheduler.alertsToAutoUnmute).toHaveLength(1);
      expect(scheduler.alertsToAutoUnmute[0].alertInstanceId).toBe('2');
      expect(scheduler.alertsToAutoUnmute[0].reason).toContain('Time expiry reached');
    });

    test('should keep alert muted when conditional snooze TTL not expired (rule SO)', async () => {
      // Alert 2 has a conditional snooze with a future expiry (carried on alert from initializeExecution).
      const futureSnooze = {
        instanceId: '2',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
      alerts['2'].setSnoozeConfig(futureSnooze);
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: {
          ...rule,
          snoozedInstances: [futureSnooze],
        },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      // Alert 2 should remain muted -- only alert 1 gets actions
      expect(results).toHaveLength(2);
      expect(scheduler.alertsToAutoUnmute).toHaveLength(0);

      // @ts-expect-error private variable
      expect(scheduler.skippedAlerts).toEqual({ '2': { reason: 'muted' } });
    });

    test('should auto-unmute alert when conditional snooze TTL expires and rule has no actions', async () => {
      // Rule has no actions; alert 2 has an expired per-alert snooze (carried on alert).
      // Without the dedicated evaluateAlertForAutoUnmute pass, we would never
      // enter the actions loop and alertsToAutoUnmute would stay empty.
      const expiredSnooze = {
        instanceId: '2',
        expiresAt: new Date(Date.now() - 60000).toISOString(),
      };
      alerts['2'].setSnoozeConfig(expiredSnooze);
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: {
          ...rule,
          actions: [],
          snoozedInstances: [expiredSnooze],
        },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(results).toHaveLength(0);
      expect(scheduler.alertsToAutoUnmute).toHaveLength(1);
      expect(scheduler.alertsToAutoUnmute[0].alertInstanceId).toBe('2');
      expect(scheduler.alertsToAutoUnmute[0].reason).toContain('Time expiry reached');
    });

    test('should auto-unmute recovered alert when conditional snooze TTL expires', async () => {
      // A recovered alert with an expired per-alert snooze should still appear in
      // alertsToAutoUnmute so the rule SO is cleaned up.
      const expiredSnooze = {
        instanceId: '3',
        expiresAt: new Date(Date.now() - 60000).toISOString(),
      };
      const recoveredAlert = generateRecoveredAlert({ id: 3 });
      recoveredAlert['3'].setSnoozeConfig(expiredSnooze);
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: {
          ...rule,
          snoozedInstances: [expiredSnooze],
        },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
        recoveredAlerts: recoveredAlert,
      });

      // Active alerts get their actions as usual
      expect(results).toHaveLength(4);
      // The recovered alert should be queued for auto-unmute
      expect(scheduler.alertsToAutoUnmute).toHaveLength(1);
      expect(scheduler.alertsToAutoUnmute[0].alertInstanceId).toBe('3');
      expect(scheduler.alertsToAutoUnmute[0].reason).toContain('Time expiry reached');
    });

    test('should treat alert as simple mute when in mutedInstanceIds but not snoozedInstances', async () => {
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, mutedInstanceIds: ['2'] },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      // Alert 2 should remain muted (simple mute)
      expect(results).toHaveLength(2);
      expect(scheduler.alertsToAutoUnmute).toHaveLength(0);
    });

    test('should not treat alert as muted when not in mutedInstanceIds or snoozedInstances', async () => {
      const scheduler = new PerAlertActionScheduler(getSchedulerContext());
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      // Neither alert is muted -- all alerts get actions
      expect(results).toHaveLength(4);
      expect(scheduler.alertsToAutoUnmute).toHaveLength(0);
    });

    test('should evaluate snooze conditions against current-execution built alert data (no one-cycle delay)', async () => {
      // Built alert (current execution) has severity=medium.
      // Snooze condition: severity_equals 'medium' → should unmute using current data.
      alertsClient.getBuiltAlertByInstanceId.mockImplementation((id: string) => {
        if (id === '2') {
          return { 'kibana.alert.instance.id': '2', 'kibana.alert.severity': 'medium' };
        }
        return undefined;
      });

      const conditionSnooze = {
        instanceId: '2',
        conditions: [{ type: 'severity_equals', field: 'kibana.alert.severity', value: 'medium' }],
      };
      alerts['2'].setSnoozeConfig(conditionSnooze);
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: {
          ...rule,
          snoozedInstances: [conditionSnooze],
        },
      });
      const results = await scheduler.getActionsToSchedule({ activeAlerts: alerts });

      expect(results).toHaveLength(4);
      expect(scheduler.alertsToAutoUnmute).toHaveLength(1);
      expect(scheduler.alertsToAutoUnmute[0].alertInstanceId).toBe('2');

      alertsClient.getBuiltAlertByInstanceId.mockReset();
    });

    test('should not auto-unmute when built alert is unavailable (no fallback to tracked data)', async () => {
      alertsClient.getBuiltAlertByInstanceId.mockReturnValue(undefined);

      const conditionSnooze = {
        instanceId: '2',
        conditions: [{ type: 'severity_equals', field: 'kibana.alert.severity', value: 'medium' }],
      };
      alerts['2'].setSnoozeConfig(conditionSnooze);
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: {
          ...rule,
          snoozedInstances: [conditionSnooze],
        },
      });
      const results = await scheduler.getActionsToSchedule({ activeAlerts: alerts });

      // Without built alert data, conditions cannot be evaluated so snooze remains active.
      expect(results).toHaveLength(2);
      expect(scheduler.alertsToAutoUnmute).toHaveLength(0);

      alertsClient.getBuiltAlertByInstanceId.mockReset();
    });

    test('should not treat alert as muted when not in snoozedInstances regardless of AAD fields', async () => {
      // doc-level ALERT_MUTED or snooze fields are irrelevant; only rule SO matters.
      const scheduler = new PerAlertActionScheduler(getSchedulerContext());
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      // Alert 2 should NOT be muted (not in snoozedInstances or mutedInstanceIds)
      expect(results).toHaveLength(4);
      expect(scheduler.alertsToAutoUnmute).toHaveLength(0);
    });

    test('should skip creating actions to schedule when alert action group has not changed and notifyWhen is onActionGroupChange', async () => {
      const onActionGroupChangeAction: SanitizedRuleAction = {
        id: 'action-4',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onActionGroupChange', throttle: null },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '444-444',
      };

      const activeAlert1 = generateAlert({
        id: 1,
        group: 'default',
        lastScheduledActionsGroup: 'other-group',
      });
      const activeAlert2 = generateAlert({
        id: 2,
        group: 'default',
        lastScheduledActionsGroup: 'default',
      });
      const alertsWithOngoingAlert = { ...activeAlert1, ...activeAlert2 };

      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], onActionGroupChangeAction] },
      });

      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alertsWithOngoingAlert,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenNthCalledWith(
        1,
        `skipping scheduling of actions for '2' in rule rule-label: alert is active but action group has not changed`
      );

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(3);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(3);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 3,
        numberOfTriggeredActions: 3,
      });

      expect(results).toHaveLength(3);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-1', '2', '111-111'),
        getResult('action-4', '1', '444-444'),
      ]);

      // @ts-expect-error private variable
      expect(scheduler.skippedAlerts).toEqual({ '2': { reason: 'actionGroupHasNotChanged' } });
    });

    test('should skip creating actions to schedule when throttle interval has not passed and notifyWhen is onThrottleInterval', async () => {
      const onThrottleIntervalAction: SanitizedRuleAction = {
        id: 'action-5',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '555-555',
      };

      const activeAlert2 = generateAlert({
        id: 2,
        lastScheduledActionsGroup: 'default',
        throttledActions: { '555-555': { date: '1969-12-31T23:10:00.000Z' } },
      });
      const alertsWithOngoingAlert = { ...newAlert1, ...activeAlert2 };

      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], onThrottleIntervalAction] },
      });

      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alertsWithOngoingAlert,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenNthCalledWith(
        1,
        `skipping scheduling of actions for '2' in rule rule-label: rule is throttled`
      );

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(3);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(3);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 3,
        numberOfTriggeredActions: 3,
      });

      expect(results).toHaveLength(3);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-1', '2', '111-111'),
        getResult('action-5', '1', '555-555'),
      ]);

      // @ts-expect-error private variable
      expect(scheduler.skippedAlerts).toEqual({ '2': { reason: 'throttled' } });
    });

    test('should not skip creating actions to schedule when throttle interval has passed and notifyWhen is onThrottleInterval', async () => {
      const onThrottleIntervalAction: SanitizedRuleAction = {
        id: 'action-5',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '555-555',
      };

      const activeAlert2 = generateAlert({
        id: 2,
        lastScheduledActionsGroup: 'default',
        throttledActions: { '222-222': { date: '1969-12-31T22:10:00.000Z' } },
      });
      const alertsWithOngoingAlert = { ...newAlert1, ...activeAlert2 };

      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], onThrottleIntervalAction] },
      });

      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alertsWithOngoingAlert,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(4);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(4);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 4,
        numberOfTriggeredActions: 4,
      });

      expect(results).toHaveLength(4);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-1', '2', '111-111'),
        getResult('action-5', '1', '555-555'),
        getResult('action-5', '2', '555-555'),
      ]);

      // @ts-expect-error private variable
      expect(scheduler.skippedAlerts).toEqual({});
    });

    test('should query for summarized alerts if useAlertDataForTemplate is true', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, [ALERT_UUID]: alerts[2].getUuid() },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithUseAlertDataForTemplate: SanitizedRuleAction = {
        id: 'action-6',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '666-666',
        useAlertDataForTemplate: true,
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithUseAlertDataForTemplate] },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(4);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(4);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 4,
        numberOfTriggeredActions: 4,
      });

      expect(results).toHaveLength(4);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-1', '2', '111-111'),
        getResult('action-6', '1', '666-666'),
        getResult('action-6', '2', '666-666'),
      ]);
    });

    test('should query for summarized alerts if useAlertDataForTemplate is true and action has throttle interval', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, [ALERT_UUID]: alerts[2].getUuid() },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithUseAlertDataForTemplate: SanitizedRuleAction = {
        id: 'action-6',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '666-666',
        useAlertDataForTemplate: true,
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithUseAlertDataForTemplate] },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        ruleId: 'rule-id-1',
        spaceId: 'test1',
        start: new Date('1969-12-31T23:00:00.000Z'),
        end: new Date('1970-01-01T00:00:00.000Z'),
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(4);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(4);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 4,
        numberOfTriggeredActions: 4,
      });

      expect(results).toHaveLength(4);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-1', '2', '111-111'),
        getResult('action-6', '1', '666-666'),
        getResult('action-6', '2', '666-666'),
      ]);
    });

    test('should query for summarized alerts if action has alertsFilter', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, [ALERT_UUID]: alerts[2].getUuid() },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithAlertsFilter: SanitizedRuleAction = {
        id: 'action-7',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '777-777',
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithAlertsFilter] },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(4);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(4);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 4,
        numberOfTriggeredActions: 4,
      });

      expect(results).toHaveLength(4);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-1', '2', '111-111'),
        getResult('action-7', '1', '777-777'),
        getResult('action-7', '2', '777-777'),
      ]);
    });

    test('should query for summarized alerts if action has alertsFilter and action has throttle interval', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, [ALERT_UUID]: alerts[2].getUuid() },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithAlertsFilter: SanitizedRuleAction = {
        id: 'action-7',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '6h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '777-777',
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithAlertsFilter] },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        ruleId: 'rule-id-1',
        spaceId: 'test1',
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
        start: new Date('1969-12-31T18:00:00.000Z'),
        end: new Date('1970-01-01T00:00:00.000Z'),
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(4);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(4);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 4,
        numberOfTriggeredActions: 4,
      });

      expect(results).toHaveLength(4);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-1', '2', '111-111'),
        getResult('action-7', '1', '777-777'),
        getResult('action-7', '2', '777-777'),
      ]);
    });

    test('should skip creating actions to schedule if alert does not match any alerts in summarized alerts', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, [ALERT_UUID]: 'uuid-not-a-match' },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithAlertsFilter: SanitizedRuleAction = {
        id: 'action-8',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '888-888',
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithAlertsFilter] },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(3);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(3);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 3,
        numberOfTriggeredActions: 3,
      });

      expect(results).toHaveLength(3);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-1', '2', '111-111'),
        getResult('action-8', '1', '888-888'),
      ]);
    });

    test('should set alerts as data', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, _id: alerts[1].getUuid(), [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, _id: alerts[2].getUuid(), [ALERT_UUID]: alerts[2].getUuid() },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithAlertsFilter: SanitizedRuleAction = {
        id: 'action-9',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '999-999',
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithAlertsFilter] },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: 'rule-id-1',
        spaceId: 'test1',
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      });

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(4);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(4);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 4,
        numberOfTriggeredActions: 4,
      });

      expect(results).toHaveLength(4);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-1', '2', '111-111'),
        getResult('action-9', '1', '999-999'),
        getResult('action-9', '2', '999-999'),
      ]);

      expect(alerts['1'].getAlertAsData()).not.toBeUndefined();
      expect(alerts['2'].getAlertAsData()).not.toBeUndefined();
    });

    test('should skip creating actions to schedule if overall max actions limit exceeded', async () => {
      const defaultContext = getSchedulerContext();
      const scheduler = new PerAlertActionScheduler({
        ...defaultContext,
        taskRunnerContext: {
          ...defaultContext.taskRunnerContext,
          actionsConfigMap: {
            default: { max: 3 },
          },
        },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(4);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(3);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 4,
        numberOfTriggeredActions: 3,
        triggeredActionsStatus: ActionsCompletion.PARTIAL,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        `Rule "rule-id-1" skipped scheduling action "action-2" because the maximum number of allowed actions has been reached.`
      );

      expect(results).toHaveLength(3);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-1', '2', '111-111'),
        getResult('action-2', '1', '222-222'),
      ]);
    });

    test('should skip creating actions to schedule if connector type max actions limit exceeded', async () => {
      const defaultContext = getSchedulerContext();
      const scheduler = new PerAlertActionScheduler({
        ...defaultContext,
        taskRunnerContext: {
          ...defaultContext.taskRunnerContext,
          actionsConfigMap: {
            default: { max: 1000 },
            test: { max: 1 },
          },
        },
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(4);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(1);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 4,
        numberOfTriggeredActions: 1,
        triggeredActionsStatus: ActionsCompletion.PARTIAL,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        `Rule "rule-id-1" skipped scheduling action "action-1" because the maximum number of allowed actions for connector type test has been reached.`
      );

      expect(results).toHaveLength(1);
      expect(results).toEqual([getResult('action-1', '1', '111-111')]);
    });

    test('should correctly update last scheduled actions for alert when action is "onActiveAlert"', async () => {
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, 'default'>('1', {
        state: { test: true },
        meta: {},
      });
      alert.scheduleActions('default');
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0]] },
      });

      expect(alert.getLastScheduledActions()).toBeUndefined();
      expect(alert.hasScheduledActions()).toBe(true);
      await scheduler.getActionsToSchedule({
        activeAlerts: { '1': alert },
      });

      expect(alert.getLastScheduledActions()).toEqual({
        date: '1970-01-01T00:00:00.000Z',
        group: 'default',
      });
      expect(alert.hasScheduledActions()).toBe(false);
    });

    test('should correctly update last scheduled actions for alert', async () => {
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, 'default'>('1', {
        state: { test: true },
        meta: {},
      });
      alert.scheduleActions('default');
      const onThrottleIntervalAction: SanitizedRuleAction = {
        id: 'action-4',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '222-222',
      };

      expect(alert.getLastScheduledActions()).toBeUndefined();
      expect(alert.hasScheduledActions()).toBe(true);
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [onThrottleIntervalAction] },
      });

      await scheduler.getActionsToSchedule({
        activeAlerts: { '1': alert },
      });

      expect(alert.getLastScheduledActions()).toEqual({
        date: '1970-01-01T00:00:00.000Z',
        group: 'default',
        actions: { '222-222': { date: '1970-01-01T00:00:00.000Z' } },
      });
      expect(alert.hasScheduledActions()).toBe(false);
    });

    test('should clear lastScheduledActions', async () => {
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, 'default'>('1', {
        state: { test: true },
        meta: {},
      });

      const spy = jest.spyOn(alert, 'clearThrottlingLastScheduledActions');

      alert.scheduleActions('default');

      const onThrottleIntervalAction1: SanitizedRuleAction = {
        id: 'action-4',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '111-111',
      };
      const onThrottleIntervalAction2: SanitizedRuleAction = {
        id: 'action-4',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '222-222',
      };

      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [onThrottleIntervalAction1, onThrottleIntervalAction2] },
      });

      await scheduler.getActionsToSchedule({
        activeAlerts: { '1': alert },
      });
      expect(spy).toHaveBeenCalledTimes(2); // 2 actions
      expect(spy).nthCalledWith(1, ['111-111', '222-222']);
      expect(spy).nthCalledWith(2, ['111-111', '222-222']);
    });

    test('should skip creating actions to schedule when alert is delayed', async () => {
      // 2 per-alert actions * 2 alerts = 4 actions to schedule
      // but alert 2 is muted, so only actions for alert 1 should be scheduled

      alerts['2'].setStatus(ALERT_STATUS_DELAYED);

      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule,
      });
      const results = await scheduler.getActionsToSchedule({
        activeAlerts: alerts,
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenNthCalledWith(
        1,
        `skipping scheduling of actions for '2' in rule rule-label: alert is delayed`
      );

      expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toEqual(2);
      expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toEqual(2);
      expect(ruleRunMetricsStore.getStatusByConnectorType('test')).toEqual({
        numberOfGeneratedActions: 2,
        numberOfTriggeredActions: 2,
      });

      expect(results).toHaveLength(2);
      expect(results).toEqual([
        getResult('action-1', '1', '111-111'),
        getResult('action-2', '1', '222-222'),
      ]);

      // @ts-expect-error private variable
      expect(scheduler.skippedAlerts).toEqual({ '2': { reason: 'delayed' } });
    });
  });

  describe('micro-benchmarks', () => {
    // Regression guard: run this suite on main and on this branch and compare timings;
    // no code-path toggling needed for before/after comparison.
    const runTimingLoop = async <T>(
      fn: () => Promise<T>,
      iterations: number
    ): Promise<{ meanMs: number; medianMs: number }> => {
      const times: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await fn();
        times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);
      const meanMs = times.reduce((s, t) => s + t, 0) / times.length;
      const medianMs = times[Math.floor(times.length / 2)] ?? 0;
      return { meanMs, medianMs };
    };

    it('getActionsToSchedule with many alerts and snoozedInstances (regression guard)', async () => {
      const activeCount = 100;
      const recoveredCount = 20;
      const snoozedCount = 10;
      type AlertRecord = Record<
        string,
        Alert<AlertInstanceState, AlertInstanceContext, 'default' | 'other-group'>
      >;
      const activeAlerts: AlertRecord = Array.from({ length: activeCount }, (_, i) =>
        generateAlert({ id: i + 1, activeCount: 1 })
      ).reduce((acc, a) => ({ ...acc, ...a }), {} as AlertRecord);
      const recoveredAlerts = Array.from({ length: recoveredCount }, (_, i) =>
        generateRecoveredAlert({ id: activeCount + i + 1 })
      ).reduce((acc, a) => ({ ...acc, ...a }), {});
      const snoozedInstances = Array.from({ length: snoozedCount }, (_, i) => ({
        instanceId: String(i + 1),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }));
      snoozedInstances.forEach((entry, i) => {
        activeAlerts[String(i + 1)].setSnoozeConfig(entry);
      });
      alertsClient.getSummarizedAlerts.mockResolvedValue({
        all: { total: 0, data: [], count: 0 },
        new: { total: 0, data: [], count: 0 },
        ongoing: { total: 0, data: [], count: 0 },
        recovered: { total: 0, data: [], count: 0 },
      });

      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, snoozedInstances },
      });
      const { meanMs } = await runTimingLoop(
        () =>
          scheduler.getActionsToSchedule({
            activeAlerts,
            recoveredAlerts,
          }),
        5
      );
      expect(meanMs).toBeLessThan(2000);
    });
  });
});
