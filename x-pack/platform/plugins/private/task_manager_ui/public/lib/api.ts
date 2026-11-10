/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  TaskManagerUiOverviewResponse,
  TaskManagerUiTaskDetailResponse,
  TaskManagerUiTaskListResponse,
  TaskRunsWindow,
} from '@kbn/task-manager-plugin/common';
import { API_BASE_PATH } from '../constants';

export type TaskListSortField =
  | 'run_at'
  | 'scheduled_at'
  | 'retry_at'
  | 'attempts'
  | 'task_type'
  | 'status';

export interface TaskListQuery {
  taskType?: string;
  status?: string;
  overdue: boolean;
  taskId?: string;
  page: number;
  perPage: number;
  sortField: TaskListSortField;
  sortOrder: 'asc' | 'desc';
}

export class TaskManagerUiApi {
  constructor(private readonly http: HttpSetup) {}

  public getOverview({ start, end }: TaskRunsWindow, signal?: AbortSignal) {
    return this.http.get<TaskManagerUiOverviewResponse>(`${API_BASE_PATH}/overview`, {
      query: { start, end },
      signal,
    });
  }

  /** Lists stored tasks, followed by removed tasks that failed in the window, with their latest failure in the window. */
  public getTasks(
    { taskType, status, overdue, taskId, page, perPage, sortField, sortOrder }: TaskListQuery,
    { start, end }: TaskRunsWindow,
    signal?: AbortSignal
  ) {
    return this.http.get<TaskManagerUiTaskListResponse>(`${API_BASE_PATH}/tasks`, {
      query: {
        start,
        end,
        task_type: taskType,
        status,
        overdue,
        task_id: taskId,
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
      },
      signal,
    });
  }

  public getTask(id: string, { start, end }: TaskRunsWindow, signal?: AbortSignal) {
    return this.http.get<TaskManagerUiTaskDetailResponse>(
      `${API_BASE_PATH}/tasks/${encodeURIComponent(id)}`,
      { query: { start, end }, signal }
    );
  }
}
