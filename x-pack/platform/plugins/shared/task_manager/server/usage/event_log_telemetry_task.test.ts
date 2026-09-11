/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { TaskCost, type RunContext } from '../task';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskScheduling } from '../task_scheduling';
import {
  registerEventLogTelemetryTask,
  scheduleEventLogTelemetryTask,
  taskRunner,
} from './event_log_telemetry_task';
import { getEventLogStats } from './lib/get_event_log_stats';
import { emptyState } from './task_state';
import { SCHEDULE, TASK_ID, TASK_TYPE } from './constants';

jest.mock('./lib/get_event_log_stats');

const getEventLogStatsMock = getEventLogStats as jest.MockedFunction<typeof getEventLogStats>;

const logger = loggingSystemMock.createLogger();

const stats = {
  total_task_runs_24hr: 150,
  task_runs_by_type_24hr: [{ name: 'alerting:.index-threshold', value: 150 }],
  task_runs_other_24hr: 0,
  schedule_delay_ms_24hr: { p50: 100, p75: 250, p95: 1200, p99: 5000 },
};

const createCoreStartServices = () => {
  const coreStart = coreMock.createStart();
  return jest.fn().mockResolvedValue([coreStart, {}, {}]);
};

const signal = new AbortController().signal;

const runContext = (state = {}) => ({ taskInstance: { state }, signal } as unknown as RunContext);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('registerEventLogTelemetryTask', () => {
  it('registers the task definition with a versioned state schema', () => {
    const taskTypeDictionary = {
      registerTaskDefinitions: jest.fn(),
    } as unknown as TaskTypeDictionary;

    registerEventLogTelemetryTask(logger, createCoreStartServices(), taskTypeDictionary);

    expect(taskTypeDictionary.registerTaskDefinitions).toHaveBeenCalledWith({
      [TASK_TYPE]: expect.objectContaining({
        title: 'Task Manager snapshot telemetry fetch task',
        description: expect.any(String),
        timeout: '5m',
        cost: TaskCost.Normal,
        stateSchemaByVersion: expect.any(Object),
        createTaskRunner: expect.any(Function),
      }),
    });
  });
});

describe('scheduleEventLogTelemetryTask', () => {
  it('schedules a single task keyed by a well-known id', async () => {
    const taskScheduling = { ensureScheduled: jest.fn() } as unknown as TaskScheduling;

    await scheduleEventLogTelemetryTask(logger, taskScheduling);

    expect(taskScheduling.ensureScheduled).toHaveBeenCalledWith({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: SCHEDULE,
      state: emptyState,
      params: {},
    });
  });

  it('logs instead of throwing when scheduling fails', async () => {
    const taskScheduling = {
      ensureScheduled: jest.fn().mockRejectedValue(new Error('no connection')),
    } as unknown as TaskScheduling;

    await expect(scheduleEventLogTelemetryTask(logger, taskScheduling)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      `Error scheduling ${TASK_ID} task, received no connection`
    );
  });
});

describe('taskRunner', () => {
  it('writes the collected stats into task state and reschedules', async () => {
    getEventLogStatsMock.mockResolvedValue(stats);

    const runner = taskRunner(logger, createCoreStartServices())(runContext({ runs: 2 }));
    const result = await runner.run();

    expect(result).toEqual({
      state: {
        has_errors: false,
        error_messages: undefined,
        runs: 3,
        ...stats,
      },
      schedule: SCHEDULE,
    });
  });

  it('starts the run counter at 1 when state is empty', async () => {
    getEventLogStatsMock.mockResolvedValue(stats);

    const runner = taskRunner(logger, createCoreStartServices())(runContext());
    const result = await runner.run();

    expect(result.state.runs).toBe(1);
  });

  it("queries the event log with the internal user client and the task's abort signal", async () => {
    getEventLogStatsMock.mockResolvedValue(stats);
    const coreStartServices = createCoreStartServices();
    const [coreStart] = await coreStartServices();

    const runner = taskRunner(logger, coreStartServices)(runContext());
    await runner.run();

    expect(getEventLogStatsMock).toHaveBeenCalledWith(
      coreStart.elasticsearch.client.asInternalUser,
      signal
    );
  });

  it('retains previously collected stats when the aggregation fails', async () => {
    getEventLogStatsMock.mockRejectedValue(new Error('search_phase_execution_exception'));

    const runner = taskRunner(logger, createCoreStartServices())(runContext({ runs: 4, ...stats }));
    const result = await runner.run();

    expect(result).toEqual({
      state: {
        ...stats,
        has_errors: true,
        error_messages: ['search_phase_execution_exception'],
        runs: 5,
      },
      schedule: SCHEDULE,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      `Error executing ${TASK_ID} task, received search_phase_execution_exception`
    );
  });
});
