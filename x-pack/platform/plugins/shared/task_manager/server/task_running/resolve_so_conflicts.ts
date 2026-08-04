/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isEqual } from 'lodash';
import pRetry, { type Options as PRetryOptions } from 'p-retry';
import type { ConcreteTaskInstance, PartialConcreteTaskInstance } from '../task';
import type { Updatable } from './task_runner';

/** Total attempts = 1 initial + (MAX_ATTEMPTS - 1) retries */
const MAX_ATTEMPTS = 3;

export async function resolveTaskDocumentConflicts(
  opts: ResolveTaskDocumentConflictsOpts
): Promise<void> {
  const label = `${opts.originalTask.taskType}:${opts.taskId}`;
  const tags = [opts.taskId, opts.originalTask.taskType, 'task-doc-resolve-conflict'];
  opts.logger.warn(`Resolving task document version conflict after task run for ${label}`, {
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

  opts.logger.warn(`Resolved task document version conflict after task run for ${label}`, {
    tags,
  });
}

async function resolveTaskDocumentConflictsOnce({
  taskId,
  partialTask,
  originalTask,
  bufferedTaskStore,
  logger,
  attempt,
  maxAttempts,
  label,
  tags,
}: ResolveTaskDocumentConflictsOnceOpts): Promise<void> {
  logger.debug(
    `Resolving task document conflict for task "${taskId}" (attempt ${attempt}/${maxAttempts}).`
  );

  // if current task is not found, consider transient and retry
  const currentTask = await bufferedTaskStore.get(taskId);
  if (currentTask == null) {
    throw Error(`Unable to resolve task document conflicts for task "${taskId}": task not found`);
  }

  // A number of "permanent" conditions can occur that mean we should not retry,
  // so we need to check for those and not retry.

  if (currentTask.ownerId && currentTask.ownerId !== originalTask.ownerId) {
    throwNotRetryableError(
      `Unable to resolve task document conflicts for task "${taskId}": task has been claimed by another worker`
    );
  }

  if (currentTask.attempts && currentTask.attempts !== originalTask.attempts) {
    throwNotRetryableError(
      `Unable to resolve task document conflicts for task "${taskId}": task attempts has been updated by another worker`
    );
  }

  if (
    currentTask.startedAt &&
    currentTask.startedAt?.valueOf() !== originalTask.startedAt?.valueOf()
  ) {
    throwNotRetryableError(
      `Unable to resolve task document conflicts for task "${taskId}": task startedAt has been updated by another worker`
    );
  }

  const updatedTask: PartialConcreteTaskInstance = {
    ...currentTask,
    ...partialTask,
    version: currentTask.version,
    // use the current task's schedule if it has changed from original
    ...(!isEqual(originalTask.schedule, currentTask.schedule)
      ? { schedule: currentTask.schedule }
      : {}),
    // use the current task's runAt if it has changed from original
    ...(originalTask.runAt.valueOf() !== currentTask.runAt.valueOf()
      ? { runAt: currentTask.runAt }
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
