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

const STATUS_PATH = 'internal/task_manager/execution/_status';
const PAUSE_PATH = 'internal/task_manager/execution/_pause';
const RESUME_PATH = 'internal/task_manager/execution/_resume';

interface ExecutionControlState {
  paused: boolean;
  paused_task_types: string[];
  updated_at: string;
  updated_by: string | null;
}

apiTest.describe(
  'Task Manager execution control routes',
  { tag: tags.serverless.observability.complete },
  () => {
    // Always leave execution fully resumed so a failing test can't pause the
    // deployment for the rest of the suite.
    apiTest.afterEach(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      await apiClient
        .post(RESUME_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        })
        .catch(() => {});
    });

    apiTest('_status: returns not paused by default', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.get(STATUS_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as ExecutionControlState;
      expect(body.paused).toBe(false);
      expect(body.paused_task_types).toStrictEqual([]);
    });

    apiTest('_pause / _resume: toggles the global pause', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const headers = { ...COMMON_HEADERS, ...cookieHeader };

      // A bodyless pause pauses everything.
      const pause = await apiClient.post(PAUSE_PATH, { headers, responseType: 'json' });
      expect(pause).toHaveStatusCode(200);
      expect((pause.body as ExecutionControlState).paused).toBe(true);
      expect(typeof (pause.body as ExecutionControlState).updated_by).toBe('string');

      const status = await apiClient.get(STATUS_PATH, { headers, responseType: 'json' });
      expect((status.body as ExecutionControlState).paused).toBe(true);

      const resume = await apiClient.post(RESUME_PATH, { headers, responseType: 'json' });
      expect(resume).toHaveStatusCode(200);
      expect((resume.body as ExecutionControlState).paused).toBe(false);
    });

    apiTest('_pause / _resume: toggles a specific task type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const headers = { ...COMMON_HEADERS, ...cookieHeader };

      const pause = await apiClient.post(PAUSE_PATH, {
        headers,
        body: { task_types: [TEST_TASK_TYPE] },
        responseType: 'json',
      });
      expect(pause).toHaveStatusCode(200);
      // Global pause stays off; only the requested type is paused.
      expect((pause.body as ExecutionControlState).paused).toBe(false);
      expect((pause.body as ExecutionControlState).paused_task_types).toContain(TEST_TASK_TYPE);

      const resume = await apiClient.post(RESUME_PATH, {
        headers,
        body: { task_types: [TEST_TASK_TYPE] },
        responseType: 'json',
      });
      expect(resume).toHaveStatusCode(200);
      expect((resume.body as ExecutionControlState).paused_task_types).not.toContain(
        TEST_TASK_TYPE
      );
    });

    apiTest('_pause: returns 400 for an unknown task type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.post(PAUSE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { task_types: ['does-not-exist'] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body).toMatchObject({
        message: expect.stringContaining('Unknown task types'),
      });
    });

    apiTest('_pause: returns 403 when called by a viewer', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.post(PAUSE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest('_status: returns 403 when called by a viewer', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(STATUS_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });
  }
);
