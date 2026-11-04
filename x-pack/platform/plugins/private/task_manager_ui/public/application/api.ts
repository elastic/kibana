/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  GetTaskResponse,
  ListTasksResponse,
  TaskTreeResponse,
  TaskTypesResponse,
} from '@kbn/task-manager-plugin/common';
import {
  TASKS_ROUTE,
  TASK_ROUTE,
  TASK_TREE_ROUTE,
  TASK_TYPES_ROUTE,
} from '@kbn/task-manager-plugin/common';

export interface ListTasksParams {
  statuses: string[];
  taskType?: string;
  id?: string;
  size?: number;
}

export interface TasksApi {
  listTasks(params: ListTasksParams, signal?: AbortSignal): Promise<ListTasksResponse>;
  getTask(id: string, signal?: AbortSignal): Promise<GetTaskResponse>;
  getTree(rootId: string, signal?: AbortSignal): Promise<TaskTreeResponse>;
  getTaskTypes(signal?: AbortSignal): Promise<TaskTypesResponse>;
}

export const createTasksApi = (http: HttpStart): TasksApi => ({
  listTasks: ({ statuses, taskType, id, size }, signal) =>
    http.get<ListTasksResponse>(TASKS_ROUTE, {
      signal,
      query: {
        ...(statuses.length ? { status: statuses.join(',') } : {}),
        ...(taskType ? { task_type: taskType } : {}),
        ...(id ? { id } : {}),
        ...(size ? { size } : {}),
      },
    }),
  getTask: (id, signal) =>
    http.get<GetTaskResponse>(`${TASK_ROUTE}/${encodeURIComponent(id)}`, { signal }),
  getTree: (rootId, signal) =>
    http.get<TaskTreeResponse>(`${TASK_TREE_ROUTE}/${encodeURIComponent(rootId)}`, { signal }),
  getTaskTypes: (signal) => http.get<TaskTypesResponse>(TASK_TYPES_ROUTE, { signal }),
});
