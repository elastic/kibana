/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { ApiClientFixture, CookieHeader } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import {
  COMMON_HEADERS,
  NUDGE_BUDGET_MS,
  ONE_HOUR_MS,
  TEST_TASK_TYPE,
} from '../fixtures/constants';

apiTest.describe('Task Manager claim nudge', { tag: tags.stateful.classic }, () => {
  const taskIdsToCleanup: string[] = [];

  /**
   * Creates a task that regular polling will not claim for an hour, so the only thing that can
   * make it run during the test is a claim nudge.
   */
  const scheduleTaskDueInAnHour = async (
    apiClient: ApiClientFixture,
    cookieHeader: CookieHeader
  ) => {
    const taskId = uuidV4();

    const response = await apiClient.post('internal/task_manager/schedule', {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: {
        task: {
          id: taskId,
          taskType: TEST_TASK_TYPE,
          params: {},
          state: {},
          runAt: new Date(Date.now() + ONE_HOUR_MS).toISOString(),
        },
        skipRequestForScheduling: true,
      },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    taskIdsToCleanup.push(taskId);

    const { runAt } = response.body as { runAt: string };
    return { taskId, runAt };
  };

  const getTask = (apiClient: ApiClientFixture, cookieHeader: CookieHeader, taskId: string) =>
    apiClient.get(`internal/ftr/task_manager/${taskId}`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

  /**
   * Whether a claim cycle has picked the task up since `runSoon` reset its `runAt` to now. Claiming
   * is what the nudge is responsible for, so the assertion deliberately stops there rather than
   * waiting for the run to finish, which would fold the task's own duration into the budget.
   *
   * A claimed task is no longer `idle`; by the time it is polled it may already have finished, in
   * which case Task Manager has either deleted it or pushed `runAt` minutes into the future.
   */
  const wasClaimedSince = async (
    apiClient: ApiClientFixture,
    cookieHeader: CookieHeader,
    taskId: string,
    runSoonAt: number
  ) => {
    const response = await getTask(apiClient, cookieHeader, taskId);

    if (response.statusCode === 404) {
      return true;
    }

    const { status, runAt } = response.body as { status: string; runAt: string };
    return status !== 'idle' || new Date(runAt).getTime() > runSoonAt + NUDGE_BUDGET_MS;
  };

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

  apiTest(
    'runSoon gets a task claimed well before the next poll cycle would',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const { taskId } = await scheduleTaskDueInAnHour(apiClient, cookieHeader);

      const runSoonAt = Date.now();
      const runSoonResponse = await apiClient.post(`internal/ftr/task_manager/${taskId}/run_soon`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(runSoonResponse).toHaveStatusCode(200);

      await expect
        .poll(() => wasClaimedSince(apiClient, cookieHeader, taskId, runSoonAt), {
          timeout: NUDGE_BUDGET_MS,
          intervals: [100],
        })
        .toBe(true);
    }
  );

  apiTest(
    'a task due in an hour is left untouched without a runSoon',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const { taskId, runAt } = await scheduleTaskDueInAnHour(apiClient, cookieHeader);

      // The negative control for the test above: nothing claims the task inside the same budget,
      // so meeting that budget there can only be the nudge and not a regular poll cycle.
      await new Promise((resolve) => setTimeout(resolve, NUDGE_BUDGET_MS));

      const response = await getTask(apiClient, cookieHeader, taskId);
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'idle', runAt });
    }
  );
});
