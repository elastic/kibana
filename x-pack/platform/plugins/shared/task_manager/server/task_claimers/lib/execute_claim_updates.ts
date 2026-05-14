/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConcreteTaskInstance, PartialConcreteTaskInstance } from '../../task';
import type { TaskStore } from '../../task_store';
import { isOk } from '../../lib/result_type';

export interface ExecuteClaimUpdatesResult {
  docs: ConcreteTaskInstance[];
  conflicts: number;
  updateErrors: number;
  getErrors: number;
}

interface ExecuteClaimUpdatesOpts {
  taskStore: TaskStore;
  updates: PartialConcreteTaskInstance[];
  logger: Logger;
  logPrefix: string;
}

export async function executeClaimUpdates({
  taskStore,
  updates,
  logger,
  logPrefix,
}: ExecuteClaimUpdatesOpts): Promise<ExecuteClaimUpdatesResult> {
  const updatedTasks: Record<string, PartialConcreteTaskInstance> = {};
  let conflicts = 0;
  let updateErrors = 0;
  let getErrors = 0;

  const updateResults = await taskStore.bulkPartialUpdate(updates);
  for (const updateResult of updateResults) {
    if (isOk(updateResult)) {
      updatedTasks[updateResult.value.id] = updateResult.value;
      continue;
    }

    const { id, type, error, status } = updateResult.error;
    if (status === 409) {
      conflicts += 1;
    } else {
      updateErrors += 1;
      logger.error(
        `${logPrefix} update_failed task_id=${id} task_type=${type} status=${String(
          status ?? 'unknown'
        )} error=${JSON.stringify(error)}`
      );
    }
  }

  const docs = (await taskStore.bulkGet(Object.keys(updatedTasks))).reduce<ConcreteTaskInstance[]>(
    (acc, taskResult) => {
      if (
        isOk(taskResult) &&
        taskResult.value.version === updatedTasks[taskResult.value.id].version
      ) {
        acc.push(taskResult.value);
      } else if (isOk(taskResult)) {
        conflicts += 1;
      } else {
        getErrors += 1;
        logger.error(
          `${logPrefix} get_failed task_id=${taskResult.error.id} task_type=${taskResult.error.type} error=${taskResult.error.error.message}`
        );
      }
      return acc;
    },
    []
  );

  return {
    docs,
    conflicts,
    updateErrors,
    getErrors,
  };
}
