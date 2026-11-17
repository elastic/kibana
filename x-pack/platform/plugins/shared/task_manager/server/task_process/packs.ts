/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeclinedRunError } from '../task_running/errors';
import type { TaskHost } from '../task_type_module';
import type { ConcreteTaskInstance } from '../task';

/**
 * Ids of the packs a run needs, read from the task instance it was scheduled with. Without a hook,
 * or when a call returns `undefined` (the ids were not resolvable for this particular run), a task
 * type gets every pack a worker's bundle declares, which is the pre-pack behavior. Returning `[]`
 * is different from returning `undefined`: `[]` says the run needs no pack at all.
 */
export type TaskTypePackSelector = (
  taskInstance: ConcreteTaskInstance
) => string[] | undefined | Promise<string[] | undefined>;

/**
 * The ids a worker was initialized with (`init.packs`) against the ids a specific run needs. A run
 * needs more than the worker has when it is reused across runs of a task type whose `getPacks`
 * selects differently per instance, or when the worker is one Main dispatched before a definition
 * grew the packs it requires. Either way the worker is the one source of truth for what it actually
 * loaded, not what Main asked for.
 */
export const findMissingPacks = (required: string[], loaded: string[] | undefined): string[] => {
  if (!loaded) return [];
  const have = new Set(loaded);
  return required.filter((id) => !have.has(id));
};

/**
 * A check a module runs itself, once per run, before it does anything with a pack's contribution:
 * ids the run needs that this worker did not load reject the run with a warning naming them, so
 * Main dispatches again with the larger set instead of the worker behaving as if nothing changed.
 */
export const createPackGuard =
  ({
    requiredPacks,
    logger,
    taskType,
  }: {
    requiredPacks?: TaskTypePackSelector;
    logger: { warn: (message: string) => void };
    taskType: string;
  }) =>
  async (
    taskInstance: ConcreteTaskInstance,
    host: Pick<TaskHost, 'loadedPacks'>
  ): Promise<void> => {
    if (!requiredPacks) return;
    const required = await requiredPacks(taskInstance);
    if (!required) return;
    const missing = findMissingPacks(required, host.loadedPacks);
    if (missing.length) {
      logger.warn(
        `${taskType}: this task process did not load pack(s) this run needs, so it is declined: ${missing.join(
          ', '
        )}`
      );
      throw new DeclinedRunError(`The task process did not load pack(s) [${missing.join(', ')}]`, {
        missingPacks: missing,
      });
    }
  };
