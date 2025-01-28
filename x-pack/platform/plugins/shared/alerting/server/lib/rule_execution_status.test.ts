/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ActionsCompletion } from '@kbn/alerting-state-types';
import { RuleExecutionStatusErrorReasons, RuleExecutionStatusWarningReasons } from '../types';
import {
  executionStatusFromState,
  executionStatusFromError,
  ruleExecutionStatusToRaw,
  ruleExecutionStatusFromRaw,
} from './rule_execution_status';
import { ErrorWithReason } from './error_with_reason';
import { translations } from '../constants/translations';
import { RuleRunMetrics, RuleRunMetricsStore } from './rule_run_metrics_store';
import { RuleResultService } from '../monitoring/rule_result_service';

const MockLogger = loggingSystemMock.create().get();
const executionMetrics = {
  numSearches: 1,
  esSearchDurationMs: 10,
  totalSearchDurationMs: 20,
  numberOfTriggeredActions: 32,
  numberOfGeneratedActions: 11,
  numberOfActiveAlerts: 2,
  numberOfNewAlerts: 3,
  numberOfRecoveredAlerts: 13,
  numberOfDelayedAlerts: 7,
  hasReachedAlertLimit: false,
  triggeredActionsStatus: ActionsCompletion.COMPLETE,
  hasReachedQueuedActionsLimit: false,
};

describe('RuleExecutionStatus', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  function testExpectedMetrics(received: RuleRunMetrics, expected: RuleRunMetrics) {
    expect(received.numSearches).toEqual(expected.numSearches);
    expect(received.totalSearchDurationMs).toEqual(expected.totalSearchDurationMs);
    expect(received.esSearchDurationMs).toEqual(expected.esSearchDurationMs);
    expect(received.numberOfTriggeredActions).toEqual(expected.numberOfTriggeredActions);
    expect(received.numberOfGeneratedActions).toEqual(expected.numberOfGeneratedActions);
    expect(received.numberOfActiveAlerts).toEqual(expected.numberOfActiveAlerts);
    expect(received.numberOfRecoveredAlerts).toEqual(expected.numberOfRecoveredAlerts);
    expect(received.numberOfNewAlerts).toEqual(expected.numberOfNewAlerts);
    expect(received.hasReachedAlertLimit).toEqual(expected.hasReachedAlertLimit);
    expect(received.triggeredActionsStatus).toEqual(expected.triggeredActionsStatus);
    expect(received.hasReachedQueuedActionsLimit).toEqual(expected.hasReachedQueuedActionsLimit);
  }

  describe('executionStatusFromState()', () => {
    test('empty task state', () => {
      const emptyRuleRunState = new RuleRunMetricsStore().getMetrics();
      const { status, metrics } = executionStatusFromState({
        stateWithMetrics: { metrics: emptyRuleRunState },
        ruleResultService: new RuleResultService(),
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.status).toBe('ok');
      expect(status.error).toBe(undefined);
      expect(status.warning).toBe(undefined);

      testExpectedMetrics(metrics!, emptyRuleRunState);
    });

    test('task state with no instances', () => {
      const { status, metrics } = executionStatusFromState({
        stateWithMetrics: {
          alertInstances: {},
          metrics: executionMetrics,
        },
        ruleResultService: new RuleResultService(),
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.status).toBe('ok');
      expect(status.error).toBe(undefined);
      expect(status.warning).toBe(undefined);

      testExpectedMetrics(metrics!, executionMetrics);
    });

    test('task state with one instance', () => {
      const { status, metrics } = executionStatusFromState({
        stateWithMetrics: {
          alertInstances: { a: {} },
          metrics: executionMetrics,
        },
        ruleResultService: new RuleResultService(),
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.status).toBe('active');
      expect(status.error).toBe(undefined);
      expect(status.warning).toBe(undefined);

      testExpectedMetrics(metrics!, executionMetrics);
    });

    test('task state with max executable actions warning', () => {
      const { status, metrics } = executionStatusFromState({
        stateWithMetrics: {
          alertInstances: { a: {} },
          metrics: { ...executionMetrics, triggeredActionsStatus: ActionsCompletion.PARTIAL },
        },
        ruleResultService: new RuleResultService(),
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.warning).toEqual({
        message: translations.taskRunner.warning.maxExecutableActions,
        reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
      });
      expect(status.status).toBe('warning');
      expect(status.error).toBe(undefined);

      testExpectedMetrics(metrics!, {
        ...executionMetrics,
        triggeredActionsStatus: ActionsCompletion.PARTIAL,
      });
    });

    test('task state with max queued actions warning', () => {
      const { status, metrics } = executionStatusFromState({
        stateWithMetrics: {
          alertInstances: { a: {} },
          metrics: {
            ...executionMetrics,
            triggeredActionsStatus: ActionsCompletion.PARTIAL,
            hasReachedQueuedActionsLimit: true,
          },
        },
        ruleResultService: new RuleResultService(),
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.warning).toEqual({
        message: translations.taskRunner.warning.maxQueuedActions,
        reason: RuleExecutionStatusWarningReasons.MAX_QUEUED_ACTIONS,
      });
      expect(status.status).toBe('warning');
      expect(status.error).toBe(undefined);

      testExpectedMetrics(metrics!, {
        ...executionMetrics,
        triggeredActionsStatus: ActionsCompletion.PARTIAL,
        hasReachedQueuedActionsLimit: true,
      });
    });

    test('task state with max alerts warning', () => {
      const { status, metrics } = executionStatusFromState({
        stateWithMetrics: {
          alertInstances: { a: {} },
          metrics: { ...executionMetrics, hasReachedAlertLimit: true },
        },
        ruleResultService: new RuleResultService(),
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.warning).toEqual({
        message: translations.taskRunner.warning.maxAlerts,
        reason: RuleExecutionStatusWarningReasons.MAX_ALERTS,
      });
      expect(status.status).toBe('warning');
      expect(status.error).toBe(undefined);

      testExpectedMetrics(metrics!, {
        ...executionMetrics,
        hasReachedAlertLimit: true,
      });
    });

    test('task state with lastRun error', () => {
      const ruleResultService = new RuleResultService();
      const lastRunSetters = ruleResultService.getLastRunSetters();
      lastRunSetters.addLastRunError('an error');

      const { status } = executionStatusFromState({
        stateWithMetrics: {
          alertInstances: {},
          metrics: executionMetrics,
        },
        ruleResultService,
      });
      expect(status.status).toBe('error');
      expect(status.error).toEqual({ message: 'an error', reason: 'unknown' });
      expect(status.warning).toBe(undefined);
    });

    test('task state with framework warning and rule execution warning - only show framework warning', () => {
      const ruleResultService = new RuleResultService();
      const lastRunSetters = ruleResultService.getLastRunSetters();
      lastRunSetters.addLastRunWarning('a rule execution warning');
      const { status, metrics } = executionStatusFromState({
        stateWithMetrics: {
          alertInstances: { a: {} },
          metrics: executionMetrics,
        },
        ruleResultService,
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.warning).toEqual({
        message: `a rule execution warning`,
        reason: RuleExecutionStatusWarningReasons.EXECUTION,
      });
      expect(status.status).toBe('warning');
      expect(status.error).toBe(undefined);

      testExpectedMetrics(metrics!, executionMetrics);
    });

    test('task state with rule execution warning', () => {
      const ruleResultService = new RuleResultService();
      const lastRunSetters = ruleResultService.getLastRunSetters();
      lastRunSetters.addLastRunWarning('a rule execution warning');
      const { status, metrics } = executionStatusFromState({
        stateWithMetrics: {
          alertInstances: { a: {} },
          metrics: { ...executionMetrics, triggeredActionsStatus: ActionsCompletion.PARTIAL },
        },
        ruleResultService,
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.warning).toEqual({
        message: translations.taskRunner.warning.maxExecutableActions,
        reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
      });
      expect(status.status).toBe('warning');
      expect(status.error).toBe(undefined);

      testExpectedMetrics(metrics!, {
        ...executionMetrics,
        triggeredActionsStatus: ActionsCompletion.PARTIAL,
      });
    });
  });

  describe('executionStatusFromError()', () => {
    test('error with no reason', () => {
      const { status, metrics } = executionStatusFromError(new Error('boo!'));
      expect(status.status).toBe('error');
      expect(status.error).toMatchInlineSnapshot(`
        Object {
          "message": "boo!",
          "reason": "unknown",
        }
      `);
      expect(metrics).toBeNull();
    });

    test('error with a reason', () => {
      const { status, metrics } = executionStatusFromError(
        new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, new Error('hoo!'))
      );
      expect(status.status).toBe('error');
      expect(status.error).toMatchInlineSnapshot(`
        Object {
          "message": "hoo!",
          "reason": "execute",
        }
      `);
      expect(metrics).toBeNull();
    });
  });

  describe('ruleExecutionStatusToRaw()', () => {
    const date = new Date('2020-09-03T16:26:58Z');
    const status = 'ok';
    const reason = RuleExecutionStatusErrorReasons.Decrypt;
    const error = { reason, message: 'wops' };

    test('status without an error', () => {
      expect(ruleExecutionStatusToRaw({ lastExecutionDate: date, status })).toMatchInlineSnapshot(`
        Object {
          "error": null,
          "lastDuration": 0,
          "lastExecutionDate": "2020-09-03T16:26:58.000Z",
          "status": "ok",
          "warning": null,
        }
      `);
    });

    test('status with an error', () => {
      expect(ruleExecutionStatusToRaw({ lastExecutionDate: date, status, error }))
        .toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "message": "wops",
            "reason": "decrypt",
          },
          "lastDuration": 0,
          "lastExecutionDate": "2020-09-03T16:26:58.000Z",
          "status": "ok",
          "warning": null,
        }
      `);
    });

    test('status with a duration', () => {
      expect(ruleExecutionStatusToRaw({ lastExecutionDate: date, status, lastDuration: 1234 }))
        .toMatchInlineSnapshot(`
      Object {
        "error": null,
        "lastDuration": 1234,
        "lastExecutionDate": "2020-09-03T16:26:58.000Z",
        "status": "ok",
        "warning": null,
      }
    `);
    });

    test('status with a alerts and actions counts', () => {
      expect(
        ruleExecutionStatusToRaw({
          lastExecutionDate: date,
          status,
        })
      ).toMatchInlineSnapshot(`
      Object {
        "error": null,
        "lastDuration": 0,
        "lastExecutionDate": "2020-09-03T16:26:58.000Z",
        "status": "ok",
        "warning": null,
      }
    `);
    });
  });

  describe('ruleExecutionStatusFromRaw()', () => {
    const date = new Date('2020-09-03T16:26:58Z').toISOString();
    const status = 'active';
    const reason = RuleExecutionStatusErrorReasons.Execute;
    const error = { reason, message: 'wops' };

    test('no input', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id');
      expect(result).toBe(undefined);
    });

    test('undefined input', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', undefined);
      expect(result).toBe(undefined);
    });

    test('null input', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', null);
      expect(result).toBe(undefined);
    });

    test('invalid date', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
        lastExecutionDate: 'an invalid date',
      })!;
      checkDateIsNearNow(result.lastExecutionDate);
      expect(result.status).toBe('unknown');
      expect(result.error).toBe(undefined);
      expect(result.warning).toBe(undefined);
      expect(MockLogger.debug).toBeCalledWith(
        'invalid ruleExecutionStatus lastExecutionDate "an invalid date" in raw rule rule-id'
      );
    });

    test('valid date', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
        lastExecutionDate: date,
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "lastExecutionDate": 2020-09-03T16:26:58.000Z,
          "status": "unknown",
        }
      `);
    });

    test('valid status and date', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
        status,
        lastExecutionDate: date,
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "lastExecutionDate": 2020-09-03T16:26:58.000Z,
          "status": "active",
        }
      `);
    });

    test('valid status, date and error', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
        status,
        lastExecutionDate: date,
        error,
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "message": "wops",
            "reason": "execute",
          },
          "lastExecutionDate": 2020-09-03T16:26:58.000Z,
          "status": "active",
        }
      `);
    });

    test('valid status, date and duration', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
        status,
        lastExecutionDate: date,
        lastDuration: 1234,
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "lastDuration": 1234,
          "lastExecutionDate": 2020-09-03T16:26:58.000Z,
          "status": "active",
        }
      `);
    });

    test('valid status, date, error and duration', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
        status,
        lastExecutionDate: date,
        error,
        lastDuration: 1234,
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "message": "wops",
            "reason": "execute",
          },
          "lastDuration": 1234,
          "lastExecutionDate": 2020-09-03T16:26:58.000Z,
          "status": "active",
        }
      `);
    });
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkDateIsNearNow(date: any) {
  expect(date instanceof Date).toBe(true);
  // allow for lots of slop in the time difference
  expect(Date.now() - date.valueOf()).toBeLessThanOrEqual(10000);
}
