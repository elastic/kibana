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
import type {
  MemoryDreamingStatusResponse,
  MemoryDreamingUser,
} from '../../../common/http_api/memory';
import { getMemoryDreamingTaskId, MEMORY_DREAMING_TASK_TYPE } from '../../../common/memory';
import { MemoryConflictError } from '../errors';
import type { MemoryDreamingTaskParams } from './types';
import type { MemoryDreamingTaskState } from './task_state';

/** Parks a task that only runs from "Dream now"; Task Manager never reaches this run time. */
export const MANUAL_DREAMING_RUN_AT = new Date('9999-12-31T00:00:00.000Z');

export interface MemoryDreamingScheduler {
  getStatus(params: { spaceId: string; interval: string }): Promise<MemoryDreamingStatusResponse>;
  /**
   * Replaces any existing task with one that runs as the caller. The run history carries over,
   * so the next dream starts where the last one stopped.
   */
  enable(params: {
    request: KibanaRequest;
    spaceId: string;
    interval: string;
    enabledBy: MemoryDreamingUser;
    scheduled: boolean;
    rebuild: boolean;
  }): Promise<MemoryDreamingStatusResponse>;
  /** Keeps the run history but drops the API key, so the task cannot run until turned on again. */
  disable(params: { spaceId: string; interval: string }): Promise<MemoryDreamingStatusResponse>;
  /** Starts a dream now, whether or not the task runs on a schedule. */
  runNow(params: { spaceId: string; interval: string }): Promise<MemoryDreamingStatusResponse>;
}

const isRunning = ({ status }: ConcreteTaskInstance) =>
  status === TaskStatus.Running || status === TaskStatus.Claiming;

const toStatus = (task: ConcreteTaskInstance, interval: string): MemoryDreamingStatusResponse => {
  const { params, state, schedule, runAt, enabled } = task;
  const {
    lastDreamAt,
    lastRunAt,
    lastRunStatus,
    lastError,
    lastRunMemoriesRead,
    lastRunApplied,
    lastRunSkipped,
    lastRunTypes,
    catchingUp,
    pendingMemories,
  } = state as MemoryDreamingTaskState;
  const history = {
    last_dream_at: lastDreamAt,
    last_run_at: lastRunAt,
    last_run_status: lastRunStatus,
    last_error: lastError,
    last_run_memories_read: lastRunMemoriesRead,
    last_run_applied: lastRunApplied,
    last_run_skipped: lastRunSkipped,
    ...(lastRunTypes !== undefined
      ? {
          last_run_types: Object.fromEntries(
            Object.entries(lastRunTypes).map(
              ([type, { memoriesRead, applied, skipped, batches, error }]) => [
                type,
                { memories_read: memoriesRead, applied, skipped, batches, error },
              ]
            )
          ),
        }
      : {}),
  };
  if (enabled === false) {
    return { enabled: false, interval, ...history };
  }

  const {
    enabledBy,
    enabledAt,
    scheduled = true,
    rebuild = false,
  } = params as MemoryDreamingTaskParams;
  return {
    enabled: true,
    scheduled,
    rebuild,
    running: isRunning(task) || runAt.getTime() <= Date.now(),
    enabled_by: enabledBy,
    enabled_at: enabledAt,
    interval: schedule?.interval ?? interval,
    ...(scheduled || catchingUp ? { next_run_at: runAt.toISOString() } : {}),
    ...history,
    catching_up: catchingUp,
    pending_memories: catchingUp ? pendingMemories : undefined,
  };
};

/** The run history a replacement task keeps; catching up restarts with its first run. */
const toCarriedState = (previous: ConcreteTaskInstance | undefined): MemoryDreamingTaskState => {
  const { catchingUp, pendingMemories, ...history }: MemoryDreamingTaskState =
    previous?.state ?? {};
  return history;
};

const createDreamRunningError = () =>
  new MemoryConflictError('A dream is running. Try again when it finishes.');

const assertNotRunning = (task: ConcreteTaskInstance | undefined) => {
  if (task && isRunning(task)) {
    throw createDreamRunningError();
  }
};

export const createMemoryDreamingScheduler = ({
  getTaskManager,
}: {
  getTaskManager: () => Promise<TaskManagerStartContract>;
}): MemoryDreamingScheduler => {
  const getTask = async (spaceId: string): Promise<ConcreteTaskInstance | undefined> => {
    const taskManager = await getTaskManager();
    try {
      return await taskManager.get(getMemoryDreamingTaskId(spaceId));
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  };

  return {
    async getStatus({ spaceId, interval }) {
      const task = await getTask(spaceId);
      return task ? toStatus(task, interval) : { enabled: false, interval };
    },

    async enable({ request, spaceId, interval, enabledBy, scheduled, rebuild }) {
      const taskManager = await getTaskManager();
      const id = getMemoryDreamingTaskId(spaceId);
      const previous = await getTask(spaceId);
      assertNotRunning(previous);
      await taskManager.removeIfExists(id);
      const params: MemoryDreamingTaskParams = {
        spaceId,
        enabledBy,
        enabledAt: new Date().toISOString(),
        scheduled,
        rebuild,
      };
      const task = await taskManager.schedule(
        {
          id,
          taskType: MEMORY_DREAMING_TASK_TYPE,
          schedule: { interval },
          params,
          state: toCarriedState(previous),
          ...(scheduled ? {} : { runAt: MANUAL_DREAMING_RUN_AT }),
        },
        { request }
      );
      return toStatus(task, interval);
    },

    async disable({ spaceId, interval }) {
      const previous = await getTask(spaceId);
      if (!previous || previous.enabled === false) {
        return previous ? toStatus(previous, interval) : { enabled: false, interval };
      }
      assertNotRunning(previous);
      const taskManager = await getTaskManager();
      const { id, taskType, schedule, params, state } = previous;
      await taskManager.removeIfExists(id);
      const task = await taskManager.schedule({
        id,
        taskType,
        schedule,
        params,
        state,
        enabled: false,
      });
      return toStatus(task, interval);
    },

    async runNow({ spaceId, interval }) {
      const task = await getTask(spaceId);
      if (!task || task.enabled === false) {
        throw new MemoryConflictError('Turn on dreaming before running a dream.');
      }
      assertNotRunning(task);
      const taskManager = await getTaskManager();
      try {
        await taskManager.runSoon(task.id);
      } catch (error) {
        throw error instanceof TaskAlreadyRunningError ? createDreamRunningError() : error;
      }
      return toStatus({ ...task, runAt: new Date() }, interval);
    },
  };
};
