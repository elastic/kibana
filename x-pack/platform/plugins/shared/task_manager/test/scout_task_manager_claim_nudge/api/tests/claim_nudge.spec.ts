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
import {
  COMMON_HEADERS,
  NO_CLAIM_OBSERVATION_MS,
  NUDGE_CLAIM_BUDGET_MS,
  NUDGE_TEST_TIMEOUT_MS,
  ONE_HOUR_MS,
  POLL_INTERVAL_MS,
  RESCHEDULE_EVIDENCE_MS,
  TEST_TASK_TYPE,
  WARM_UP_CLAIM_TIMEOUT_MS,
} from '../fixtures/constants';

/**
 * Tagged local-only rather than with `tags.stateful.classic`, which also expands to the Cloud
 * target. Scout only applies custom server config sets to local targets, so on Cloud this suite
 * would run against defaults, where a 500ms poll interval meets the nudge budget on its own.
 */
apiTest.describe('Task Manager claim nudge', { tag: ['@local-stateful-classic'] }, () => {
  const taskIdsToCleanup: string[] = [];

  /** An hour out, so the only thing that can make it run during the test is a claim nudge. */
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
   * The FTR route reports `runSoon` failures as `{ id, error }` with a 200, so only the body proves
   * the call worked: asserting `forced` is what rules an error response out.
   */
  const runSoon = async (
    apiClient: ApiClientFixture,
    cookieHeader: CookieHeader,
    taskId: string
  ) => {
    const response = await apiClient.post(`internal/ftr/task_manager/${taskId}/run_soon`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({ id: taskId, forced: false });
  };

  /**
   * Whether a claim cycle has picked the task up since `runSoon` reset `runAt` to now. Stops at
   * claiming rather than waiting for the run to finish, which would fold the task's own duration
   * into the budget. A claimed task is no longer `idle`, but may already have finished, in which
   * case it has been deleted or had `runAt` pushed minutes out. `originalRunAt` rules out a
   * `runSoon` that silently did nothing.
   */
  const wasClaimedSince = async (
    apiClient: ApiClientFixture,
    cookieHeader: CookieHeader,
    taskId: string,
    { originalRunAt, runSoonAt }: { originalRunAt: string; runSoonAt: number }
  ) => {
    const response = await getTask(apiClient, cookieHeader, taskId);

    if (response.statusCode === 404) {
      // Only the route's own "not found" means the task ran and was removed. A 404 from an
      // unregistered route (`ftr_apis` disabled, path renamed) would otherwise pass instantly.
      const { message } = (response.body ?? {}) as { message?: string };
      return message === `Task ${taskId} not found`;
    }
    if (response.statusCode !== 200) {
      // An error body has no `status`, which would read as "not idle" and pass. Keep polling so
      // a blip is tolerated and a broken route fails on the timeout instead.
      return false;
    }

    const { status, runAt } = response.body as { status: string; runAt: string };
    if (runAt === originalRunAt) {
      return false;
    }

    return status !== 'idle' || new Date(runAt).getTime() > runSoonAt + RESCHEDULE_EVIDENCE_MS;
  };

  /**
   * The nudged cycle that claimed the warm-up task, as observed by this suite. The nudge throttle
   * admits one nudge per poll interval and a nudged cycle resets the poll cadence, so this single
   * timestamp dates both the open throttle window and the poller's phase.
   */
  let warmUpClaimedAt = 0;

  /**
   * The first nudge of the Kibana process also creates the signal index, which on a cold cluster
   * can take most of the claim budget on its own. Pay that cost here instead of inside a timed
   * assertion.
   *
   * Waiting for the claim rather than just the `runSoon` response matters: the response only proves
   * the signal was written, while the throttle window opens when the watcher acts on it.
   */
  apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const { taskId, runAt: originalRunAt } = await scheduleTaskDueInAnHour(apiClient, cookieHeader);

    const runSoonAt = Date.now();
    await runSoon(apiClient, cookieHeader, taskId);

    await expect
      .poll(() => wasClaimedSince(apiClient, cookieHeader, taskId, { originalRunAt, runSoonAt }), {
        timeout: WARM_UP_CLAIM_TIMEOUT_MS,
        intervals: [100],
        message: 'the warm-up task was never claimed, so claim nudging is broken outright',
      })
      .toBe(true);

    warmUpClaimedAt = Date.now();
  });

  /**
   * The negative control's task is still scheduled an hour out when this runs, so a silently
   * failed delete leaks it. `delete()` resolves rather than throws on an error status, so the
   * status has to be checked explicitly. Every task is still attempted before failing.
   */
  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const failures: string[] = [];

    for (const taskId of taskIdsToCleanup) {
      try {
        const response = await apiClient.delete(`internal/task_manager/tasks/${taskId}`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });

        // 404 means the task already ran and Task Manager removed it, which is a clean outcome.
        if (response.statusCode !== 200 && response.statusCode !== 404) {
          failures.push(`${taskId}: HTTP ${response.statusCode}`);
        }
      } catch (err) {
        failures.push(`${taskId}: ${err}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Failed to delete scheduled tasks:\n${failures.join('\n')}`);
    }
  });

  apiTest(
    'runSoon gets a task claimed well before the next poll cycle would',
    async ({ apiClient, samlAuth }) => {
      apiTest.setTimeout(NUDGE_TEST_TIMEOUT_MS);
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      // Both things the warm-up's nudged cycle left behind expire one poll interval after it: the
      // throttle window that would hold the nudge below, and the wait until the next regular cycle.
      // Sitting out that interval is what makes a claim inside the budget the nudge's doing.
      const settleFor = Math.max(0, warmUpClaimedAt + POLL_INTERVAL_MS - Date.now());
      await new Promise((resolve) => setTimeout(resolve, settleFor));

      const { taskId, runAt: originalRunAt } = await scheduleTaskDueInAnHour(
        apiClient,
        cookieHeader
      );

      const runSoonAt = Date.now();
      await runSoon(apiClient, cookieHeader, taskId);

      await expect
        .poll(
          () => wasClaimedSince(apiClient, cookieHeader, taskId, { originalRunAt, runSoonAt }),
          {
            timeout: NUDGE_CLAIM_BUDGET_MS,
            intervals: [100],
            message: 'task was not claimed within the nudge budget',
          }
        )
        .toBe(true);
    }
  );

  apiTest(
    'a task due in an hour is left untouched without a runSoon',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const { taskId, runAt } = await scheduleTaskDueInAnHour(apiClient, cookieHeader);

      // Shows a task this far out is never claimed on its own, so the test above is measuring one
      // that only a nudge could bring forward. That test establishes attribution by syncing to the
      // poll cadence, not through this one, which runs at an arbitrary point in it.
      await new Promise((resolve) => setTimeout(resolve, NO_CLAIM_OBSERVATION_MS));

      const response = await getTask(apiClient, cookieHeader, taskId);
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'idle', runAt });
    }
  );
});
