/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { ApiClientFixture, CookieHeader } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS, TEST_TASK_TYPE } from '../fixtures/constants';
import {
  EnsureScheduledOffsetMs,
  EnsureScheduledResetThresholdSecs,
} from '../../../../server/constants';

const THRESHOLD_MS = EnsureScheduledResetThresholdSecs * 1000;
const TEST_TIMEOUT_MS = 4 * THRESHOLD_MS + 60_000;

interface ScheduledTask {
  id: string;
  runAt: string;
  scheduledAt: string;
}

// The offset is tracked per Kibana node, so requests must all reach the same one; Kibana's own
// `ensureScheduled` calls are mostly made at startup, which is long over by the time this runs.
apiTest.describe(
  'Task Manager ensureScheduled runAt offset',
  { tag: ['@local-stateful-classic'] },
  () => {
    const taskIdsToCleanup: string[] = [];

    apiTest.afterAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      for (const taskId of taskIdsToCleanup) {
        await apiClient
          .delete(`internal/task_manager/tasks/${taskId}`, {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
          })
          .catch(() => {});
      }
    });

    async function ensureScheduled(
      apiClient: ApiClientFixture,
      cookieHeader: CookieHeader,
      runAt?: string
    ): Promise<ScheduledTask> {
      const id = uuidV4();
      const response = await apiClient.post('internal/task_manager/schedule', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          task: {
            id,
            taskType: TEST_TASK_TYPE,
            params: {},
            state: {},
            // enabled: false so the task is never claimed, which would move its runAt
            enabled: false,
            ...(runAt ? { runAt } : {}),
          },
          ensureScheduled: true,
          skipRequestForScheduling: true,
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      taskIdsToCleanup.push(id);
      return response.body as ScheduledTask;
    }

    // `runAt` is computed slightly before the store stamps `scheduledAt`, so the measured offset
    // falls a few ms short of the applied one; round it to the nearest offset step.
    function offsetStepsOf({ runAt, scheduledAt }: ScheduledTask): number {
      return Math.round((Date.parse(runAt) - Date.parse(scheduledAt)) / EnsureScheduledOffsetMs);
    }

    async function waitForOffsetReset() {
      await new Promise((resolve) => setTimeout(resolve, THRESHOLD_MS + 1000));
    }

    apiTest.beforeEach(async () => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      await waitForOffsetReset();
    });

    apiTest(
      'spreads out the runAt of tasks scheduled in a burst',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const tasks: ScheduledTask[] = [];
        for (let i = 0; i < 4; i++) {
          tasks.push(await ensureScheduled(apiClient, cookieHeader));
        }

        expect(tasks.map(offsetStepsOf)).toStrictEqual([0, 1, 2, 3]);
      }
    );

    apiTest(
      'resets the offset once calls are further apart than the threshold',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const tasks = [
          await ensureScheduled(apiClient, cookieHeader),
          await ensureScheduled(apiClient, cookieHeader),
        ];

        await waitForOffsetReset();

        tasks.push(await ensureScheduled(apiClient, cookieHeader));
        tasks.push(await ensureScheduled(apiClient, cookieHeader));

        expect(tasks.map(offsetStepsOf)).toStrictEqual([0, 1, 0, 1]);
      }
    );

    apiTest(
      'does not change an explicit runAt, but still counts the call',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const explicitRunAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        await ensureScheduled(apiClient, cookieHeader);
        const explicit = await ensureScheduled(apiClient, cookieHeader, explicitRunAt);
        const afterExplicit = await ensureScheduled(apiClient, cookieHeader);

        expect(explicit.runAt).toBe(explicitRunAt);
        expect(offsetStepsOf(afterExplicit)).toBe(2);
      }
    );
  }
);
