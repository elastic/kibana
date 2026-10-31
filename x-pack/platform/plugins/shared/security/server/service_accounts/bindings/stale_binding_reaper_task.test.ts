/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import type { ConcreteTaskInstance, RunContext } from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import type { StaleBindingReaper } from './stale_binding_reaper';
import {
  SERVICE_ACCOUNT_BINDING_CLEANUP_TASK_TYPE,
  StaleBindingCleanupTask,
} from './stale_binding_reaper_task';
import type { OnlineStatusRetryScheduler } from '../../elasticsearch';

describe('StaleBindingCleanupTask', () => {
  let logger: MockedLogger;
  let task: StaleBindingCleanupTask;
  let taskManagerSetup: ReturnType<typeof taskManagerMock.createSetup>;
  let taskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let online$: Subject<OnlineStatusRetryScheduler>;
  let reaper: jest.Mocked<Pick<StaleBindingReaper, 'run'>>;

  const definition = () =>
    taskManagerSetup.registerTaskDefinitions.mock.calls[0][0][
      SERVICE_ACCOUNT_BINDING_CLEANUP_TASK_TYPE
    ];

  const runTask = async (state: Record<string, unknown>, signal = new AbortController().signal) =>
    await definition()
      .createTaskRunner({
        taskInstance: { state } as unknown as ConcreteTaskInstance,
        signal,
      } as RunContext)
      .run();

  const start = (overrides: { reaper?: unknown; isAvailable?: () => boolean } = {}) =>
    task.start({
      taskManager: taskManagerStart,
      reaper: ('reaper' in overrides ? overrides.reaper : reaper) as StaleBindingReaper,
      isAvailable: overrides.isAvailable ?? (() => true),
      interval: '3600s',
      online$,
    });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    task = new StaleBindingCleanupTask(logger);
    taskManagerSetup = taskManagerMock.createSetup();
    taskManagerStart = taskManagerMock.createStart();
    online$ = new Subject();
    reaper = { run: jest.fn().mockResolvedValue({ firstSeenUnregistered: {} }) };
    task.setup({ taskManager: taskManagerSetup });
  });

  afterEach(() => {
    task.stop();
  });

  it('registers a bounded maintenance task', () => {
    expect(definition()).toMatchObject({
      timeout: '5m',
      cost: TaskCost.Normal,
      priority: TaskPriority.Maintenance,
      stateSchemaByVersion: { 1: expect.any(Object) },
    });
  });

  it('schedules the task by ID once Elasticsearch is available, keeping any state it has', async () => {
    start();
    expect(taskManagerStart.ensureScheduled).not.toHaveBeenCalled();

    online$.next({ scheduleRetry: jest.fn() });
    await new Promise(process.nextTick);

    expect(taskManagerStart.ensureScheduled).toHaveBeenCalledWith({
      id: SERVICE_ACCOUNT_BINDING_CLEANUP_TASK_TYPE,
      taskType: SERVICE_ACCOUNT_BINDING_CLEANUP_TASK_TYPE,
      scope: ['security'],
      schedule: { interval: '3600s' },
      params: {},
      state: { firstSeenUnregistered: {} },
    });
  });

  it('retries scheduling when it fails', async () => {
    const scheduleRetry = jest.fn();
    taskManagerStart.ensureScheduled.mockRejectedValue(new Error('unavailable'));
    start();

    online$.next({ scheduleRetry });
    await new Promise(process.nextTick);

    expect(scheduleRetry).toHaveBeenCalled();
  });

  it('is not scheduled without a reaper, and a run does nothing', async () => {
    start({ reaper: undefined });
    online$.next({ scheduleRetry: jest.fn() });
    await new Promise(process.nextTick);

    expect(taskManagerStart.ensureScheduled).not.toHaveBeenCalled();
    await expect(runTask({ firstSeenUnregistered: { a: 'b' } })).resolves.toEqual({
      state: { firstSeenUnregistered: { a: 'b' } },
    });
  });

  it('runs the reaper with the stored state and the task signal', async () => {
    start();
    const signal = new AbortController().signal;
    const next = {
      sweep: { cutoff: '2026-10-25T00:00:00.000Z', afterKey: 'b' },
      firstSeenUnregistered: {},
    };
    reaper.run.mockResolvedValue(next);

    await expect(
      runTask({ sweep: { cutoff: '2026-10-25T00:00:00.000Z', afterKey: 'a' } }, signal)
    ).resolves.toEqual({ state: next });
    expect(reaper.run).toHaveBeenCalledWith(
      { sweep: { cutoff: '2026-10-25T00:00:00.000Z', afterKey: 'a' }, firstSeenUnregistered: {} },
      signal
    );
  });

  it('skips a run while security or encryption is unavailable', async () => {
    start({ isAvailable: () => false });

    await expect(runTask({ firstSeenUnregistered: {} })).resolves.toEqual({
      state: { firstSeenUnregistered: {} },
    });
    expect(reaper.run).not.toHaveBeenCalled();
  });

  it('keeps the state it had when a run fails', async () => {
    start();
    reaper.run.mockRejectedValue(new Error('search failed'));
    const state = { sweep: { cutoff: '2026-10-25T00:00:00.000Z' }, firstSeenUnregistered: {} };

    await expect(runTask(state)).resolves.toEqual({ state });
    expect(logger.warn).toHaveBeenCalledWith('The stale binding cleanup failed: search failed');
  });
});
