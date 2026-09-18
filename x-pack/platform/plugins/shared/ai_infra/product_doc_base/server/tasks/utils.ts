/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  TaskStatus,
  type ConcreteTaskInstance,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { isImpliedDefaultElserInferenceId } from '@kbn/product-doc-common/src/is_default_inference_endpoint';
import {
  INSTALL_LOCK_RETRY_DELAY_MS,
  tryWithInstallLock,
  type InstallLockManager,
} from '../services/install_lock';

export type { InstallLockManager };

/**
 * Params shared by the per-request install and update tasks. Each request schedules its own task
 * instance, so the request time is immutable and never mixed up with an earlier request.
 */
export interface RequestTaskParams {
  inferenceId: string;
  /** Time of the request (ISO 8601); a later uninstall of the same resource supersedes the task */
  requestedAt: string;
}

// Task scope identifying the inference ID an install or update task works on
export const getInferenceScope = (inferenceId: string): string =>
  `productDoc:inference:${isImpliedDefaultElserInferenceId(inferenceId) ? 'default' : inferenceId}`;

export const PENDING_TASK_STATUSES = [TaskStatus.Idle, TaskStatus.Claiming, TaskStatus.Running];

/**
 * Tasks of `taskType` for the inference ID in one of `statuses`. Completed tasks are removed by Task
 * Manager, so only pending and failed ones can be found.
 */
export const findTasks = async ({
  taskManager,
  taskType,
  inferenceId,
  statuses,
}: {
  taskManager: TaskManagerStartContract;
  taskType: string;
  inferenceId: string;
  statuses: TaskStatus[];
}): Promise<ConcreteTaskInstance[]> => {
  const { docs } = await taskManager.fetch({
    size: 10,
    query: {
      bool: {
        filter: [
          { term: { 'task.taskType': taskType } },
          { term: { 'task.scope': getInferenceScope(inferenceId) } },
          { terms: { 'task.status': statuses } },
        ],
      },
    },
  });
  return docs;
};

/**
 * Schedules a new task instance for a request, unless `reusePending` is set and a pending task of the
 * same type for the inference ID (optionally matching `matches`) exists, in which case that task is
 * reused. Failed leftovers of earlier requests are removed so the status only reflects the latest one.
 */
export const scheduleRequestTask = async <P extends RequestTaskParams>({
  taskManager,
  logger,
  taskType,
  params,
  reusePending,
  matches = () => true,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  taskType: string;
  params: P;
  reusePending: boolean;
  matches?: (task: ConcreteTaskInstance) => boolean;
}): Promise<string> => {
  const { inferenceId } = params;
  if (reusePending) {
    const [pending] = (
      await findTasks({ taskManager, taskType, inferenceId, statuses: PENDING_TASK_STATUSES })
    ).filter(matches);
    if (pending) {
      logger.debug(`Reusing pending task ${pending.id} (${taskType}) for [${inferenceId}]`);
      return pending.id;
    }
  }
  const failed = await findTasks({
    taskManager,
    taskType,
    inferenceId,
    statuses: [TaskStatus.Failed],
  });
  if (failed.length > 0) {
    await taskManager.bulkRemove(failed.map(({ id }) => id));
  }
  const { id } = await taskManager.schedule({
    taskType,
    params: { ...params },
    state: {},
    scope: ['productDoc', getInferenceScope(inferenceId)],
  });
  logger.info(`Task ${id} (${taskType}) scheduled for [${inferenceId}]`);
  return id;
};

export type RequestTaskStatus = 'pending' | 'failed' | 'none';

/**
 * Whether a task of `taskType` for the inference ID is pending, or the latest request failed. Failed
 * tasks are removed when a new request is scheduled, so a remaining one belongs to the latest request.
 */
export const getRequestTaskStatus = async ({
  taskManager,
  taskType,
  inferenceId,
}: {
  taskManager: TaskManagerStartContract;
  taskType: string;
  inferenceId: string;
}): Promise<RequestTaskStatus> => {
  const tasks = await findTasks({
    taskManager,
    taskType,
    inferenceId,
    statuses: [...PENDING_TASK_STATUSES, TaskStatus.Failed],
  });
  if (tasks.some(({ status }) => status !== TaskStatus.Failed)) {
    return 'pending';
  }
  return tasks.length > 0 ? 'failed' : 'none';
};

/**
 * Runs `run` under the cluster-wide install lock so that at most one documentation install runs at a
 * time across all tasks and Kibana nodes. When another install holds the lock the run is deferred
 * instead of failing an attempt. Errors propagate so Task Manager retries the task with backoff.
 */
export const runTaskUnderInstallLock = async ({
  lockManager,
  run,
  metadata,
}: {
  lockManager: InstallLockManager;
  run: () => Promise<void>;
  metadata?: Record<string, unknown>;
}) => {
  const acquired = await tryWithInstallLock({ lockManager, run, metadata });
  return acquired
    ? { state: {} }
    : { state: {}, runAt: new Date(Date.now() + INSTALL_LOCK_RETRY_DELAY_MS) };
};

export const isTaskCurrentlyRunningError = (err: Error): boolean => {
  return err.message?.includes('currently running');
};

export const waitUntilTaskCompleted = async ({
  taskManager,
  taskId,
  timeout = 120_000,
  interval = 5_000,
}: {
  taskManager: TaskManagerStartContract;
  taskId: string;
  timeout?: number;
  interval?: number;
}): Promise<void> => {
  const start = Date.now();
  const max = start + timeout;
  let now = start;
  while (now < max) {
    try {
      const taskInstance = await taskManager.get(taskId);
      const { status } = taskInstance;
      if (status === 'idle' || status === 'claiming' || status === 'running') {
        await sleep(interval);
        now = Date.now();
      } else {
        return;
      }
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        // not found means the task was completed and the entry removed
        return;
      }
      // transient read failure: keep polling at the regular interval until the timeout
      await sleep(interval);
      now = Date.now();
    }
  }

  throw new Error(`Timeout waiting for task ${taskId} to complete.`);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
