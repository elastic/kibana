/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server/task';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { getRuleStats } from './lib/get_rule_stats';
import { getExecutionStats } from './lib/get_execution_stats';
import { getActionPolicyStats } from './lib/get_action_policy_stats';
import { getAlertStats } from './lib/get_alert_stats';
import { TelemetryTaskRunner } from './task_runner';
import { emptyState } from './task_state';

jest.mock('./lib/get_rule_stats');
jest.mock('./lib/get_execution_stats');
jest.mock('./lib/get_action_policy_stats');
jest.mock('./lib/get_alert_stats');

const getRuleStatsMock = jest.mocked(getRuleStats);
const getExecutionStatsMock = jest.mocked(getExecutionStats);
const getActionPolicyStatsMock = jest.mocked(getActionPolicyStats);
const getAlertStatsMock = jest.mocked(getAlertStats);

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;

const createRunParams = (state = emptyState): Pick<RunContext, 'taskInstance' | 'signal'> =>
  ({
    taskInstance: { state },
    signal: new AbortController().signal,
  } as unknown as Pick<RunContext, 'taskInstance' | 'signal'>);

describe('TelemetryTaskRunner', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    getRuleStatsMock.mockResolvedValue({ count_total: 10, count_enabled: 5 });
    getExecutionStatsMock.mockResolvedValue({ executions_count_24hr: 20 });
    getActionPolicyStatsMock.mockResolvedValue({ action_policies_count: 3 });
    getAlertStatsMock.mockResolvedValue({ alerts_count: 42 });
  });

  it('marks has_errors false and persists every stat when all stat collectors succeed', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const runner = new TelemetryTaskRunner(loggerService, esClient);

    const { state } = await runner.run(createRunParams());

    expect(state).toEqual({
      has_errors: false,
      error_messages: undefined,
      runs: 1,
      count_total: 10,
      count_enabled: 5,
      executions_count_24hr: 20,
      action_policies_count: 3,
      alerts_count: 42,
    });
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('flags has_errors and drops only the failed stat while keeping the others', async () => {
    getActionPolicyStatsMock.mockRejectedValue(new Error('action policy stats boom'));
    const { loggerService, mockLogger } = createLoggerService();
    const runner = new TelemetryTaskRunner(loggerService, esClient);

    const { state } = await runner.run(createRunParams({ ...emptyState, runs: 4 }));

    expect(state.has_errors).toBe(true);
    expect(state.error_messages).toEqual(['Telemetry stat collection failed: action_policy_stats']);
    expect(state.runs).toBe(5);

    // Successful stats are still persisted.
    expect(state.count_total).toBe(10);
    expect(state.count_enabled).toBe(5);
    expect(state.executions_count_24hr).toBe(20);
    expect(state.alerts_count).toBe(42);

    // The failed stat's fields are absent rather than reset to emptyState.
    expect(state.action_policies_count).toBeUndefined();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Telemetry stat collection failed',
      expect.objectContaining({
        labels: expect.objectContaining({ resource: 'action_policy_stats' }),
      })
    );
  });
});
