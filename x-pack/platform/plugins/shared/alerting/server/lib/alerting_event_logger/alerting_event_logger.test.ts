/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { IEvent, SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import { ActionsCompletion } from '@kbn/alerting-state-types';
import {
  AlertingEventLogger,
  ContextOpts,
  Context,
  RuleContext,
  initializeExecuteRecord,
  createExecuteTimeoutRecord,
  createAlertRecord,
  createActionExecuteRecord,
  updateEvent,
  executionType,
  initializeExecuteBackfillRecord,
  SavedObjects,
  updateEventWithRuleData,
} from './alerting_event_logger';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import {
  RecoveredActionGroup,
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
} from '../../types';
import { RuleRunMetrics } from '../rule_run_metrics_store';
import { EVENT_LOG_ACTIONS } from '../../plugin';
import { TaskRunnerTimerSpan } from '../../task_runner/task_runner_timer';
import { schema } from '@kbn/config-schema';
import { RULE_SAVED_OBJECT_TYPE } from '../..';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../../saved_objects';

const mockNow = '2020-01-01T02:00:00.000Z';
const eventLogger = eventLoggerMock.create();

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test',
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  category: 'test',
  producer: 'alerts',
  ruleTaskTimeout: '1m',
  validate: {
    params: schema.any(),
  },
  validLegacyConsumers: [],
};

const alert = {
  action: EVENT_LOG_ACTIONS.activeInstance,
  id: 'aaabbb',
  uuid: 'u-u-i-d',
  message: `.test-rule-type:123: 'my rule' active alert: 'aaabbb' in actionGroup: 'aGroup';`,
  group: 'aGroup',
  state: {
    start: '2020-01-01T02:00:00.000Z',
    end: '2020-01-01T03:00:00.000Z',
    duration: '2343252346',
  },
  flapping: false,
  maintenanceWindowIds: ['window-id1', 'window-id2'],
};

const action = {
  id: 'abc',
  typeId: '.email',
  alertId: '123',
  alertGroup: 'aGroup',
};

let runDate: Date;

describe('AlertingEventLogger', () => {
  let alertingEventLogger: AlertingEventLogger;
  let ruleData: RuleContext;
  let ruleContext: ContextOpts;
  let backfillContext: ContextOpts;
  let ruleContextWithScheduleDelay: Context;
  let backfillContextWithScheduleDelay: Context;
  let alertSO: SavedObjects;
  let adHocRunSO: SavedObjects;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(mockNow));
    runDate = new Date();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    ruleContext = {
      savedObjectId: '123',
      savedObjectType: RULE_SAVED_OBJECT_TYPE,
      spaceId: 'test-space',
      executionId: 'abcd-efgh-ijklmnop',
      taskScheduledAt: new Date('2020-01-01T00:00:00.000Z'),
    };

    backfillContext = {
      savedObjectId: 'def',
      savedObjectType: AD_HOC_RUN_SAVED_OBJECT_TYPE,
      spaceId: 'test-space',
      executionId: 'wxyz-efgh-ijklmnop',
      taskScheduledAt: new Date('2020-01-01T00:00:00.000Z'),
    };

    ruleContextWithScheduleDelay = { ...ruleContext, taskScheduleDelay: 7200000 };
    backfillContextWithScheduleDelay = { ...backfillContext, taskScheduleDelay: 7200000 };

    ruleData = {
      id: '123',
      type: ruleType,
      consumer: 'test-consumer',
      revision: 0,
    };
    alertSO = { id: '123', relation: 'primary', type: 'alert', typeId: 'test' };
    adHocRunSO = { id: 'def', relation: 'primary', type: 'ad_hoc_run_params' };
    alertingEventLogger = new AlertingEventLogger(eventLogger);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('initialize()', () => {
    test('should throw error if alertingEventLogger context is null', () => {
      expect(() =>
        alertingEventLogger.initialize({
          context: null as unknown as ContextOpts,
          runDate,
          ruleData,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger already initialized"`);

      expect(() =>
        alertingEventLogger.initialize({
          context: undefined as unknown as ContextOpts,
          runDate,
          ruleData,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger already initialized"`);

      expect(() =>
        alertingEventLogger.initialize({
          context: null as unknown as ContextOpts,
          runDate,
          type: executionType.BACKFILL,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger already initialized"`);

      expect(() =>
        alertingEventLogger.initialize({
          context: undefined as unknown as ContextOpts,
          runDate,
          type: executionType.BACKFILL,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger already initialized"`);
    });

    test('standard initialization should succeed if alertingEventLogger has not been initialized', () => {
      expect(() =>
        alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData })
      ).not.toThrow();
      expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    });

    test('backfill initialization should succeed if alertingEventLogger has not been initialized', () => {
      expect(() =>
        alertingEventLogger.initialize({
          context: backfillContext,
          runDate,
          type: executionType.BACKFILL,
        })
      ).not.toThrow();
      expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    });

    test('standard initialization should fail if alertingEventLogger has already been initialized', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      expect(() =>
        alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData })
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger already initialized"`);
    });

    test('backfill initialization should fail if alertingEventLogger has already been initialized', () => {
      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });
      expect(() =>
        alertingEventLogger.initialize({
          context: backfillContext,
          runDate,
          type: executionType.BACKFILL,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger already initialized"`);
    });

    test('standard initialization should fail if ruleData is not provided', () => {
      expect(() =>
        alertingEventLogger.initialize({ context: ruleContext, runDate })
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger requires rule data"`);
      expect(eventLogger.startTiming).not.toHaveBeenCalled();
    });

    test('standard initialization should call eventLogger.logEvent', () => {
      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);

      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });

      expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
      expect(eventLogger.logEvent).toHaveBeenCalledWith({
        ...event,
        event: {
          ...event.event,
          action: EVENT_LOG_ACTIONS.executeStart,
          start: runDate.toISOString(),
        },
        message: `rule execution start: "${ruleData.id}"`,
      });

      expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
      expect(eventLogger.startTiming).toHaveBeenCalledWith(event, new Date(mockNow));
    });

    test('backfill initialization should not call eventLogger.logEvent', () => {
      const event = initializeExecuteBackfillRecord(backfillContextWithScheduleDelay, [adHocRunSO]);

      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });

      expect(eventLogger.logEvent).not.toHaveBeenCalled();
      expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
      expect(eventLogger.startTiming).toHaveBeenCalledWith(event, new Date(mockNow));
    });

    test('standard initialization should correctly initialize the "execute" event', () => {
      mockEventLoggerStartTiming();

      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        event: {
          ...event.event,
          start: new Date(mockNow).toISOString(),
        },
      });
    });

    test('backfill initialization should correctly initialize the "execute" event', () => {
      mockEventLoggerStartTiming();

      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });

      const event = initializeExecuteBackfillRecord(backfillContextWithScheduleDelay, [adHocRunSO]);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        event: {
          ...event.event,
          start: new Date(mockNow).toISOString(),
        },
      });
    });
  });

  describe('addOrUpdateRuleData()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() => alertingEventLogger.addOrUpdateRuleData({})).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if updating rule data that has not been initialized', () => {
      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });

      expect(() =>
        alertingEventLogger.addOrUpdateRuleData({ name: 'new-name' })
      ).toThrowErrorMatchingInlineSnapshot(`"Cannot update rule data before it is initialized"`);
    });

    test('should update standard event with rule name correctly', () => {
      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.addOrUpdateRuleData({ name: 'my-super-cool-rule' });

      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        rule: {
          ...event.rule,
          name: 'my-super-cool-rule',
        },
      });
    });

    test('should update standard event with rule consumer correctly', () => {
      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.addOrUpdateRuleData({ consumer: 'my-new-consumer' });

      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              consumer: 'my-new-consumer',
            },
          },
        },
      });
    });

    test('should update backfill event with rule data correctly', () => {
      const event = initializeExecuteBackfillRecord(backfillContextWithScheduleDelay, [adHocRunSO]);

      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });
      alertingEventLogger.addOrUpdateRuleData({
        id: 'bbb',
        type: ruleType,
        name: 'rule-name',
        revision: 10,
        consumer: 'my-new-consumer',
      });

      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        rule: {
          ...event.rule,
          id: 'bbb',
          name: 'rule-name',
          category: 'test',
          license: 'basic',
          ruleset: 'alerts',
        },
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              consumer: 'my-new-consumer',
              revision: 10,
              rule_type_id: 'test',
            },
          },
          saved_objects: [
            // @ts-ignore
            ...event.kibana?.saved_objects,
            { id: 'bbb', type: 'alert', type_id: 'test', rel: 'primary' },
          ],
        },
      });
    });
  });

  describe('setExecutionSucceeded()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() =>
        alertingEventLogger.setExecutionSucceeded('')
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger not initialized"`);
    });

    test('should update execute event correctly for standard executions', () => {
      mockEventLoggerStartTiming();

      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.addOrUpdateRuleData({ name: 'my-super-cool-rule' });
      alertingEventLogger.setExecutionSucceeded('success!');

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        event: {
          ...event.event,
          start: new Date(mockNow).toISOString(),
          outcome: 'success',
        },
        rule: {
          ...event.rule,
          name: 'my-super-cool-rule',
        },
        kibana: {
          ...event.kibana,
          alerting: {
            outcome: 'success',
          },
        },
        message: 'success!',
      });
    });

    test('should update execute event correctly for backfill executions', () => {
      mockEventLoggerStartTiming();

      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });
      alertingEventLogger.addOrUpdateRuleData({
        id: 'bbb',
        type: ruleType,
        name: 'rule-name',
        revision: 10,
        consumer: 'my-new-consumer',
      });
      alertingEventLogger.setExecutionSucceeded('success!');

      const event = initializeExecuteBackfillRecord(backfillContextWithScheduleDelay, [adHocRunSO]);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        event: {
          ...event.event,
          start: new Date(mockNow).toISOString(),
          outcome: 'success',
        },
        rule: {
          ...event.rule,
          id: 'bbb',
          name: 'rule-name',
          category: 'test',
          license: 'basic',
          ruleset: 'alerts',
        },
        message: 'success!',
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              consumer: 'my-new-consumer',
              revision: 10,
              rule_type_id: 'test',
            },
          },
          alerting: {
            outcome: 'success',
          },
          saved_objects: [
            // @ts-ignore
            ...event.kibana?.saved_objects,
            { id: 'bbb', type: 'alert', type_id: 'test', rel: 'primary' },
          ],
        },
      });
    });
  });

  describe('setExecutionFailed()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() =>
        alertingEventLogger.setExecutionFailed('', '')
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger not initialized"`);
    });

    test('should update execute event correctly for standard executions', () => {
      mockEventLoggerStartTiming();

      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.setExecutionFailed('rule failed!', 'something went wrong!');

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        event: {
          ...event.event,
          start: new Date(mockNow).toISOString(),
          outcome: 'failure',
        },
        error: {
          message: 'something went wrong!',
        },
        kibana: {
          ...event.kibana,
          alerting: {
            outcome: 'failure',
          },
        },
        message: 'rule failed!',
      });
    });

    test('should update execute event correctly for backfill executions if error occurs after rule data is set', () => {
      mockEventLoggerStartTiming();

      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });
      alertingEventLogger.addOrUpdateRuleData({
        id: 'bbb',
        type: ruleType,
        name: 'rule-name',
        revision: 10,
        consumer: 'my-new-consumer',
      });
      alertingEventLogger.setExecutionFailed('rule failed!', 'something went wrong!');

      const event = initializeExecuteBackfillRecord(backfillContextWithScheduleDelay, [adHocRunSO]);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        event: {
          ...event.event,
          start: new Date(mockNow).toISOString(),
          outcome: 'failure',
        },
        rule: {
          ...event.rule,
          id: 'bbb',
          name: 'rule-name',
          category: 'test',
          license: 'basic',
          ruleset: 'alerts',
        },
        error: {
          message: 'something went wrong!',
        },
        message: 'rule failed!',
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              consumer: 'my-new-consumer',
              revision: 10,
              rule_type_id: 'test',
            },
          },
          alerting: {
            outcome: 'failure',
          },
          saved_objects: [
            // @ts-ignore
            ...event.kibana?.saved_objects,
            { id: 'bbb', type: 'alert', type_id: 'test', rel: 'primary' },
          ],
        },
      });
    });

    test('should update execute event correctly for backfill executions if error occurs before rule data is set', () => {
      mockEventLoggerStartTiming();

      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });
      alertingEventLogger.setExecutionFailed('rule failed!', 'something went wrong!');

      const event = initializeExecuteBackfillRecord(backfillContextWithScheduleDelay, [adHocRunSO]);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        event: {
          ...event.event,
          start: new Date(mockNow).toISOString(),
          outcome: 'failure',
        },
        error: {
          message: 'something went wrong!',
        },
        message: 'rule failed!',
        kibana: {
          ...event.kibana,
          alerting: {
            outcome: 'failure',
          },
        },
      });
    });
  });

  describe('setMaintenanceWindowIds()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() =>
        alertingEventLogger.setMaintenanceWindowIds([])
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger not initialized"`);
    });

    it('should update event maintenance window IDs correctly', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.setMaintenanceWindowIds([]);

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            maintenance_window_ids: [],
          },
        },
      });

      alertingEventLogger.setMaintenanceWindowIds(['test-id-1', 'test-id-2']);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            maintenance_window_ids: ['test-id-1', 'test-id-2'],
          },
        },
      });
    });
  });

  describe('logTimeout()', () => {
    test('should log timeout event for standard execution', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.logTimeout();

      const event = createExecuteTimeoutRecord(
        ruleContext,
        [alertSO],
        executionType.STANDARD,
        ruleData
      );

      expect(eventLogger.logEvent).toHaveBeenCalledWith(event);
    });

    test('should throw error if backfill fields provided when execution type is not backfill', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      expect(() =>
        alertingEventLogger.logTimeout({ backfill: { id: 'abc' } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot set backfill fields for non-backfill event log doc"`
      );
    });

    test('should log timeout event for backfill execution if called before rule data is set', () => {
      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });
      alertingEventLogger.logTimeout({
        backfill: {
          id: 'abc',
          start: '2024-03-13T00:00:00.000Z',
          interval: '1h',
        },
      });

      const event = createExecuteTimeoutRecord(
        backfillContextWithScheduleDelay,
        [adHocRunSO],
        executionType.BACKFILL
      );

      expect(eventLogger.logEvent).toHaveBeenCalledWith({
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              execution: {
                ...event.kibana?.alert?.rule?.execution,
                backfill: {
                  id: 'abc',
                  start: '2024-03-13T00:00:00.000Z',
                  interval: '1h',
                },
              },
            },
          },
        },
      });
    });
  });

  describe('logAlert()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() => alertingEventLogger.logAlert(alert)).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should correct log alerts for standard executions', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.logAlert(alert);

      const event = createAlertRecord(ruleContext, ruleData, [alertSO], alert);

      expect(eventLogger.logEvent).toHaveBeenCalledWith(event);
    });

    test('should throw if trying to log alerts for backfill executions when no rule data is set', () => {
      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });
      expect(() => alertingEventLogger.logAlert(alert)).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should correct log alerts for backfill executions', () => {
      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });
      alertingEventLogger.addOrUpdateRuleData({
        id: 'bbb',
        type: ruleType,
        name: 'rule-name',
        revision: 10,
        consumer: 'my-new-consumer',
      });
      alertingEventLogger.logAlert(alert);

      const event = createAlertRecord(
        backfillContext,
        ruleData,
        [adHocRunSO, { id: 'bbb', type: 'alert', typeId: 'test', relation: 'primary' }],
        alert
      );

      expect(eventLogger.logEvent).toHaveBeenCalledWith({
        ...event,
        rule: {
          ...event.rule,
          id: 'bbb',
          name: 'rule-name',
        },
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              consumer: 'my-new-consumer',
              revision: 10,
              rule_type_id: 'test',
            },
          },
        },
      });
    });
  });

  describe('logAction()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() => alertingEventLogger.logAction(action)).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw if trying to log action event when no rule data is set', () => {
      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });
      expect(() => alertingEventLogger.logAction(action)).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should log action event', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.logAction(action);

      const event = createActionExecuteRecord(ruleContext, ruleData, [alertSO], action);

      expect(eventLogger.logEvent).toHaveBeenCalledWith(event);
    });

    test('should log action event with uuid', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.logAction({ ...action, uuid: 'abcdefg' });

      const event = createActionExecuteRecord(ruleContext, ruleData, [alertSO], action);

      expect(eventLogger.logEvent).toHaveBeenCalledWith(event);
    });
  });

  describe('done()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() => alertingEventLogger.done({})).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if backfill fields provided when execution type is not backfill', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      expect(() =>
        alertingEventLogger.done({ backfill: { id: 'abc' } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot set backfill fields for non-backfill event log doc"`
      );
    });

    test('should log event if no status or metrics are provided', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({});

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(event);
    });

    test('should set fields from execution status if provided', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({
        status: { lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'), status: 'active' },
      });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      const loggedEvent = {
        ...event,
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'active',
          },
        },
      };
      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is error', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'error',
          error: {
            reason: RuleExecutionStatusErrorReasons.Execute,
            message: 'something went wrong',
          },
        },
      });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          outcome: 'failure',
          reason: RuleExecutionStatusErrorReasons.Execute,
        },
        error: {
          message: 'something went wrong',
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'error',
            outcome: 'failure',
          },
        },
        message: 'test:123: execution failed',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is error and uses "unknown" if no reason is provided', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'error',
          error: {
            reason: undefined as unknown as RuleExecutionStatusErrorReasons,
            message: 'something went wrong',
          },
        },
      });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          outcome: 'failure',
          reason: 'unknown',
        },
        error: {
          message: 'something went wrong',
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'error',
            outcome: 'failure',
          },
        },
        message: 'test:123: execution failed',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is error and does not overwrite existing error message', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'error',
          error: {
            reason: undefined as unknown as RuleExecutionStatusErrorReasons,
            message: 'something went wrong',
          },
        },
      });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      alertingEventLogger.setExecutionFailed(
        'i am an existing error message',
        'i am an existing error message!'
      );
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          outcome: 'failure',
          reason: 'unknown',
        },
        error: {
          message: 'i am an existing error message!',
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'error',
            outcome: 'failure',
          },
        },
        message: 'i am an existing error message',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is warning', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'warning',
          warning: {
            reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
            message: 'something funky happened',
          },
        },
      });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'warning',
            outcome: 'warning',
          },
        },
        message: 'something funky happened',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is warning and uses "unknown" if no reason is provided', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'warning',
          warning: {
            reason: undefined as unknown as RuleExecutionStatusWarningReasons,
            message: 'something funky happened',
          },
        },
      });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          reason: 'unknown',
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'warning',
            outcome: 'warning',
          },
        },
        message: 'something funky happened',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is warning and uses existing message if no message is provided', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'warning',
          warning: {
            reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
            message: undefined as unknown as string,
          },
        },
      });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      alertingEventLogger.setExecutionSucceeded('success!');
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          reason: 'maxExecutableActions',
          outcome: 'success',
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'warning',
            outcome: 'success',
          },
        },
        message: 'success!',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from backfill if provided', () => {
      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });
      alertingEventLogger.addOrUpdateRuleData({
        id: 'bbb',
        type: ruleType,
        name: 'rule-name',
        revision: 10,
        consumer: 'my-new-consumer',
      });

      alertingEventLogger.done({
        backfill: {
          id: 'abc',
          start: '2024-03-13T00:00:00.000Z',
          interval: '1h',
        },
      });

      const event = initializeExecuteBackfillRecord(backfillContextWithScheduleDelay, [adHocRunSO]);
      const loggedEvent = {
        ...event,
        rule: {
          ...event.rule,
          id: 'bbb',
          name: 'rule-name',
          category: 'test',
          license: 'basic',
          ruleset: 'alerts',
        },
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              consumer: 'my-new-consumer',
              revision: 10,
              rule_type_id: 'test',
              execution: {
                ...event.kibana?.alert?.rule?.execution,
                backfill: {
                  id: 'abc',
                  start: '2024-03-13T00:00:00.000Z',
                  interval: '1h',
                },
              },
            },
          },
          saved_objects: [
            // @ts-ignore
            ...event.kibana?.saved_objects,
            { id: 'bbb', type: 'alert', type_id: 'test', rel: 'primary' },
          ],
        },
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from backfill even when no rule data is provided', () => {
      alertingEventLogger.initialize({
        context: backfillContext,
        runDate,
        type: executionType.BACKFILL,
      });

      alertingEventLogger.done({
        backfill: {
          id: 'abc',
          start: '2024-03-13T00:00:00.000Z',
          interval: '1h',
        },
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'error',
          error: {
            reason: RuleExecutionStatusErrorReasons.Execute,
            message: 'something went wrong',
          },
        },
      });

      const event = initializeExecuteBackfillRecord(backfillContextWithScheduleDelay, [adHocRunSO]);
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          outcome: 'failure',
          reason: RuleExecutionStatusErrorReasons.Execute,
        },
        error: {
          message: 'something went wrong',
        },
        message: 'def: execution failed',
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              execution: {
                ...event.kibana?.alert?.rule?.execution,
                backfill: {
                  id: 'abc',
                  start: '2024-03-13T00:00:00.000Z',
                  interval: '1h',
                },
              },
            },
          },
          alerting: {
            outcome: 'failure',
            status: 'error',
          },
        },
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution metrics if provided', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({
        metrics: {
          numberOfTriggeredActions: 1,
          numberOfGeneratedActions: 2,
          numberOfActiveAlerts: 3,
          numberOfNewAlerts: 4,
          numberOfRecoveredAlerts: 5,
          numSearches: 6,
          numberOfDelayedAlerts: 7,
          esSearchDurationMs: 3300,
          totalSearchDurationMs: 10333,
          hasReachedAlertLimit: false,
          triggeredActionsStatus: ActionsCompletion.COMPLETE,
          hasReachedQueuedActionsLimit: false,
        },
      });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      const loggedEvent = {
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              execution: {
                ...event.kibana?.alert?.rule?.execution,
                metrics: {
                  number_of_triggered_actions: 1,
                  number_of_generated_actions: 2,
                  alert_counts: {
                    active: 3,
                    new: 4,
                    recovered: 5,
                  },
                  number_of_delayed_alerts: 7,
                  number_of_searches: 6,
                  es_search_duration_ms: 3300,
                  total_search_duration_ms: 10333,
                },
              },
            },
          },
        },
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution timings if provided', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({
        timings: {
          [TaskRunnerTimerSpan.StartTaskRun]: 10,
          [TaskRunnerTimerSpan.TotalRunDuration]: 20,
          [TaskRunnerTimerSpan.PrepareRule]: 30,
          [TaskRunnerTimerSpan.RuleTypeRun]: 40,
          [TaskRunnerTimerSpan.ProcessAlerts]: 50,
          [TaskRunnerTimerSpan.PersistAlerts]: 60,
          [TaskRunnerTimerSpan.TriggerActions]: 70,
          [TaskRunnerTimerSpan.ProcessRuleRun]: 80,
        },
      });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      const loggedEvent = {
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              execution: {
                ...event.kibana?.alert?.rule?.execution,
                metrics: {
                  claim_to_start_duration_ms: 10,
                  total_run_duration_ms: 20,
                  prepare_rule_duration_ms: 30,
                  rule_type_run_duration_ms: 40,
                  process_alerts_duration_ms: 50,
                  persist_alerts_duration_ms: 60,
                  trigger_actions_duration_ms: 70,
                  process_rule_duration_ms: 80,
                },
              },
            },
          },
        },
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution metrics and timings if both provided', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({
        metrics: {
          numberOfTriggeredActions: 1,
          numberOfGeneratedActions: 2,
          numberOfActiveAlerts: 3,
          numberOfNewAlerts: 4,
          numberOfRecoveredAlerts: 5,
          numSearches: 6,
          numberOfDelayedAlerts: 7,
          esSearchDurationMs: 3300,
          totalSearchDurationMs: 10333,
          hasReachedAlertLimit: false,
          triggeredActionsStatus: ActionsCompletion.COMPLETE,
          hasReachedQueuedActionsLimit: false,
        },
        timings: {
          [TaskRunnerTimerSpan.StartTaskRun]: 10,
          [TaskRunnerTimerSpan.TotalRunDuration]: 20,
          [TaskRunnerTimerSpan.PrepareRule]: 30,
          [TaskRunnerTimerSpan.RuleTypeRun]: 40,
          [TaskRunnerTimerSpan.ProcessAlerts]: 50,
          [TaskRunnerTimerSpan.PersistAlerts]: 60,
          [TaskRunnerTimerSpan.TriggerActions]: 70,
          [TaskRunnerTimerSpan.ProcessRuleRun]: 80,
        },
      });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      const loggedEvent = {
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              execution: {
                ...event.kibana?.alert?.rule?.execution,
                metrics: {
                  number_of_triggered_actions: 1,
                  number_of_generated_actions: 2,
                  alert_counts: {
                    active: 3,
                    new: 4,
                    recovered: 5,
                  },
                  number_of_delayed_alerts: 7,
                  number_of_searches: 6,
                  es_search_duration_ms: 3300,
                  total_search_duration_ms: 10333,
                  claim_to_start_duration_ms: 10,
                  total_run_duration_ms: 20,
                  prepare_rule_duration_ms: 30,
                  rule_type_run_duration_ms: 40,
                  process_alerts_duration_ms: 50,
                  persist_alerts_duration_ms: 60,
                  trigger_actions_duration_ms: 70,
                  process_rule_duration_ms: 80,
                },
              },
            },
          },
        },
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields to 0 execution metrics are provided but undefined', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.done({
        metrics: {} as unknown as RuleRunMetrics,
      });

      const event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      const loggedEvent = {
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              execution: {
                ...event.kibana?.alert?.rule?.execution,
                metrics: {
                  number_of_triggered_actions: 0,
                  number_of_generated_actions: 0,
                  alert_counts: {
                    active: 0,
                    new: 0,
                    recovered: 0,
                  },
                  number_of_delayed_alerts: 0,
                  number_of_searches: 0,
                  es_search_duration_ms: 0,
                  total_search_duration_ms: 0,
                },
              },
            },
          },
        },
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('overwrites the message when the final status is error', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.setExecutionSucceeded('success message');

      expect(alertingEventLogger.getEvent()!.message).toBe('success message');

      alertingEventLogger.done({
        status: {
          status: 'error',
          lastExecutionDate: new Date(),
          error: { reason: RuleExecutionStatusErrorReasons.Execute, message: 'failed execution' },
        },
      });

      expect(alertingEventLogger.getEvent()!.message).toBe('test:123: execution failed');
    });

    test('does not overwrites the message when there is already a failure message', () => {
      alertingEventLogger.initialize({ context: ruleContext, runDate, ruleData });
      alertingEventLogger.setExecutionFailed('first failure message', 'failure error message');

      expect(alertingEventLogger.getEvent()!.message).toBe('first failure message');

      alertingEventLogger.done({
        status: {
          status: 'error',
          lastExecutionDate: new Date(),
          error: {
            reason: RuleExecutionStatusErrorReasons.Execute,
            message: 'second failure execution',
          },
        },
      });

      expect(alertingEventLogger.getEvent()!.message).toBe('first failure message');
    });
  });
});

describe('helper functions', () => {
  let ruleData: RuleContext;
  let ruleDataWithName: RuleContext;
  let ruleContext: ContextOpts;
  let backfillContext: ContextOpts;
  let ruleContextWithScheduleDelay: Context;
  let backfillContextWithScheduleDelay: Context;
  let alertSO: SavedObjects;
  let adHocRunSO: SavedObjects;
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    ruleContext = {
      savedObjectId: '123',
      savedObjectType: RULE_SAVED_OBJECT_TYPE,
      spaceId: 'test-space',
      executionId: 'abcd-efgh-ijklmnop',
      taskScheduledAt: new Date('2020-01-01T00:00:00.000Z'),
    };

    backfillContext = {
      savedObjectId: 'def',
      savedObjectType: AD_HOC_RUN_SAVED_OBJECT_TYPE,
      spaceId: 'test-space',
      executionId: 'wxyz-efgh-ijklmnop',
      taskScheduledAt: new Date('2020-01-01T00:00:00.000Z'),
    };

    ruleContextWithScheduleDelay = { ...ruleContext, taskScheduleDelay: 7200000 };
    backfillContextWithScheduleDelay = { ...backfillContext, taskScheduleDelay: 7200000 };

    ruleData = {
      id: '123',
      type: ruleType,
      consumer: 'test-consumer',
      revision: 0,
    };
    ruleDataWithName = { ...ruleData, name: 'my-super-cool-rule' };
    alertSO = { id: '123', relation: 'primary', type: 'alert', typeId: 'test' };
    adHocRunSO = { id: 'def', relation: 'primary', type: 'ad_hoc_run_params' };
  });

  describe('initializeExecuteRecord', () => {
    test('should populate initial set of fields in event log record', () => {
      const record = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);

      expect(record.event).toBeDefined();
      expect(record.kibana).toBeDefined();
      expect(record.kibana?.alert).toBeDefined();
      expect(record.kibana?.alert?.rule).toBeDefined();
      expect(record.kibana?.alert?.rule?.execution).toBeDefined();
      expect(record.kibana?.saved_objects).toBeDefined();
      expect(record.kibana?.space_ids).toBeDefined();
      expect(record.kibana?.task).toBeDefined();
      expect(record.rule).toBeDefined();

      // these fields should be explicitly set
      expect(record.event?.action).toEqual('execute');
      expect(record.event?.kind).toEqual('alert');
      expect(record.event?.category).toEqual([ruleData.type?.producer]);
      expect(record.kibana?.alert?.rule?.rule_type_id).toEqual(ruleData.type?.id);
      expect(record.kibana?.alert?.rule?.consumer).toEqual(ruleData.consumer);
      expect(record.kibana?.alert?.rule?.execution?.uuid).toEqual(
        ruleContextWithScheduleDelay.executionId
      );
      expect(record.kibana?.saved_objects).toEqual([
        {
          id: alertSO.id,
          type: alertSO.type,
          type_id: alertSO.typeId,
          rel: SAVED_OBJECT_REL_PRIMARY,
        },
      ]);
      expect(record.kibana?.space_ids).toEqual([ruleContextWithScheduleDelay.spaceId]);
      expect(record.kibana?.task?.scheduled).toEqual(
        ruleContextWithScheduleDelay.taskScheduledAt.toISOString()
      );
      expect(record.kibana?.task?.schedule_delay).toEqual(
        ruleContextWithScheduleDelay.taskScheduleDelay * 1000000
      );
      expect(record?.rule?.id).toEqual(ruleData.id);
      expect(record?.rule?.license).toEqual(ruleData.type?.minimumLicenseRequired);
      expect(record?.rule?.category).toEqual(ruleData.type?.id);
      expect(record?.rule?.ruleset).toEqual(ruleData.type?.producer);

      // these fields should not be set by this function
      expect(record['@timestamp']).toBeUndefined();
      expect(record.event?.provider).toBeUndefined();
      expect(record.event?.start).toBeUndefined();
      expect(record.event?.outcome).toBeUndefined();
      expect(record.event?.end).toBeUndefined();
      expect(record.event?.duration).toBeUndefined();
      expect(record.kibana?.alert?.rule?.execution?.metrics).toBeUndefined();
      expect(record.kibana?.alerting).toBeUndefined();
      expect(record.kibana?.server_uuid).toBeUndefined();
      expect(record.kibana?.version).toBeUndefined();
      expect(record?.rule?.name).toBeUndefined();
      expect(record?.message).toBeUndefined();
      expect(record?.ecs).toBeUndefined();
    });

    test('should populate initial set of fields in event log record when execution type is BACKFILL', () => {
      const record = initializeExecuteBackfillRecord(backfillContextWithScheduleDelay, [
        adHocRunSO,
      ]);

      expect(record.event).toBeDefined();
      expect(record.kibana).toBeDefined();
      expect(record.kibana?.alert).toBeDefined();
      expect(record.kibana?.alert?.rule).toBeDefined();
      expect(record.kibana?.alert?.rule?.execution).toBeDefined();
      expect(record.kibana?.saved_objects).toBeDefined();
      expect(record.kibana?.space_ids).toBeDefined();
      expect(record.kibana?.task).toBeDefined();
      expect(record.rule).toBeDefined();

      // these fields should be explicitly set
      expect(record.event?.action).toEqual('execute-backfill');
      expect(record.event?.kind).toEqual('alert');
      expect(record.kibana?.alert?.rule?.execution?.uuid).toEqual(
        backfillContextWithScheduleDelay.executionId
      );
      expect(record.kibana?.saved_objects).toEqual([
        {
          id: adHocRunSO.id,
          type: adHocRunSO.type,
          rel: SAVED_OBJECT_REL_PRIMARY,
        },
      ]);
      expect(record.kibana?.space_ids).toEqual([backfillContextWithScheduleDelay.spaceId]);
      expect(record.kibana?.task?.scheduled).toEqual(
        backfillContextWithScheduleDelay.taskScheduledAt.toISOString()
      );
      expect(record.kibana?.task?.schedule_delay).toEqual(
        backfillContextWithScheduleDelay.taskScheduleDelay * 1000000
      );

      // these fields should not be set by this function
      expect(record['@timestamp']).toBeUndefined();
      expect(record.event?.provider).toBeUndefined();
      expect(record.event?.start).toBeUndefined();
      expect(record.event?.outcome).toBeUndefined();
      expect(record.event?.end).toBeUndefined();
      expect(record.event?.duration).toBeUndefined();
      expect(record.kibana?.alert?.rule?.execution?.metrics).toBeUndefined();
      expect(record.kibana?.alerting).toBeUndefined();
      expect(record.kibana?.server_uuid).toBeUndefined();
      expect(record.kibana?.version).toBeUndefined();
      expect(record?.rule?.name).toBeUndefined();
      expect(record?.message).toBeUndefined();
      expect(record?.ecs).toBeUndefined();
      expect(record.kibana?.alert?.rule?.rule_type_id).toBeUndefined();
      expect(record.kibana?.alert?.rule?.consumer).toBeUndefined();
      expect(record?.rule?.id).toBeUndefined();
      expect(record?.rule?.license).toBeUndefined();
      expect(record?.rule?.category).toBeUndefined();
      expect(record?.rule?.ruleset).toBeUndefined();
    });
  });

  describe('createExecuteTimeoutRecord', () => {
    test('should populate expected fields in event log record', () => {
      const record = createExecuteTimeoutRecord(
        ruleContextWithScheduleDelay,
        [alertSO],
        executionType.STANDARD,
        ruleDataWithName
      );

      expect(record.event).toBeDefined();
      expect(record.kibana).toBeDefined();
      expect(record.kibana?.alert).toBeDefined();
      expect(record.kibana?.alert?.rule).toBeDefined();
      expect(record.kibana?.alert?.rule?.execution).toBeDefined();
      expect(record.kibana?.saved_objects).toBeDefined();
      expect(record.kibana?.space_ids).toBeDefined();
      expect(record.rule).toBeDefined();

      // these fields should be explicitly set
      expect(record.event?.action).toEqual('execute-timeout');
      expect(record.event?.kind).toEqual('alert');
      expect(record.message).toEqual(
        `rule: test:123: 'my-super-cool-rule' execution cancelled due to timeout - exceeded rule type timeout of 1m`
      );
      expect(record.event?.category).toEqual([ruleDataWithName.type?.producer]);
      expect(record.kibana?.alert?.rule?.rule_type_id).toEqual(ruleDataWithName.type?.id);
      expect(record.kibana?.alert?.rule?.consumer).toEqual(ruleDataWithName.consumer);
      expect(record.kibana?.alert?.rule?.execution?.uuid).toEqual(
        ruleContextWithScheduleDelay.executionId
      );
      expect(record.kibana?.saved_objects).toEqual([
        {
          id: alertSO.id,
          type: alertSO.type,
          type_id: alertSO.typeId,
          rel: SAVED_OBJECT_REL_PRIMARY,
        },
      ]);
      expect(record.kibana?.space_ids).toEqual([ruleContextWithScheduleDelay.spaceId]);
      expect(record?.rule?.id).toEqual(ruleDataWithName.id);
      expect(record?.rule?.license).toEqual(ruleDataWithName.type?.minimumLicenseRequired);
      expect(record?.rule?.category).toEqual(ruleDataWithName.type?.id);
      expect(record?.rule?.ruleset).toEqual(ruleDataWithName.type?.producer);
      expect(record?.rule?.name).toEqual(ruleDataWithName.name);

      // these fields should not be set by this function
      expect(record['@timestamp']).toBeUndefined();
      expect(record.event?.provider).toBeUndefined();
      expect(record.event?.start).toBeUndefined();
      expect(record.event?.outcome).toBeUndefined();
      expect(record.event?.end).toBeUndefined();
      expect(record.event?.duration).toBeUndefined();
      expect(record.kibana?.alert?.rule?.execution?.metrics).toBeUndefined();
      expect(record.kibana?.alerting).toBeUndefined();
      expect(record.kibana?.server_uuid).toBeUndefined();
      expect(record.kibana?.task).toBeUndefined();
      expect(record.kibana?.version).toBeUndefined();
      expect(record?.ecs).toBeUndefined();
    });
  });

  describe('createAlertRecord', () => {
    test('should populate expected fields in event log record', () => {
      const record = createAlertRecord(
        ruleContextWithScheduleDelay,
        ruleDataWithName,
        [alertSO],
        alert
      );

      // these fields should be explicitly set
      expect(record.event?.action).toEqual('active-instance');
      expect(record.event?.kind).toEqual('alert');
      expect(record.event?.category).toEqual([ruleDataWithName.type?.producer]);
      expect(record.event?.start).toEqual(alert.state.start);
      expect(record.event?.end).toEqual(alert.state.end);
      expect(record.event?.duration).toEqual(alert.state.duration);
      expect(record.message).toEqual(
        `.test-rule-type:123: 'my rule' active alert: 'aaabbb' in actionGroup: 'aGroup';`
      );
      expect(record.kibana?.alert?.rule?.rule_type_id).toEqual(ruleDataWithName.type?.id);
      expect(record.kibana?.alert?.rule?.consumer).toEqual(ruleDataWithName.consumer);
      expect(record.kibana?.alert?.rule?.execution?.uuid).toEqual(
        ruleContextWithScheduleDelay.executionId
      );
      expect(record.kibana?.alert?.maintenance_window_ids).toEqual(alert.maintenanceWindowIds);
      expect(record.kibana?.alerting?.instance_id).toEqual(alert.id);
      expect(record.kibana?.alerting?.action_group_id).toEqual(alert.group);
      expect(record.kibana?.saved_objects).toEqual([
        {
          id: ruleContextWithScheduleDelay.savedObjectId,
          type: ruleContextWithScheduleDelay.savedObjectType,
          type_id: ruleDataWithName.type?.id,
          rel: SAVED_OBJECT_REL_PRIMARY,
        },
      ]);
      expect(record.kibana?.space_ids).toEqual([ruleContextWithScheduleDelay.spaceId]);
      expect(record?.rule?.id).toEqual(ruleDataWithName.id);
      expect(record?.rule?.license).toEqual(ruleDataWithName.type?.minimumLicenseRequired);
      expect(record?.rule?.category).toEqual(ruleDataWithName.type?.id);
      expect(record?.rule?.ruleset).toEqual(ruleDataWithName.type?.producer);
      expect(record?.rule?.name).toEqual(ruleDataWithName.name);

      // these fields should not be set by this function
      expect(record['@timestamp']).toBeUndefined();
      expect(record.event?.provider).toBeUndefined();
      expect(record.event?.outcome).toBeUndefined();
      expect(record.kibana?.alert?.rule?.execution?.metrics).toBeUndefined();
      expect(record.kibana?.alert?.uuid).toBe(alert.uuid);
      expect(record.kibana?.server_uuid).toBeUndefined();
      expect(record.kibana?.task).toBeUndefined();
      expect(record.kibana?.version).toBeUndefined();
      expect(record?.ecs).toBeUndefined();
    });
  });

  describe('createActionExecuteRecord', () => {
    test('should populate expected fields in event log record', () => {
      const record = createActionExecuteRecord(
        ruleContextWithScheduleDelay,
        ruleDataWithName,
        [alertSO],
        action
      );

      expect(record.event).toBeDefined();
      expect(record.kibana).toBeDefined();
      expect(record.kibana?.alert).toBeDefined();
      expect(record.kibana?.alert?.rule).toBeDefined();
      expect(record.kibana?.alert?.rule?.execution).toBeDefined();
      expect(record.kibana?.saved_objects).toBeDefined();
      expect(record.kibana?.space_ids).toBeDefined();
      expect(record.rule).toBeDefined();

      // these fields should be explicitly set
      expect(record.event?.action).toEqual('execute-action');
      expect(record.event?.kind).toEqual('alert');
      expect(record.event?.category).toEqual([ruleDataWithName.type?.producer]);
      expect(record.message).toEqual(
        `alert: test:123: 'my-super-cool-rule' instanceId: '123' scheduled actionGroup: 'aGroup' action: .email:abc`
      );
      expect(record.kibana?.alert?.rule?.rule_type_id).toEqual(ruleDataWithName.type?.id);
      expect(record.kibana?.alert?.rule?.consumer).toEqual(ruleDataWithName.consumer);
      expect(record.kibana?.alert?.rule?.execution?.uuid).toEqual(
        ruleContextWithScheduleDelay.executionId
      );
      expect(record.kibana?.alerting?.instance_id).toEqual(action.alertId);
      expect(record.kibana?.alerting?.action_group_id).toEqual(action.alertGroup);
      expect(record.kibana?.saved_objects).toEqual([
        {
          id: ruleContextWithScheduleDelay.savedObjectId,
          type: ruleContextWithScheduleDelay.savedObjectType,
          type_id: ruleDataWithName.type?.id,
          rel: SAVED_OBJECT_REL_PRIMARY,
        },
        {
          id: action.id,
          type: 'action',
          type_id: action.typeId,
        },
      ]);
      expect(record.kibana?.space_ids).toEqual([ruleContextWithScheduleDelay.spaceId]);
      expect(record?.rule?.id).toEqual(ruleDataWithName.id);
      expect(record?.rule?.license).toEqual(ruleDataWithName.type?.minimumLicenseRequired);
      expect(record?.rule?.category).toEqual(ruleDataWithName.type?.id);
      expect(record?.rule?.ruleset).toEqual(ruleDataWithName.type?.producer);
      expect(record?.rule?.name).toEqual(ruleDataWithName.name);

      // these fields should not be set by this function
      expect(record['@timestamp']).toBeUndefined();
      expect(record.event?.provider).toBeUndefined();
      expect(record.event?.start).toBeUndefined();
      expect(record.event?.outcome).toBeUndefined();
      expect(record.event?.end).toBeUndefined();
      expect(record.event?.duration).toBeUndefined();
      expect(record.kibana?.alert?.rule?.execution?.metrics).toBeUndefined();
      expect(record.kibana?.server_uuid).toBeUndefined();
      expect(record.kibana?.task).toBeUndefined();
      expect(record.kibana?.version).toBeUndefined();
      expect(record?.ecs).toBeUndefined();
    });
  });

  describe('updateEvent', () => {
    let event: IEvent;
    let expectedEvent: IEvent;
    beforeEach(() => {
      event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      expectedEvent = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
    });

    test('throws error if event is null', () => {
      expect(() => updateEvent(null as unknown as IEvent, {})).toThrowErrorMatchingInlineSnapshot(
        `"Cannot update event because it is not initialized."`
      );
    });

    test('throws error if event is undefined', () => {
      expect(() =>
        updateEvent(undefined as unknown as IEvent, {})
      ).toThrowErrorMatchingInlineSnapshot(`"Cannot update event because it is not initialized."`);
    });

    test('updates event message if provided', () => {
      updateEvent(event, { message: 'tell me something good' });
      expect(event).toEqual({
        ...expectedEvent,
        message: 'tell me something good',
      });
    });

    test('updates event outcome if provided', () => {
      updateEvent(event, { outcome: 'yay' });
      expect(event).toEqual({
        ...expectedEvent,
        event: {
          ...expectedEvent?.event,
          outcome: 'yay',
        },
      });
    });

    test('updates event error if provided', () => {
      updateEvent(event, { error: 'oh no' });
      expect(event).toEqual({
        ...expectedEvent,
        error: {
          message: 'oh no',
        },
      });
    });

    test('updates event status if provided', () => {
      updateEvent(event, { status: 'ok' });
      expect(event).toEqual({
        ...expectedEvent,
        kibana: {
          ...expectedEvent?.kibana,
          alerting: {
            status: 'ok',
          },
        },
      });
    });

    test('updates event reason if provided', () => {
      updateEvent(event, { reason: 'my-reason' });
      expect(event).toEqual({
        ...expectedEvent,
        event: {
          ...expectedEvent?.event,
          reason: 'my-reason',
        },
      });
    });

    test('updates all fields if provided', () => {
      updateEvent(event, {
        message: 'tell me something good',
        outcome: 'yay',
        error: 'oh no',
        status: 'ok',
        reason: 'my-reason',
      });
      expect(event).toEqual({
        ...expectedEvent,
        message: 'tell me something good',
        kibana: {
          ...expectedEvent?.kibana,
          alerting: {
            status: 'ok',
          },
        },
        event: {
          ...expectedEvent?.event,
          outcome: 'yay',
          reason: 'my-reason',
        },
        error: {
          message: 'oh no',
        },
      });
    });
  });

  describe('updateEventWithRuleData', () => {
    let event: IEvent;
    let expectedEvent: IEvent;
    beforeEach(() => {
      event = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
      expectedEvent = initializeExecuteRecord(ruleContextWithScheduleDelay, ruleData, [alertSO]);
    });

    test('throws error if event is null', () => {
      expect(() =>
        updateEventWithRuleData(null as unknown as IEvent, {})
      ).toThrowErrorMatchingInlineSnapshot(`"Cannot update event because it is not initialized."`);
    });

    test('throws error if event is undefined', () => {
      expect(() =>
        updateEventWithRuleData(undefined as unknown as IEvent, {})
      ).toThrowErrorMatchingInlineSnapshot(`"Cannot update event because it is not initialized."`);
    });

    test('updates event rule name if provided', () => {
      updateEventWithRuleData(event, { ruleName: 'test rule' });
      expect(event).toEqual({
        ...expectedEvent,
        rule: {
          ...expectedEvent?.rule,
          name: 'test rule',
        },
      });
    });

    test('updates event rule id if provided', () => {
      updateEventWithRuleData(event, { ruleId: 'abcdefghijklmnop' });
      expect(event).toEqual({
        ...expectedEvent,
        rule: {
          ...expectedEvent?.rule,
          id: 'abcdefghijklmnop',
        },
      });
    });

    test('updates event rule consumer if provided', () => {
      updateEventWithRuleData(event, { consumer: 'not-the-original-consumer' });
      expect(event).toEqual({
        ...expectedEvent,
        kibana: {
          ...expectedEvent?.kibana,
          alert: {
            ...expectedEvent?.kibana?.alert,
            rule: {
              ...expectedEvent?.kibana?.alert?.rule,
              consumer: 'not-the-original-consumer',
            },
          },
        },
      });
    });

    test('updates event rule ruleTypeId if provided', () => {
      updateEventWithRuleData(event, {
        ruleType: { ...ruleType, id: 'not-the-original-rule-type-id' },
      });
      expect(event).toEqual({
        ...expectedEvent,
        kibana: {
          ...expectedEvent?.kibana,
          alert: {
            ...expectedEvent?.kibana?.alert,
            rule: {
              ...expectedEvent?.kibana?.alert?.rule,
              rule_type_id: 'not-the-original-rule-type-id',
            },
          },
        },
        rule: {
          ...expectedEvent?.rule,
          category: 'not-the-original-rule-type-id',
        },
      });
    });

    test('updates event rule revision if provided', () => {
      updateEventWithRuleData(event, { revision: 500 });
      expect(event).toEqual({
        ...expectedEvent,
        kibana: {
          ...expectedEvent?.kibana,
          alert: {
            ...expectedEvent?.kibana?.alert,
            rule: {
              ...expectedEvent?.kibana?.alert?.rule,
              revision: 500,
            },
          },
        },
      });
    });

    test('updates event rule saved object if provided', () => {
      updateEventWithRuleData(event, {
        savedObjects: [
          { id: 'xyz', relation: 'primary', type: 'alert', typeId: 'test1' },
          { id: '111', type: 'action', namespace: 'custom' },
          { id: 'mmm', type: 'ad_hoc_rule_run_params' },
        ],
      });
      expect(event).toEqual({
        ...expectedEvent,
        kibana: {
          ...expectedEvent?.kibana,
          saved_objects: [
            { id: 'xyz', rel: 'primary', type: 'alert', type_id: 'test1' },
            { id: '111', type: 'action', namespace: 'custom' },
            { id: 'mmm', type: 'ad_hoc_rule_run_params' },
          ],
        },
      });
    });

    test('updates all fields if provided', () => {
      updateEventWithRuleData(event, {
        ruleName: 'test rule',
        ruleId: 'abcdefghijklmnop',
        consumer: 'not-the-original-consumer',
        ruleType: { ...ruleType, id: 'not-the-original-rule-type-id' },
        revision: 500,
        savedObjects: [
          { id: 'xyz', relation: 'primary', type: 'alert', typeId: 'test1' },
          { id: '111', type: 'action', namespace: 'custom' },
          { id: 'mmm', type: 'ad_hoc_rule_run_params' },
        ],
      });
      expect(event).toEqual({
        ...expectedEvent,
        rule: {
          ...expectedEvent?.rule,
          name: 'test rule',
          id: 'abcdefghijklmnop',
          category: 'not-the-original-rule-type-id',
        },
        kibana: {
          ...expectedEvent?.kibana,
          alert: {
            ...expectedEvent?.kibana?.alert,
            rule: {
              ...expectedEvent?.kibana?.alert?.rule,
              consumer: 'not-the-original-consumer',
              revision: 500,
              rule_type_id: 'not-the-original-rule-type-id',
            },
          },
          saved_objects: [
            { id: 'xyz', rel: 'primary', type: 'alert', type_id: 'test1' },
            { id: '111', type: 'action', namespace: 'custom' },
            { id: 'mmm', type: 'ad_hoc_rule_run_params' },
          ],
        },
      });
    });
  });
});

function mockEventLoggerStartTiming() {
  eventLogger.startTiming.mockImplementationOnce((event: IEvent, startTime?: Date) => {
    if (event == null) return;
    event.event = event.event || {};

    const start = startTime ?? new Date();
    event.event.start = start.toISOString();
  });
}
