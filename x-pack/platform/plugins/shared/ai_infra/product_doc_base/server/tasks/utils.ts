/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  throwUnrecoverableError,
  type ConcreteTaskInstance,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import { DocumentationProduct, type ProductName } from '@kbn/product-doc-common';
import {
  INSTALL_LOCK_RETRY_DELAY_MS,
  tryWithInstallLock,
  type InstallLockManager,
} from '../services/install_lock';

export type { InstallLockManager };

const allProductNames = Object.values(DocumentationProduct) as ProductName[];

// Items are at most every product plus the OpenAPI spec
const itemsSchema = schema.arrayOf(schema.string({ maxLength: 100 }), {
  maxSize: allProductNames.length + 1,
});

export const chunkedTaskStateSchema = schema.object({
  // Time of the request this plan belongs to (ISO 8601); the schedulers clear the state on a new request
  requestedAt: schema.maybe(schema.string({ maxLength: 64 })),
  remaining: schema.maybe(itemsSchema),
  // Failed attempts for the current item
  attempts: schema.maybe(schema.number({ min: 0 })),
});

export const MAX_INSTALL_ITEM_RETRIES = 5;
const INSTALL_ITEM_RETRY_BASE_DELAY_MS = 30_000;
const INSTALL_ITEM_RETRY_MAX_DELAY_MS = 10 * 60 * 1000;

// 30s, 1m, 2m, 4m, 8m
export const installItemRetryDelayMs = (failedAttempts: number) =>
  Math.min(
    INSTALL_ITEM_RETRY_BASE_DELAY_MS * 2 ** (failedAttempts - 1),
    INSTALL_ITEM_RETRY_MAX_DELAY_MS
  );

export type ChunkedTaskState = TypeOf<typeof chunkedTaskStateSchema>;

export const chunkedTaskStateSchemaByVersion = {
  1: {
    schema: chunkedTaskStateSchema,
    up: (state: Record<string, unknown>) => state,
  },
};

export const isProductName = (value: string): value is ProductName =>
  allProductNames.includes(value as ProductName);

/**
 * The persisted plan of a chunked task, or a new plan stamped with the request time. The schedulers
 * clear the task state before `runSoon`, so a run with a plan is always a continuation of it and a
 * run without one is the first run of a request, whose `runAt` (set by `runSoon`) is the request time.
 */
export const getChunkedTaskState = (
  taskInstance: Pick<ConcreteTaskInstance, 'state' | 'runAt'>
): { requestedAt: string; state: ChunkedTaskState } => {
  const state = taskInstance.state as ChunkedTaskState;
  const { requestedAt } = state;
  return requestedAt !== undefined
    ? { requestedAt, state }
    : { requestedAt: taskInstance.runAt.toISOString(), state: {} };
};

/**
 * Clears a chunked task's persisted plan so the next run starts over for a new request. No-op for a
 * task that does not exist; a running task keeps its state (its run result overwrites it) and
 * `runSoon` rejects it anyway.
 */
export const resetChunkedTaskState = async ({
  taskManager,
  taskId,
}: {
  taskManager: TaskManagerStartContract;
  taskId: string;
}): Promise<void> => {
  await taskManager.bulkUpdateState([taskId], () => ({}));
};

// Re-runs the task shortly without consuming an attempt, e.g. while another install holds the lock
const lockRetryAt = () => new Date(Date.now() + INSTALL_LOCK_RETRY_DELAY_MS);

/**
 * Runs `run` under the cluster-wide install lock, deferring the task run when another install holds it.
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
  return acquired ? { state: {} } : { state: {}, runAt: lockRetryAt() };
};

/**
 * Installs the first of `items` under the cluster-wide install lock, so that at most one documentation
 * install runs at a time across all tasks and Kibana nodes. When another install holds the lock the
 * item is kept and the run is deferred instead of failing an attempt. The lock is released between
 * items and does not order operations, so `isSuperseded` is checked under the lock before every item:
 * when a newer request (an uninstall of that item's resource) took effect since this task was
 * requested, the task stops instead of recreating the documentation. A failing item is retried with exponential backoff up to
 * `MAX_INSTALL_ITEM_RETRIES` times, after which the task fails without further Task Manager retries.
 */
export const runInstallChunk = async <T extends string>({
  lockManager,
  logger,
  requestedAt,
  items,
  attempts = 0,
  install,
  isSuperseded,
  metadata,
}: {
  lockManager: InstallLockManager;
  logger: Logger;
  requestedAt: string;
  items: T[];
  attempts?: number;
  install: (item: T) => Promise<unknown>;
  isSuperseded: (item: T) => Promise<boolean>;
  metadata?: Record<string, unknown>;
}) => {
  const [item, ...rest] = items;
  if (!item) {
    return { state: {} };
  }
  let superseded = false;
  let installError: Error | undefined;
  const acquired = await tryWithInstallLock({
    lockManager,
    run: async () => {
      superseded = await isSuperseded(item);
      if (superseded) {
        return;
      }
      try {
        await install(item);
      } catch (e) {
        installError = e as Error;
      }
    },
    metadata: { ...metadata, item },
  });
  if (!acquired) {
    return {
      state: { requestedAt, remaining: items, ...(attempts ? { attempts } : {}) },
      runAt: lockRetryAt(),
    };
  }
  if (superseded) {
    logger.info(`Documentation item [${item}] skipped: a later request superseded this task`);
    return { state: {} };
  }
  if (installError) {
    const failedAttempts = attempts + 1;
    if (failedAttempts > MAX_INSTALL_ITEM_RETRIES) {
      logger.error(
        `Giving up on documentation item [${item}] after ${failedAttempts} attempts: ${installError.message}`
      );
      throwUnrecoverableError(installError);
    }
    const delayMs = installItemRetryDelayMs(failedAttempts);
    logger.warn(
      `Documentation item [${item}] failed (attempt ${failedAttempts}), retrying in ${
        delayMs / 1000
      }s: ${installError.message}`
    );
    return {
      state: { requestedAt, remaining: items, attempts: failedAttempts },
      runAt: new Date(Date.now() + delayMs),
    };
  }
  // Returning `runAt` makes Task Manager run the task again for the next item, so a run only holds
  // a capacity slot for one item and completed items are not redone when a later attempt fails.
  return rest.length > 0
    ? { state: { requestedAt, remaining: rest }, runAt: new Date() }
    : { state: {} };
};

export const getTaskStatus = async ({
  taskManager,
  taskId,
}: {
  taskManager: TaskManagerStartContract;
  taskId: string;
}) => {
  try {
    const taskInstance = await taskManager.get(taskId);
    return taskInstance.status;
  } catch (e) {
    // not found means the task was completed and the entry removed
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return 'not_scheduled';
    }
    throw e;
  }
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
