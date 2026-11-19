/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
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

// A full install or update runs in one task run. ELSER model download plus four product
// indices can outlast 20m on a small CI agent; killing the run there retries from scratch
// and the HTTP waiter never sees a completed task. The waiter sits above the task timeout
// so scheduling and install-lock delays still fit. Route idle sockets and the gen-ai FTR
// Mocha timeout must stay above this waiter.
export const INSTALL_TASK_TIMEOUT = '30m';
export const INSTALL_TASK_WAIT_TIMEOUT_MS = 35 * 60 * 1000;

/**
 * Params shared by the per-request install and update tasks. Each request schedules its own task
 * instance, so the request time is immutable and never mixed up with an earlier request.
 */
export interface RequestTaskParams {
  inferenceId: string;
  /** Time of the request (ISO 8601); a later uninstall of the same resource supersedes the task */
  requestedAt: string;
  /** Version of the local (bundled) artifact repository the request was made against */
  repositoryVersion?: string;
}

/**
 * State of the request tasks. `superseded` is set on a waiting task when a request against a newer
 * repository version is scheduled; the runner re-reads it under the install lock and stops.
 */
export const requestTaskStateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      superseded: state.superseded === true ? true : undefined,
    }),
    schema: schema.object({ superseded: schema.maybe(schema.boolean()) }),
  },
};

// A request made against a newer bundle than this node's is retried until a node with that bundle
// picks it up, unless the request is this old (rollback, node gone), when any node runs it.
export const REPOSITORY_VERSION_RETRY_DELAY_MS = 30 * 1000;
export const REPOSITORY_VERSION_DEFER_MAX_MS = 60 * 60 * 1000;

/**
 * Whether a run must be left to another node because the request was made against a newer local
 * repository than this node's, e.g. a new pod's startup update during a rolling deployment.
 */
export const shouldDeferForRepositoryVersion = ({
  requestedVersion,
  localVersion,
  requestedAt,
  now = Date.now(),
}: {
  requestedVersion?: string;
  localVersion?: string;
  requestedAt?: string;
  now?: number;
}): boolean => {
  if (!requestedVersion || !requestedAt || (localVersion && localVersion >= requestedVersion)) {
    return false;
  }
  return now - new Date(requestedAt).getTime() < REPOSITORY_VERSION_DEFER_MAX_MS;
};

// Deferrals hand the task's state back unchanged so a superseded marker set meanwhile survives
export const deferForRepositoryVersion = (state: ConcreteTaskInstance['state'] = {}) => ({
  state,
  runAt: new Date(Date.now() + REPOSITORY_VERSION_RETRY_DELAY_MS),
});

/**
 * Whether a request is stale: made against an older repository than one the documentation was
 * already installed from, so running it would downgrade the documentation.
 */
export const isStaleRepositoryRequest = ({
  requestedVersion,
  installedVersion,
}: {
  requestedVersion?: string;
  installedVersion?: string;
}): boolean => Boolean(requestedVersion && installedVersion && installedVersion > requestedVersion);

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
 * same type for the inference ID and repository version (optionally matching `matches`) exists, in
 * which case that task is reused. Failed leftovers of earlier requests are removed so the status only
 * reflects the latest one. A pending task already marked superseded is never reused. Waiting tasks
 * of older repository versions are marked superseded once the new task is scheduled;
 * `mergeSuperseded` lets the new task take over what they carried (e.g. a forced update).
 */
export const scheduleRequestTask = async <P extends RequestTaskParams>({
  taskManager,
  logger,
  taskType,
  params,
  reusePending,
  matches = () => true,
  mergeSuperseded = (requestParams) => requestParams,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  taskType: string;
  params: P;
  reusePending: boolean;
  matches?: (task: ConcreteTaskInstance) => boolean;
  mergeSuperseded?: (requestParams: P, superseded: ConcreteTaskInstance[]) => P;
}): Promise<string> => {
  const { inferenceId } = params;
  if (reusePending) {
    const [pending] = (
      await findTasks({ taskManager, taskType, inferenceId, statuses: PENDING_TASK_STATUSES })
    ).filter(
      (task) =>
        task.state?.superseded !== true &&
        task.params?.repositoryVersion === params.repositoryVersion &&
        matches(task)
    );
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
  const superseded = await findSupersededTasks({
    taskManager,
    taskType,
    inferenceId,
    repositoryVersion: params.repositoryVersion,
  });
  const { id } = await taskManager.schedule({
    taskType,
    params: { ...(superseded.length > 0 ? mergeSuperseded(params, superseded) : params) },
    state: {},
    scope: ['productDoc', getInferenceScope(inferenceId)],
  });
  logger.info(`Task ${id} (${taskType}) scheduled for [${inferenceId}]`);
  await markSupersededTasks({ taskManager, logger, taskType, inferenceId, tasks: superseded });
  return id;
};

/**
 * Tasks of `taskType` for the inference ID that are still waiting to run and were requested against
 * an older repository version than `repositoryVersion`: run later on an older node they would
 * reinstall that older bundle.
 */
export const findSupersededTasks = async ({
  taskManager,
  taskType,
  inferenceId,
  repositoryVersion,
}: {
  taskManager: TaskManagerStartContract;
  taskType: string;
  inferenceId: string;
  repositoryVersion?: string;
}): Promise<ConcreteTaskInstance[]> => {
  if (!repositoryVersion) {
    return [];
  }
  return (
    await findTasks({
      taskManager,
      taskType,
      inferenceId,
      statuses: [TaskStatus.Idle, TaskStatus.Claiming],
    })
  ).filter(
    ({ params }) => params?.repositoryVersion && params.repositoryVersion < repositoryVersion
  );
};

/**
 * Marks `tasks` as superseded once their replacement is scheduled. The tasks are not deleted, since
 * one may already be running; its runner re-reads the marker and stops.
 */
export const markSupersededTasks = async ({
  taskManager,
  logger,
  taskType,
  inferenceId,
  tasks,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  taskType: string;
  inferenceId: string;
  tasks: ConcreteTaskInstance[];
}): Promise<void> => {
  if (tasks.length === 0) {
    return;
  }
  await taskManager.bulkUpdateState(
    tasks.map(({ id }) => id),
    (state) => ({ ...state, superseded: true })
  );
  logger.info(
    `Marked ${tasks.length} pending ${taskType} task(s) for [${inferenceId}] as superseded: requested against an older artifact repository version`
  );
};

/**
 * Clears the superseded marker of a fixed-id task that is about to be ensured again, so a new request
 * (e.g. a forced repair after a rollback) reusing that id runs instead of stopping on the old marker.
 */
export const reviveSupersededTask = async ({
  taskManager,
  logger,
  taskId,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  taskId: string;
}): Promise<void> => {
  if (!(await isTaskSuperseded({ taskManager, taskId }))) {
    return;
  }
  await taskManager.bulkUpdateState([taskId], (state) => ({ ...state, superseded: false }));
  logger.info(`Reviving superseded task ${taskId}`);
};

/** Whether the task was marked superseded since it was claimed; a task that no longer exists is not. */
export const isTaskSuperseded = async ({
  taskManager,
  taskId,
}: {
  taskManager: TaskManagerStartContract;
  taskId: string;
}): Promise<boolean> => {
  try {
    const task = await taskManager.get(taskId);
    return task?.state?.superseded === true;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
};

/** Whether any superseded task carried a forced update, which the replacement then takes over. */
export const anySupersededForced = (superseded: ConcreteTaskInstance[]): boolean =>
  superseded.some(({ params }) => params?.forceUpdate === true);

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
  if (
    tasks.some(({ status, state }) => status !== TaskStatus.Failed && state?.superseded !== true)
  ) {
    return 'pending';
  }
  return tasks.some(({ status }) => status === TaskStatus.Failed) ? 'failed' : 'none';
};

/**
 * Runs `run` under the cluster-wide install lock so that at most one documentation install runs at a
 * time across all tasks and Kibana nodes. When another install holds the lock the run is deferred
 * instead of failing an attempt, handing the task's `state` back unchanged. Errors propagate so Task
 * Manager retries the task with backoff.
 */
export const runTaskUnderInstallLock = async ({
  lockManager,
  run,
  metadata,
  state = {},
}: {
  lockManager: InstallLockManager;
  run: () => Promise<void>;
  metadata?: Record<string, unknown>;
  state?: ConcreteTaskInstance['state'];
}) => {
  const acquired = await tryWithInstallLock({ lockManager, run, metadata });
  return acquired
    ? { state }
    : { state, runAt: new Date(Date.now() + INSTALL_LOCK_RETRY_DELAY_MS) };
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
