/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import type { RunningTask } from '@kbn/response-ops-api-keys';
import { TASK_SO_NAME } from '../saved_objects';
import type { SerializedConcreteTaskInstance } from '../task';
import { TaskStatus } from '../task';

/**
 * Returns the ids of the pending invalidation SOs whose key was replaced during a task run that is
 * still in progress. That run keeps using the replaced key until it finishes.
 */
export const getSOIdsUsedByRunningTasks = async (
  runningTasksBySOId: Map<string, RunningTask>,
  savedObjectsClient: SavedObjectsClientContract
): Promise<Set<string>> => {
  const soIds = new Set<string>();
  if (runningTasksBySOId.size === 0) {
    return soIds;
  }

  const allTaskIds = Array.from(runningTasksBySOId.values(), (runningTask) => runningTask.taskId);
  const taskIds = [...new Set(allTaskIds)];
  const { saved_objects: tasks } = await savedObjectsClient.bulkGet<
    Pick<SerializedConcreteTaskInstance, 'status' | 'startedAt' | 'retryAt'>
  >(taskIds.map((id) => ({ type: TASK_SO_NAME, id })));

  const now = Date.now();
  const runningTasks = new Map<string, string>();
  for (const task of tasks) {
    if (isSavedObjectErrorResult(task)) {
      continue;
    }
    const { id, attributes } = task;
    if (attributes.status !== TaskStatus.Running || !attributes.startedAt) {
      continue;
    }
    // A run that outlived its retryAt is presumed dead (e.g. its Kibana node crashed).
    if (!attributes.retryAt || Date.parse(attributes.retryAt) <= now) {
      continue;
    }
    runningTasks.set(id, attributes.startedAt);
  }

  for (const [soId, { taskId, taskStartedAt }] of runningTasksBySOId) {
    const startedAt = runningTasks.get(taskId);
    if (startedAt && Date.parse(startedAt) === Date.parse(taskStartedAt)) {
      soIds.add(soId);
    }
  }
  return soIds;
};
