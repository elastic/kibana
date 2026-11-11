/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { RuleTaskState } from '../../types';
import { asErr, asOk } from '../../lib/result_type';
import { RuleRunMetricsStore } from '../../lib/rule_run_metrics_store';
import { getState } from './get_state';

const startedAt = new Date('2026-11-09T10:00:00.000Z');
const originalState: RuleTaskState = {
  alertTypeState: { evaluated: 'previous run' },
  alertInstances: { '1': { meta: { uuid: 'uuid-1' } } },
  alertRecoveredInstances: {},
  previousStartedAt: '2026-11-09T09:59:00.000Z',
};
const persistedAlertsState: RuleTaskState = {
  alertTypeState: { evaluated: 'this run' },
  alertInstances: {
    '1': { meta: { uuid: 'uuid-1' } },
    '2': { meta: { uuid: 'uuid-2' } },
  },
  alertRecoveredInstances: {},
};

describe('getState', () => {
  const logger = loggingSystemMock.createLogger();

  const getStateFor = (
    runRuleResult: Parameters<typeof getState>[0]['runRuleResult'],
    persisted: RuleTaskState | null = null
  ) =>
    getState({
      runRuleResult,
      startedAt,
      ruleId: 'rule-1',
      spaceId: 'default',
      ruleTypeId: 'test',
      logger,
      stackTraceLog: null,
      originalState,
      persistedAlertsState: persisted,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns the state of the run when it succeeds', () => {
    const runRuleResult = asOk({
      metrics: new RuleRunMetricsStore().getMetrics(),
      state: { alertTypeState: { evaluated: 'this run' } },
    });

    expect(getStateFor(runRuleResult, persistedAlertsState)).toEqual({
      alertTypeState: { evaluated: 'this run' },
      previousStartedAt: startedAt.toISOString(),
    });
  });

  test('returns the original state when the run fails before the alerts are persisted', () => {
    expect(getStateFor(asErr(new Error('executor failed')))).toBe(originalState);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Executing Rule default:test:rule-1 has resulted in Error'),
      expect.objectContaining({ tags: ['rule-run-failed', 'framework-error'] })
    );
  });

  test('returns the persisted alerts state when the run fails after the alerts are persisted', () => {
    expect(getStateFor(asErr(new Error('enqueue failed')), persistedAlertsState)).toEqual({
      ...persistedAlertsState,
      previousStartedAt: startedAt.toISOString(),
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('enqueue failed'),
      expect.objectContaining({ tags: ['rule-run-failed', 'framework-error'] })
    );
  });
});
