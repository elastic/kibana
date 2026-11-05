/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { TaskManagerUiApi } from './api';

const RUNS_WINDOW = { start: '2026-11-03T12:00:00.000Z', end: '2026-11-04T12:00:00.000Z' };

describe('TaskManagerUiApi', () => {
  const http = httpServiceMock.createStartContract();
  const api = new TaskManagerUiApi(http);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the overview for the given run window', async () => {
    const { signal } = new AbortController();

    await api.getOverview(RUNS_WINDOW, signal);

    expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/overview', {
      query: RUNS_WINDOW,
      signal,
    });
  });

  it('maps the task list query and run window to snake_case query parameters', async () => {
    await api.getTasks(
      {
        taskType: 'report:execute',
        status: 'failed',
        overdue: true,
        taskId: 'task-1',
        page: 2,
        perPage: 50,
        sortField: 'scheduled_at',
        sortOrder: 'desc',
      },
      RUNS_WINDOW
    );

    expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/tasks', {
      query: {
        ...RUNS_WINDOW,
        task_type: 'report:execute',
        status: 'failed',
        overdue: true,
        task_id: 'task-1',
        page: 2,
        per_page: 50,
        sort_field: 'scheduled_at',
        sort_order: 'desc',
      },
      signal: undefined,
    });
  });

  it('encodes the task id in the task detail path and requests failures for the run window', async () => {
    await api.getTask('Alerting-alerts_invalidate_api_keys/1:2', RUNS_WINDOW);

    expect(http.get).toHaveBeenCalledWith(
      '/internal/task_manager/ui/tasks/Alerting-alerts_invalidate_api_keys%2F1%3A2',
      { query: RUNS_WINDOW, signal: undefined }
    );
  });
});
