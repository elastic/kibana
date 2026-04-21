/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '../../task';
import type { ApiKeyToConvert } from '../types';

export interface SkippedTaskForUiamObservability {
  taskId: string;
  message: string;
}

export interface PartitionedTasksForUiamConversion {
  apiKeysToConvert: ApiKeyToConvert[];
  tasksById: Map<string, ConcreteTaskInstance>;
  /** Per-task skip reasons for observability status docs (same cardinality as `skippedInBatch`). */
  skippedTaskDetails: SkippedTaskForUiamObservability[];
  skippedInBatch: number;
  hasMoreToUpdate: boolean;
}

export const partitionFetchedTasksForUiamConversion = (
  docs: ReadonlyArray<unknown>,
  fetchBatchSize: number
): PartitionedTasksForUiamConversion => {
  const apiKeysToConvert: ApiKeyToConvert[] = [];
  const tasksById = new Map<string, ConcreteTaskInstance>();
  const skippedTaskDetails: SkippedTaskForUiamObservability[] = [];
  let skippedInBatch = 0;

  for (const doc of docs) {
    const task = doc as ConcreteTaskInstance;
    if (!task.apiKey) {
      skippedInBatch++;
      skippedTaskDetails.push({
        taskId: task.id,
        message: 'The task has no API key',
      });
      continue;
    }
    if (task.uiamApiKey && task.userScope?.uiamApiKeyId) {
      skippedInBatch++;
      skippedTaskDetails.push({
        taskId: task.id,
        message: 'The task already has a UIAM API key',
      });
      continue;
    }
    apiKeysToConvert.push({ taskId: task.id, apiKey: task.apiKey });
    tasksById.set(task.id, task);
  }

  return {
    apiKeysToConvert,
    tasksById,
    skippedTaskDetails,
    skippedInBatch,
    hasMoreToUpdate: docs.length >= fetchBatchSize,
  };
};
