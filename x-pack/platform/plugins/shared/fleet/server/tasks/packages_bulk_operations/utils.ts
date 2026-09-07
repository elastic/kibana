/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { v4 as uuidv4 } from 'uuid';

export const TASK_TYPE = 'fleet:packages-bulk-operations';
export const TASK_TITLE = 'Fleet packages bulk operations';
export const TASK_TIMEOUT = '10m';

export interface BulkPackageOperationsTaskState {
  isDone?: boolean;
  error?: { message: string };
  results?: Array<
    | {
        success: true;
        name: string;
      }
    | { success: false; name: string; error: { message: string } }
  >;
  [k: string]: unknown;
}

export interface BulkPackageOperationsTaskParams {
  type: 'bulk_upgrade' | 'bulk_uninstall' | 'bulk_rollback';
}

export async function scheduleBulkOperationTask(
  taskManagerStart: TaskManagerStartContract,
  taskParams: BulkPackageOperationsTaskParams,
  request: KibanaRequest
) {
  const id = uuidv4();
  await taskManagerStart.ensureScheduled(
    {
      id: `${TASK_TYPE}:${id}`,
      scope: ['fleet'],
      params: taskParams,
      taskType: TASK_TYPE,
      runAt: new Date(Date.now() + 3 * 1000),
      state: {},
    },
    { request }
  );

  return id;
}

export async function getBulkOperationTaskResults(
  taskManagerStart: TaskManagerStartContract,
  id: string
) {
  const task = await taskManagerStart.get(`${TASK_TYPE}:${id}`);
  const state: BulkPackageOperationsTaskState = task.state;
  const status = !state?.isDone
    ? 'pending'
    : state?.error || state?.results?.some((r) => !r.success)
    ? 'failed'
    : 'success';
  return {
    status,
    error: state.error,
    results: state.results,
  };
}

export function formatError(err: Error) {
  return { message: err.message };
}
