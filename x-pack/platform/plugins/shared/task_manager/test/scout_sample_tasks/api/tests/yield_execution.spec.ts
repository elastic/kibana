/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
} as const;

interface TaskBody {
  id?: string;
  attempts?: number;
  status?: string;
  state?: { count?: number };
  params?: { phase?: string };
  statusCode?: number;
}

apiTest.describe('Task Manager yield execution', { tag: ['@local-stateful-classic'] }, () => {
  apiTest(
    'keeps an ad-hoc task that yields and resumes the same task',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const headers = { ...HEADERS, ...cookieHeader };

      const scheduled = await apiClient.post('api/sample_tasks/schedule', {
        headers,
        body: {
          task: {
            taskType: 'sampleTask',
            params: {
              yieldExecution: true,
              yieldTimes: 1,
              yieldDelay: '10m',
              nextParams: { phase: 'resumed' },
            },
            state: {},
          },
        },
        responseType: 'json',
      });

      expect(scheduled).toHaveStatusCode(200);
      const taskId = (scheduled.body as TaskBody).id;
      expect(taskId).toStrictEqual(expect.any(String));

      await expect
        .poll(
          async () => {
            const response = await apiClient.get(`api/sample_tasks/task/${taskId}`, {
              headers,
              responseType: 'json',
            });
            return response.body as TaskBody;
          },
          { timeout: 60_000 }
        )
        .toMatchObject({
          id: taskId,
          attempts: 0,
          status: 'idle',
          state: { count: 1 },
          params: { phase: 'resumed' },
        });

      const runSoon = await apiClient.post('api/sample_tasks/run_soon', {
        headers,
        body: { task: { id: taskId } },
        responseType: 'json',
      });
      expect(runSoon).toHaveStatusCode(200);

      await expect
        .poll(
          async () => {
            const response = await apiClient.get(`api/sample_tasks/task/${taskId}`, {
              headers,
              responseType: 'json',
            });
            return response.body as TaskBody;
          },
          { timeout: 60_000 }
        )
        .toMatchObject({ statusCode: 404 });
    }
  );
});
