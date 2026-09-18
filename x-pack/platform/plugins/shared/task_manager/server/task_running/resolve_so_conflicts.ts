/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isEqual } from 'lodash';
import pRetry, { type Options as PRetryOptions } from 'p-retry';
import type {
  ConcreteTaskInstance,
  IntervalSchedule,
  PartialConcreteTaskInstance,
  RruleSchedule,
} from '../task';
import type { Updatable } from './task_runner';

/** Total attempts = 1 initial + (MAX_ATTEMPTS - 1) retries */
const MAX_ATTEMPTS = 3;

export function getTaskReclaimReason(
  currentTask: Pick<ConcreteTaskInstance, 'ownerId' | 'attempts' | 'startedAt'>,
  originalTask: Pick<ConcreteTaskInstance, 'ownerId' | 'attempts' | 'startedAt'>
): string | undefined {
  if (currentTask.ownerId !== originalTask.ownerId) {
    return 'task has been claimed by another worker';
  }

  if (currentTask.attempts !== originalTask.attempts) {
    return 'task attempts has been updated by another worker';
  }

  if (currentTask.startedAt?.valueOf() !== originalTask.startedAt?.valueOf()) {
    return 'task startedAt has been updated by another worker';
  }

  return undefined;
}

export function isVersionConflictError(error: unknown): boolean {
  if (SavedObjectsErrorHelpers.isConflictError(error as Error)) {
    return true;
  }

  const maybeConflict = error as {
    status?: number;
    statusCode?: number;
    error?: { type?: string };
  };

  return (
    maybeConflict.status === 409 ||
    maybeConflict.statusCode === 409 ||
    maybeConflict.error?.type === 'version_conflict_engine_exception'
  );
}

export async function resolveTaskDocumentConflicts(
  opts: ResolveTaskDocumentConflictsOpts
): Promise<void> {
  const label = `${opts.originalTask.taskType}:${opts.taskId}`;
  const tags = [opts.taskId, opts.originalTask.taskType, 'task-doc-resolve-conflict'];
  opts.logger.warn(`Resolving task document version conflict after task run for task "${label}"`, {
    tags,
  });

  try {
    await pRetry(
      (attempt) =>
        resolveTaskDocumentConflictsOnce({
          ...opts,
          attempt,
          maxAttempts: MAX_ATTEMPTS,
          label,
          tags,
        }),
      { retries: MAX_ATTEMPTS - 1, ...opts.pRetryOptions }
    );
  } catch (error) {
    if (error instanceof NotRetryableError) {
      opts.logger.error(
        `Skipping resolving task document version conflict after task run: ${error.message}`,
        { tags }
      );
    } else {
      opts.logger.error(
        `Error resolving task document version conflict after task run: ${error.message}`,
        { tags }
      );
    }

    return;
  }

  opts.logger.warn(`Resolved task document version conflict after task run for task "${label}"`, {
    tags,
  });
}

async function resolveTaskDocumentConflictsOnce({
  taskId,
  partialTask,
  originalTask,
  bufferedTaskStore,
  logger,
  getRunAtForSchedule,
  attempt,
  maxAttempts,
  label,
  tags,
}: ResolveTaskDocumentConflictsOnceOpts): Promise<void> {
  logger.debug(
    `Resolving task document conflict for task "${label}" (attempt ${attempt}/${maxAttempts}).`,
    { tags }
  );

  // if current task is not found, consider transient and retry
  let currentTask: ConcreteTaskInstance;
  try {
    currentTask = await bufferedTaskStore.get(taskId);
  } catch (error) {
    throw Error(`Unable to resolve task document conflicts for task "${label}": ${error.message}`);
  }

  // A number of "permanent" conditions can occur that mean we should not retry,
  // so we need to check for those and not retry.

  const reclaimReason = getTaskReclaimReason(currentTask, originalTask);
  if (reclaimReason) {
    throwNotRetryableError(
      `Unable to resolve task document conflicts for task "${label}": ${reclaimReason}`
    );
  }

  const scheduleChanged = !isEqual(originalTask.schedule, currentTask.schedule);
  const runAtChanged = originalTask.runAt.valueOf() !== currentTask.runAt.valueOf();

  const updatedTask: PartialConcreteTaskInstance = {
    ...currentTask,
    ...partialTask,
    version: currentTask.version,
    // use the current task's schedule if it has changed from original
    ...(scheduleChanged ? { schedule: currentTask.schedule } : {}),
    // use the current task's runAt if it has changed from original
    ...(runAtChanged ? { runAt: currentTask.runAt } : {}),
    // otherwise, if only the schedule changed, the runner's next runAt was derived from the stale
    // schedule, so recompute it from the current one
    ...(!runAtChanged && scheduleChanged && getRunAtForSchedule && currentTask.schedule
      ? { runAt: getRunAtForSchedule(currentTask.schedule) }
      : {}),
  };

  // we've already validated the current task, so we can skip validation
  await bufferedTaskStore.partialUpdate(updatedTask, {
    validate: false,
    doc: currentTask,
  });
}

interface ResolveTaskDocumentConflictsOpts {
  taskId: string;
  partialTask: PartialConcreteTaskInstance;
  originalTask: ConcreteTaskInstance;
  bufferedTaskStore: Updatable;
  logger: Logger;
  /** Provided when `partialTask.runAt` was derived from the schedule rather than returned by the task runner. */
  getRunAtForSchedule?: (schedule: IntervalSchedule | RruleSchedule) => Date;
  pRetryOptions?: PRetryOptions;
}

interface ResolveTaskDocumentConflictsOnceOpts extends ResolveTaskDocumentConflictsOpts {
  attempt: number;
  maxAttempts: number;
  label: string;
  tags: string[];
}

function throwNotRetryableError(message: string): never {
  const error = new NotRetryableError(message);
  throw new pRetry.AbortError(error);
}
class NotRetryableError extends Error {
  constructor(message: string) {
    super(message);
  }
}
