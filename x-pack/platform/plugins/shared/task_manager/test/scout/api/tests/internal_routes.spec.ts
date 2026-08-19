/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS, TEST_TASK_TYPE } from '../fixtures/constants';

apiTest.describe(
  'Task Manager internal routes',
  { tag: tags.serverless.observability.complete },
  () => {
    const taskIdsToCleanup: string[] = [];

    apiTest.afterAll(async ({ apiClient, samlAuth, kbnClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      for (const taskId of taskIdsToCleanup) {
        await apiClient
          .delete(`internal/task_manager/tasks/${taskId}`, {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
          })
          .catch(() => {});
      }
      await kbnClient.savedObjects.clean({ types: ['api_key_to_invalidate'] });
    });

    apiTest('schedule: creates a task and returns it', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.post('internal/task_manager/schedule', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          task: {
            taskType: TEST_TASK_TYPE,
            params: {},
            state: {},
            // enabled: false so the task is never claimed or executed by the poller
            enabled: false,
          },
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as Record<string, unknown>;
      expect(body.id).toBeDefined();
      expect(body.taskType).toBe(TEST_TASK_TYPE);
      expect(body.enabled).toBe(false);
      taskIdsToCleanup.push(body.id as string);
    });

    apiTest(
      'schedule: creates a task with an interval schedule',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.post('internal/task_manager/schedule', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            task: {
              taskType: TEST_TASK_TYPE,
              params: {},
              state: {},
              schedule: { interval: '1h' },
              // enabled: false so the task is never claimed or executed by the poller
              enabled: false,
            },
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as Record<string, unknown>;
        expect(body.id).toBeDefined();
        expect((body.schedule as Record<string, unknown>)?.interval).toBe('1h');
        taskIdsToCleanup.push(body.id as string);
      }
    );

    apiTest('schedule: returns 400 when taskType is missing', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.post('internal/task_manager/schedule', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          task: {
            params: {},
            state: {},
          },
        },
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('schedule: returns 403 when called by a viewer', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.post('internal/task_manager/schedule', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          task: {
            taskType: TEST_TASK_TYPE,
            params: {},
            state: {},
          },
        },
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest('run_soon: returns 200 for an existing idle task', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const scheduleResponse = await apiClient.post('internal/task_manager/schedule', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          task: {
            taskType: TEST_TASK_TYPE,
            params: {},
            state: {},
            enabled: false,
          },
        },
        responseType: 'json',
      });
      expect(scheduleResponse).toHaveStatusCode(200);
      const taskId = (scheduleResponse.body as Record<string, unknown>).id as string;
      taskIdsToCleanup.push(taskId);

      const runSoonResponse = await apiClient.post(`internal/ftr/task_manager/${taskId}/run_soon`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(runSoonResponse).toHaveStatusCode(200);
      const runSoonBody = runSoonResponse.body as Record<string, unknown>;
      expect(runSoonBody.id).toBe(taskId);
    });

    apiTest('run_soon: returns 403 when called by a viewer', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.post('internal/ftr/task_manager/any-task-id/run_soon', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest('delete: removes an existing task', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const scheduleResponse = await apiClient.post('internal/task_manager/schedule', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          task: {
            taskType: TEST_TASK_TYPE,
            params: {},
            state: {},
            // enabled: false so the task is never claimed or executed by the poller
            enabled: false,
          },
        },
        responseType: 'json',
      });
      expect(scheduleResponse).toHaveStatusCode(200);
      const taskId = (scheduleResponse.body as Record<string, unknown>).id as string;

      const deleteResponse = await apiClient.delete(`internal/task_manager/tasks/${taskId}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(deleteResponse).toHaveStatusCode(200);
      const deleteBody = deleteResponse.body as Record<string, unknown>;
      expect(deleteBody.deleted).toBe(true);
    });

    apiTest('delete: returns 404 for a non-existent task', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.delete('internal/task_manager/tasks/does-not-exist', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest('delete: returns 403 when called by a viewer', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.delete('internal/task_manager/tasks/any-task-id', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(403);
    });
  }
);
