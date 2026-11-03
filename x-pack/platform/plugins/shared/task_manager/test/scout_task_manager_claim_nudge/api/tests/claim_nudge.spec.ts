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
import { TASK_MANAGER_CLAIM_NUDGE_INDEX } from '../../../../server/constants';
import {
  COMMON_HEADERS,
  NO_CLAIM_OBSERVATION_MS,
  NUDGE_CLAIM_BUDGET_MS,
  NUDGE_SIGNAL_READY_TIMEOUT_MS,
  NUDGE_TEST_TIMEOUT_MS,
  ONE_HOUR_MS,
  POLL_CYCLE_MAX_AGE_MS,
  POLL_CYCLE_READY_TIMEOUT_MS,
  POLL_INTERVAL_MS,
  RESCHEDULE_EVIDENCE_MS,
  TEST_TASK_TYPE,
} from '../fixtures/constants';

// Local-only: config sets don't apply on Cloud, where default 500ms polling meets the budget alone.
// Failing: See https://github.com/elastic/kibana/issues/295825
apiTest.describe.skip('Task Manager claim nudge', { tag: ['@local-stateful-classic'] }, () => {
  const taskIdsToCleanup: string[] = [];

  // Far enough out that only a nudge can make it run during the test.
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

  // The route reports failures as a 200 `{ id, error }`, so `forced` is asserted.
  const runSoon = async (
    apiClient: ApiClientFixture,
    cookieHeader: CookieHeader,
    taskId: string
  ) => {
    const response = await apiClient.post(`internal/ftr/task_manager/${taskId}/run_soon`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
      // Nudging is opt-in.
      body: { requestImmediateClaim: true },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({ id: taskId, forced: false });
  };

  // Claimed since `runSoon`: not idle, deleted, or rescheduled. Excludes the run's own duration.
  const wasClaimedSince = async (
    apiClient: ApiClientFixture,
    cookieHeader: CookieHeader,
    taskId: string,
    { originalRunAt, runSoonAt }: { originalRunAt: string; runSoonAt: number }
  ) => {
    const response = await getTask(apiClient, cookieHeader, taskId);

    if (response.statusCode === 404) {
      // Only the route's own "not found" means the task ran; an unregistered route also 404s.
      const { message } = (response.body ?? {}) as { message?: string };
      return message === `Task ${taskId} not found`;
    }
    if (response.statusCode !== 200) {
      // An error body has no `status` and would read as claimed; keep polling instead.
      return false;
    }

    const { status, runAt } = response.body as { status: string; runAt: string };
    if (runAt === originalRunAt) {
      return false;
    }

    return status !== 'idle' || new Date(runAt).getTime() > runSoonAt + RESCHEDULE_EVIDENCE_MS;
  };

  // `delete()` resolves on error statuses, so check them or the negative control's task leaks.
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
    async ({ apiClient, samlAuth, esClient }) => {
      apiTest.setTimeout(NUDGE_TEST_TIMEOUT_MS);
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const { taskId: primingTaskId } = await scheduleTaskDueInAnHour(apiClient, cookieHeader);
      const primingRunSoonAt = Date.now();
      await runSoon(apiClient, cookieHeader, primingTaskId);
      // runSoon doesn't await delivery; wait for the priming write, including index creation.
      await expect
        .poll(
          async () => {
            const signal = await esClient.get<{ updated_at: string }>(
              {
                index: TASK_MANAGER_CLAIM_NUDGE_INDEX,
                id: 'global',
              },
              { ignore: [404, 503] }
            );
            return new Date(signal._source?.updated_at ?? 0).getTime();
          },
          { timeout: NUDGE_SIGNAL_READY_TIMEOUT_MS, intervals: [100] }
        )
        .toBeGreaterThanOrEqual(primingRunSoonAt);
      const primedAt = Date.now();
      const { taskId, runAt: originalRunAt } = await scheduleTaskDueInAnHour(
        apiClient,
        cookieHeader
      );

      // Anchor on a cycle an interval after priming settled, so the watcher is past the baseline
      // checkpoint that drops the first nudge, and recent enough to leave the nudge under test
      // room. `_health` can't serve this clock: its snapshot is throttled to the poll interval.
      let cycleStartedAt = 0;
      await expect
        .poll(
          async () => {
            const response = await apiClient.get('api/task_manager/metrics?reset=false', {
              headers: { ...COMMON_HEADERS, ...cookieHeader },
              responseType: 'json',
            });
            expect(response).toHaveStatusCode(200);
            const { metrics } = response.body as {
              metrics?: {
                task_claim?: {
                  timestamp: string;
                  value: { duration_values?: number[] };
                };
              };
            };
            const taskClaim = metrics?.task_claim;
            // Durations are recorded in cycle order, so the last one belongs to this timestamp.
            const cycleDuration = taskClaim?.value.duration_values?.at(-1);
            if (!taskClaim || cycleDuration === undefined) {
              return false;
            }
            // The metric is recorded once the cycle completes, so subtract its own duration.
            cycleStartedAt = new Date(taskClaim.timestamp).getTime() - cycleDuration;
            const cycleAge = Date.now() - cycleStartedAt;
            return (
              cycleStartedAt >= primedAt + POLL_INTERVAL_MS &&
              cycleAge >= 0 &&
              cycleAge < POLL_CYCLE_MAX_AGE_MS
            );
          },
          {
            timeout: POLL_CYCLE_READY_TIMEOUT_MS,
            intervals: [100],
            message: 'no recent poll cycle was observed after priming settled',
          }
        )
        .toBe(true);

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
      // Include runSoon's request time and exclude a claim from the next regular poll.
      const claimedAt = Date.now();
      expect(claimedAt - runSoonAt).toBeLessThan(NUDGE_CLAIM_BUDGET_MS);
      expect(claimedAt).toBeLessThan(cycleStartedAt + POLL_INTERVAL_MS);
    }
  );

  apiTest(
    'a task due in an hour is left untouched without a runSoon',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const { taskId, runAt } = await scheduleTaskDueInAnHour(apiClient, cookieHeader);

      // Negative control: a task this far out isn't claimed without a nudge.
      await new Promise((resolve) => setTimeout(resolve, NO_CLAIM_OBSERVATION_MS));

      const response = await getTask(apiClient, cookieHeader, taskId);
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'idle', runAt });
    }
  );
});
