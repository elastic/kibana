/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isEqual } from 'lodash';
import pRetry from 'p-retry';
import type { ConcreteTaskInstance, PartialConcreteTaskInstance } from '../task';
import type { Updatable } from './task_runner';

/** Total attempts = 1 initial + (MAX_ATTEMPTS - 1) retries */
const MAX_ATTEMPTS = 3;

export async function resolveTaskDocumentConflicts(
  opts: ResolveTaskDocumentConflictsOpts
): Promise<void> {
  await pRetry(
    (attempt) => resolveTaskDocumentConflictsOnce({ ...opts, attempt, maxAttempts: MAX_ATTEMPTS }),
    { retries: MAX_ATTEMPTS - 1 }
  );
}

async function resolveTaskDocumentConflictsOnce({
  taskId,
  partialTask,
  originalTask,
  bufferedTaskStore,
  logger,
  attempt,
  maxAttempts,
}: ResolveTaskDocumentConflictsOnceOpts): Promise<void> {
  logger.debug(
    `Resolving task document conflict for task "${taskId}" (attempt ${attempt}/${maxAttempts}).`
  );

  const currentTask = await bufferedTaskStore.get(taskId);
  if (currentTask == null) {
    throw new Error(
      `Unable to resolve task document conflicts for task "${taskId}": task not found`
    );
  }

  // Need to add a check to see if the task got picked up by another
  // worker, which means we probably want to abandon this completely.
  // This shouldn't be needed as the task would have expired would have
  // not been updated, but just in case ...

  if (currentTask.ownerId !== originalTask.ownerId) {
    throw new Error(
      `Unable to resolve task document conflicts for task "${taskId}": task has been claimed by another worker`
    );
  }

  if (currentTask.attempts !== originalTask.attempts) {
    throw new Error(
      `Unable to resolve task document conflicts for task "${taskId}": task attempts has been updated by another worker`
    );
  }

  if (currentTask.startedAt?.valueOf() !== originalTask.startedAt?.valueOf()) {
    throw new Error(
      `Unable to resolve task document conflicts for task "${taskId}": task startedAthas been updated by another worker`
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
}

interface ResolveTaskDocumentConflictsOnceOpts extends ResolveTaskDocumentConflictsOpts {
  attempt: number;
  maxAttempts: number;
}
