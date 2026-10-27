/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskAlreadyRunningError, TaskStatus } from '@kbn/task-manager-plugin/server';
import { MEMORY_DREAMING_TASK_TYPE } from '../../../common/memory';
import { MemoryConflictError } from '../errors';
import { createMemoryDreamingScheduler, MANUAL_DREAMING_RUN_AT } from './schedule';

const TASK_ID = 'contextEngine:memoryDreaming:team-a';
const enabledBy = { id: 'u1', username: 'elastic' };
const history = {
  lastDreamAt: '2026-10-01T12:00:00.000Z',
  lastRunAt: '2026-10-01T12:00:05.000Z',
  lastRunStatus: 'success',
  lastRunMemoriesRead: 4,
  lastRunApplied: 1,
  lastRunSkipped: 0,
};

const task = (overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance =>
  ({
    id: TASK_ID,
    taskType: MEMORY_DREAMING_TASK_TYPE,
    schedule: { interval: '6h' },
    runAt: new Date('2999-10-02T00:00:00.000Z'),
    status: TaskStatus.Idle,
    enabled: true,
    params: { spaceId: 'team-a', enabledBy, enabledAt: '2026-10-01T00:00:00.000Z' },
    state: history,
    ...overrides,
  } as ConcreteTaskInstance);

describe('createMemoryDreamingScheduler', () => {
  let taskManager: jest.Mocked<
    Pick<TaskManagerStartContract, 'get' | 'schedule' | 'removeIfExists' | 'runSoon'>
  >;

  const scheduler = () =>
    createMemoryDreamingScheduler({
      getTaskManager: async () => taskManager as unknown as TaskManagerStartContract,
    });

  const notFound = () => SavedObjectsErrorHelpers.createGenericNotFoundError('task', TASK_ID);

  beforeEach(() => {
    taskManager = {
      get: jest.fn().mockResolvedValue(task()),
      schedule: jest.fn(async (instance) => task(instance as Partial<ConcreteTaskInstance>)),
      removeIfExists: jest.fn().mockResolvedValue(undefined),
      runSoon: jest.fn().mockResolvedValue({ id: TASK_ID }),
    };
  });

  describe('getStatus', () => {
    it('reports dreaming as off when the space has no task', async () => {
      taskManager.get.mockRejectedValue(notFound());

      await expect(scheduler().getStatus({ spaceId: 'team-a', interval: '24h' })).resolves.toEqual({
        enabled: false,
        interval: '24h',
      });
    });

    it('rethrows other errors reading the task', async () => {
      taskManager.get.mockRejectedValue(new Error('cluster down'));

      await expect(scheduler().getStatus({ spaceId: 'team-a', interval: '24h' })).rejects.toThrow(
        'cluster down'
      );
    });

    it('reports the task schedule, owner, last run and its counts', async () => {
      await expect(scheduler().getStatus({ spaceId: 'team-a', interval: '24h' })).resolves.toEqual({
        enabled: true,
        scheduled: true,
        rebuild: false,
        running: false,
        enabled_by: enabledBy,
        enabled_at: '2026-10-01T00:00:00.000Z',
        interval: '6h',
        next_run_at: '2999-10-02T00:00:00.000Z',
        last_dream_at: '2026-10-01T12:00:00.000Z',
        last_run_at: '2026-10-01T12:00:05.000Z',
        last_run_status: 'success',
        last_error: undefined,
        last_run_memories_read: 4,
        last_run_applied: 1,
        last_run_skipped: 0,
      });
      expect(taskManager.get).toHaveBeenCalledWith(TASK_ID);
    });

    it.each([
      ['running', { status: TaskStatus.Running }],
      ['due', { runAt: new Date('2026-01-01T00:00:00.000Z') }],
    ])('reports a %s task as running', async (_name, overrides) => {
      taskManager.get.mockResolvedValue(task(overrides));

      await expect(
        scheduler().getStatus({ spaceId: 'team-a', interval: '24h' })
      ).resolves.toMatchObject({ running: true });
    });

    it('reports a manual task without a next run', async () => {
      taskManager.get.mockResolvedValue(
        task({
          runAt: MANUAL_DREAMING_RUN_AT,
          params: { spaceId: 'team-a', enabledBy, enabledAt: 'x', scheduled: false },
        })
      );

      const status = await scheduler().getStatus({ spaceId: 'team-a', interval: '24h' });

      expect(status).toMatchObject({ enabled: true, scheduled: false, running: false });
      expect(status.next_run_at).toBeUndefined();
    });

    it('reports per-type results and a catch-up run', async () => {
      taskManager.get.mockResolvedValue(
        task({
          params: { spaceId: 'team-a', enabledBy, enabledAt: 'x', scheduled: false },
          state: {
            ...history,
            lastRunTypes: {
              'memory.fact': { memoriesRead: 4, applied: 1, skipped: 0, batches: 2 },
            },
            catchingUp: true,
            pendingMemories: 120,
          },
        })
      );

      await expect(
        scheduler().getStatus({ spaceId: 'team-a', interval: '24h' })
      ).resolves.toMatchObject({
        scheduled: false,
        next_run_at: '2999-10-02T00:00:00.000Z',
        catching_up: true,
        pending_memories: 120,
        last_run_types: {
          'memory.fact': { memories_read: 4, applied: 1, skipped: 0, batches: 2 },
        },
      });
    });

    it('reports the run history of a turned-off task', async () => {
      taskManager.get.mockResolvedValue(task({ enabled: false }));

      await expect(
        scheduler().getStatus({ spaceId: 'team-a', interval: '24h' })
      ).resolves.toMatchObject({
        enabled: false,
        interval: '24h',
        last_dream_at: '2026-10-01T12:00:00.000Z',
        last_run_memories_read: 4,
      });
    });
  });

  describe('enable', () => {
    const request = {} as KibanaRequest;
    const enable = (scheduled: boolean, rebuild = false) =>
      scheduler().enable({
        request,
        spaceId: 'team-a',
        interval: '6h',
        enabledBy,
        scheduled,
        rebuild,
      });

    it('replaces the task with one that runs as the caller and keeps the run history', async () => {
      const status = await enable(true);

      expect(taskManager.removeIfExists).toHaveBeenCalledWith(TASK_ID);
      expect(taskManager.schedule).toHaveBeenCalledWith(
        {
          id: TASK_ID,
          taskType: MEMORY_DREAMING_TASK_TYPE,
          schedule: { interval: '6h' },
          params: {
            spaceId: 'team-a',
            enabledBy,
            enabledAt: expect.any(String),
            scheduled: true,
            rebuild: false,
          },
          state: history,
        },
        { request }
      );
      expect(taskManager.removeIfExists.mock.invocationCallOrder[0]).toBeLessThan(
        taskManager.schedule.mock.invocationCallOrder[0]
      );
      expect(status).toMatchObject({
        enabled: true,
        scheduled: true,
        rebuild: false,
        interval: '6h',
      });
    });

    it('records that every dream rebuilds', async () => {
      const status = await enable(true, true);

      expect(taskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ rebuild: true }) }),
        { request }
      );
      expect(status).toMatchObject({ rebuild: true });
    });

    it('starts with no history when the space never had a task', async () => {
      taskManager.get.mockRejectedValue(notFound());

      await enable(true);

      expect(taskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({ state: {} }),
        expect.anything()
      );
    });

    it('drops the catch-up flags from the carried history', async () => {
      taskManager.get.mockResolvedValue(
        task({ state: { ...history, catchingUp: true, pendingMemories: 3 } })
      );

      await enable(false);

      expect(taskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({ state: history }),
        { request }
      );
    });

    it('parks a manual task until "Dream now"', async () => {
      await enable(false);

      expect(taskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ scheduled: false }),
          runAt: MANUAL_DREAMING_RUN_AT,
        }),
        { request }
      );
    });

    it('refuses while a dream is running', async () => {
      taskManager.get.mockResolvedValue(task({ status: TaskStatus.Running }));

      await expect(enable(true)).rejects.toBeInstanceOf(MemoryConflictError);
      expect(taskManager.removeIfExists).not.toHaveBeenCalled();
    });
  });

  describe('disable', () => {
    const disable = () => scheduler().disable({ spaceId: 'team-a', interval: '6h' });

    it('replaces the task with a disabled one without an API key, keeping the history', async () => {
      const status = await disable();

      expect(taskManager.removeIfExists).toHaveBeenCalledWith(TASK_ID);
      expect(taskManager.schedule).toHaveBeenCalledWith({
        id: TASK_ID,
        taskType: MEMORY_DREAMING_TASK_TYPE,
        schedule: { interval: '6h' },
        params: task().params,
        state: history,
        enabled: false,
      });
      expect(status).toMatchObject({ enabled: false, last_dream_at: history.lastDreamAt });
    });

    it('does nothing when there is no task or it is already off', async () => {
      taskManager.get.mockRejectedValueOnce(notFound());
      await expect(disable()).resolves.toEqual({ enabled: false, interval: '6h' });

      taskManager.get.mockResolvedValueOnce(task({ enabled: false }));
      await expect(disable()).resolves.toMatchObject({ enabled: false });

      expect(taskManager.removeIfExists).not.toHaveBeenCalled();
      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    it('refuses while a dream is running', async () => {
      taskManager.get.mockResolvedValue(task({ status: TaskStatus.Claiming }));

      await expect(disable()).rejects.toBeInstanceOf(MemoryConflictError);
    });
  });

  describe('runNow', () => {
    const runNow = () => scheduler().runNow({ spaceId: 'team-a', interval: '6h' });

    it('asks Task Manager to run the task now', async () => {
      await expect(runNow()).resolves.toMatchObject({ enabled: true, running: true });
      expect(taskManager.runSoon).toHaveBeenCalledWith(TASK_ID);
    });

    it('refuses while dreaming is off', async () => {
      taskManager.get.mockResolvedValue(task({ enabled: false }));

      await expect(runNow()).rejects.toThrow('Turn on dreaming before running a dream.');
      expect(taskManager.runSoon).not.toHaveBeenCalled();
    });

    it('reports a conflict when Task Manager finds the task running', async () => {
      taskManager.runSoon.mockRejectedValue(new TaskAlreadyRunningError(TASK_ID));

      await expect(runNow()).rejects.toBeInstanceOf(MemoryConflictError);
    });
  });
});
