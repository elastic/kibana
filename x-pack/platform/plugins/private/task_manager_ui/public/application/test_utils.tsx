/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createMemoryHistory, type MemoryHistory } from 'history';
import { render, type RenderResult } from '@testing-library/react';
import { coreMock, type httpServiceMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import type {
  RemovedTaskListItem,
  TaskManagerUiOverviewResponse,
  TaskManagerUiTaskDetailResponse,
  TaskManagerUiTaskListResponse,
  TaskSummary,
  TaskTypeSummary,
} from '@kbn/task-manager-plugin/common';
import { API_BASE_PATH } from '../constants';
import { TaskManagerUiApi } from '../lib/api';
import { TaskManagerUiAppContextProvider } from './app_context';

export type HttpMock = ReturnType<typeof httpServiceMock.createStartContract>;

export const createTaskTypeSummary = (
  overrides: Partial<TaskTypeSummary> = {}
): TaskTypeSummary => ({
  task_type: 'report:execute',
  registered: true,
  tasks: 10,
  overdue: 1,
  by_status: { idle: 8, failed: 2 },
  definition: { title: 'Reporting: execute job', timeout: '2m', max_attempts: 3, cost: 2 },
  runs: {
    success: 6,
    failure: 2,
    failed_tasks: 1,
    avg_duration_ms: 1200,
    p95_duration_ms: 4500,
    last_failure: { at: '2026-11-02T10:00:00.000Z', task_id: 'task-1', message: 'Boom' },
  },
  ...overrides,
});

export const createOverviewResponse = (
  overrides: Partial<TaskManagerUiOverviewResponse> = {}
): TaskManagerUiOverviewResponse => ({
  generated_at: '2026-11-02T12:00:00.000Z',
  window: { start: '2026-11-01T12:00:00.000Z', end: '2026-11-02T12:00:00.000Z' },
  event_log_available: true,
  totals: { tasks: 10, overdue: 1, by_status: { idle: 8, failed: 2 } },
  nodes: [{ id: 'node-1', last_seen: '2026-11-02T11:59:50.000Z' }],
  execution_control: { paused: false, paused_task_types: [] },
  excluded_task_types: [],
  task_types: [createTaskTypeSummary()],
  ...overrides,
});

export const createTaskSummary = (overrides: Partial<TaskSummary> = {}): TaskSummary => ({
  id: 'task-1',
  task_type: 'report:execute',
  status: 'failed',
  enabled: true,
  run_at: '2026-11-02T11:00:00.000Z',
  scheduled_at: '2026-11-02T11:00:00.000Z',
  started_at: null,
  retry_at: null,
  attempts: 3,
  schedule: { interval: '1h' },
  owner_id: null,
  partition: 12,
  priority: 50,
  ...overrides,
});

export const createRemovedTaskListItem = (
  overrides: Partial<RemovedTaskListItem> = {}
): RemovedTaskListItem => ({
  id: 'removed-task',
  task_type: 'report:execute',
  removed: true,
  last_run: {
    at: '2026-11-02T11:00:00.000Z',
    outcome: 'failure',
    error_message: 'error indexing documents',
  },
  ...overrides,
});

export const createTaskListResponse = (
  tasks: TaskSummary[] = [createTaskSummary()],
  removedTasks: RemovedTaskListItem[] = []
): TaskManagerUiTaskListResponse => ({
  page: 1,
  per_page: 20,
  total: tasks.length + removedTasks.length,
  tasks: [...tasks.map((task) => ({ ...task, removed: false as const })), ...removedTasks],
});

export const createTaskDetailResponse = (
  overrides: Partial<TaskManagerUiTaskDetailResponse> = {}
): TaskManagerUiTaskDetailResponse => ({
  task: createTaskSummary(),
  task_type: 'report:execute',
  definition: { title: 'Reporting: execute job', timeout: '2m', max_attempts: 3, cost: 2 },
  explanation: { verdict: 'blocked', reasons: [{ code: 'failed', attempts: 3, max_attempts: 3 }] },
  event_log_available: true,
  recent_runs: [
    {
      timestamp: '2026-11-02T11:00:05.000Z',
      outcome: 'failure',
      duration_ms: 1500,
      schedule_delay_ms: 200,
      error_message: 'Boom',
      node_id: 'node-1',
    },
  ],
  ...overrides,
});

export const createHttpError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { body: { statusCode, message } });

interface MockResponses {
  overview?: TaskManagerUiOverviewResponse | Error;
  tasks?: TaskManagerUiTaskListResponse | Error;
  task?: TaskManagerUiTaskDetailResponse | Error;
}

const getMockResponse = (path: string, responses: MockResponses) => {
  switch (path) {
    case `${API_BASE_PATH}/overview`:
      return responses.overview;
    case `${API_BASE_PATH}/tasks`:
      return responses.tasks;
    default:
      return responses.task;
  }
};

export const mockHttpGet = (http: HttpMock, responses: MockResponses) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    const response = getMockResponse(path, responses);
    if (response instanceof Error) {
      throw response;
    }
    return response;
  });
};

export const createAppServicesMock = () => {
  const { uiSettings, notifications } = coreMock.createStart();
  const data = dataPluginMock.createStartContract();
  jest.mocked(data.query.timefilter.history.get).mockReturnValue([]);
  return { uiSettings, notifications, data };
};

export const renderWithProviders = (
  ui: React.ReactElement,
  http: HttpMock,
  { path = '/' }: { path?: string } = {}
): RenderResult & { history: MemoryHistory } => {
  const queryClient = new QueryClient({
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  const history = createMemoryHistory({ initialEntries: [path] });
  return {
    history,
    ...render(
      <MockAppHeaderProvider>
        <QueryClientProvider client={queryClient}>
          <TaskManagerUiAppContextProvider
            api={new TaskManagerUiApi(http)}
            {...createAppServicesMock()}
          >
            <Router history={history}>{ui}</Router>
          </TaskManagerUiAppContextProvider>
        </QueryClientProvider>
      </MockAppHeaderProvider>
    ),
  };
};
