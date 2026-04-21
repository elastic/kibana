/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import {
  deleteTaskManagerTaskSilently,
  ensureProvisioningHasQuietNextRun,
  pollUntilProvisioningTaskRunsAfterBaseline,
  readTaskAttributes,
  readUiamTaskProvisioningStatusDoc,
  runSoon,
  scheduleDisabledFixtureTask,
  taskDocId,
} from '../lib/helpers';

/** Same id as {@link TASK_ID} in UIAM provisioning task server constants. */
const PROVISIONING_TASK_ID = 'uiam_api_key_provisioning';
const UIAM_KEY_POLL_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 3_000;

apiTest.describe(
  'Task Manager UIAM API key provisioning (background task)',
  { tag: tags.serverless.observability.complete },
  () => {
    const taskIdsToCleanup: string[] = [];

    // Tear down fixture tasks created during this file (best-effort).
    apiTest.afterAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      for (const taskId of taskIdsToCleanup) {
        await deleteTaskManagerTaskSilently(apiClient, cookieHeader, taskId);
      }
    });

    apiTest(
      'provisions UIAM for tasks that still have an ES api key but no UIAM key, and skips tasks with no api key',
      async ({ apiClient, samlAuth, esClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        // Wait until next `runAt` is >30m out so TM will not claim the provisioning task during
        // fixture setup. `runs` from here is the baseline for `run_soon` + poll (same as state
        // after quiet window, since no further provisioning execution should occur until then).
        const { runs: baselineRuns } = await ensureProvisioningHasQuietNextRun({
          esClient,
          apiClient,
          cookieHeader,
          provisioningTaskId: PROVISIONING_TASK_ID,
          pollIntervalMs: POLL_INTERVAL_MS,
        });

        const withKeyId = await scheduleDisabledFixtureTask({
          apiClient,
          cookieHeader,
          taskIdsToCleanup,
          onEsKey: true,
        });

        const noKeyId = await scheduleDisabledFixtureTask({
          apiClient,
          cookieHeader,
          taskIdsToCleanup,
          skipRequestForScheduling: true,
        });

        const withKeyBefore = await readTaskAttributes(esClient, taskDocId(withKeyId));
        const noKeyBefore = await readTaskAttributes(esClient, taskDocId(noKeyId));
        expect(withKeyBefore.apiKey).toBeDefined();
        expect(withKeyBefore.uiamApiKey).toBeUndefined();
        expect(noKeyBefore.apiKey).toBeUndefined();

        await runSoon({ apiClient, cookieHeader, taskId: PROVISIONING_TASK_ID });
        await pollUntilProvisioningTaskRunsAfterBaseline(
          esClient,
          PROVISIONING_TASK_ID,
          baselineRuns,
          UIAM_KEY_POLL_TIMEOUT_MS,
          POLL_INTERVAL_MS
        );

        const withKeyAfter = await readTaskAttributes(esClient, taskDocId(withKeyId));
        const noKeyAfter = await readTaskAttributes(esClient, taskDocId(noKeyId));
        expect(withKeyAfter.apiKey).toBeDefined();
        expect(withKeyAfter.uiamApiKey).toBeDefined();
        expect(noKeyAfter.apiKey).toBeUndefined();
        expect(noKeyAfter.uiamApiKey).toBeUndefined();

        const completedStatus = await readUiamTaskProvisioningStatusDoc(esClient, withKeyId, {
          status: 'completed',
          entityType: 'task',
        });
        expect(completedStatus.entityId).toBe(withKeyId);

        const skippedStatus = await readUiamTaskProvisioningStatusDoc(esClient, noKeyId, {
          status: 'skipped',
          entityType: 'task',
          messageIncludes: 'no API key',
        });
        expect(skippedStatus.entityId).toBe(noKeyId);
      }
    );
  }
);
