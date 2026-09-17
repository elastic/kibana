/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import { DocumentationProduct, type ProductName } from '@kbn/product-doc-common';

export const chunkedTaskStateSchema = schema.object({
  remaining: schema.maybe(schema.arrayOf(schema.string())),
});

export type ChunkedTaskState = TypeOf<typeof chunkedTaskStateSchema>;

export const chunkedTaskStateSchemaByVersion = {
  1: {
    schema: chunkedTaskStateSchema,
    up: (state: Record<string, unknown>) => state,
  },
};

const allProductNames = Object.values(DocumentationProduct) as ProductName[];

export const isProductName = (value: string): value is ProductName =>
  allProductNames.includes(value as ProductName);

// Returning `runAt` makes Task Manager run the task again for the next item, so a run only holds
// a capacity slot for one item and completed items are not redone when a later attempt fails.
export const nextChunkRunResult = (remaining: string[]) =>
  remaining.length > 0 ? { state: { remaining }, runAt: new Date() } : { state: {} };

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
    }
  }

  throw new Error(`Timeout waiting for task ${taskId} to complete.`);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
