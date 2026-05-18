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

/** Subset of TM task fields that UIAM conversion would change if a task were fetched again. */
const taskDocSliceForUiamExclusionCheck = (task: Record<string, unknown>) => ({
  apiKey: task.apiKey,
  uiamApiKey: task.uiamApiKey,
  userScope: task.userScope,
});

interface FirstTestRunExclusionState {
  withKeyId: string;
  noKeyId: string;
  userCreatedKeyTaskId: string;
  firstRunTaskDocSnapshot: {
    withKey: ReturnType<typeof taskDocSliceForUiamExclusionCheck>;
    noKey: ReturnType<typeof taskDocSliceForUiamExclusionCheck>;
    userKey: ReturnType<typeof taskDocSliceForUiamExclusionCheck>;
  };
}

apiTest.describe(
  'Task Manager UIAM API key provisioning (background task)',
  { tag: tags.serverless.observability.complete },
  () => {
    const taskIdsToCleanup: string[] = [];
    /** Filled at the end of the first test; the second test reuses it as the baseline for exclusion checks. */
    let firstTestRunExclusionState: FirstTestRunExclusionState | undefined;

    // Tear down fixture tasks created during this file (best-effort).
    apiTest.afterAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      for (const taskId of taskIdsToCleanup) {
        await deleteTaskManagerTaskSilently(apiClient, cookieHeader, taskId);
      }
    });

    apiTest(
      'provisions UIAM for tasks that still have an ES api key but no UIAM key, and skips tasks with no api key or a user–created api key',
      async ({ apiClient, samlAuth, esClient, requestAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

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

        // Schedule authenticated with a caller–supplied API key so `userScope.apiKeyCreatedByUser`
        // is set (see `getApiKeyAndUserScope` / `EsAndUiamApiKeyStrategy`); `onEsKey` avoids
        // granting a UIAM key on the task so the row still lacks `uiamApiKey` and is a candidate
        // for provisioning until the partition step skips with "created by the user".
        const userCreatedKeyTaskId = await scheduleDisabledFixtureTask({
          apiClient,
          cookieHeader,
          taskIdsToCleanup,
          onEsKey: true,
          apiKeyHeader,
        });

        const withKeyBefore = await readTaskAttributes(esClient, taskDocId(withKeyId));
        const noKeyBefore = await readTaskAttributes(esClient, taskDocId(noKeyId));
        const userKeyBefore = await readTaskAttributes(esClient, taskDocId(userCreatedKeyTaskId));
        expect(withKeyBefore.apiKey).toBeDefined();
        expect(withKeyBefore.uiamApiKey).toBeUndefined();
        expect(
          (withKeyBefore.userScope as { apiKeyCreatedByUser?: boolean } | undefined)
            ?.apiKeyCreatedByUser
        ).toBe(false);
        expect(noKeyBefore.apiKey).toBeUndefined();
        expect(userKeyBefore.apiKey).toBeDefined();
        expect(userKeyBefore.uiamApiKey).toBeUndefined();
        expect(
          (userKeyBefore.userScope as { apiKeyCreatedByUser?: boolean } | undefined)
            ?.apiKeyCreatedByUser
        ).toBe(true);

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
        const userKeyAfter = await readTaskAttributes(esClient, taskDocId(userCreatedKeyTaskId));
        expect(withKeyAfter.apiKey).toBeDefined();
        expect(withKeyAfter.uiamApiKey).toBeDefined();
        expect(noKeyAfter.apiKey).toBeUndefined();
        expect(noKeyAfter.uiamApiKey).toBeUndefined();
        expect(userKeyAfter.apiKey).toBeDefined();
        expect(userKeyAfter.uiamApiKey).toBeUndefined();

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

        const skippedUserKeyStatus = await readUiamTaskProvisioningStatusDoc(
          esClient,
          userCreatedKeyTaskId,
          {
            status: 'skipped',
            entityType: 'task',
            messageIncludes: 'created by the user',
          }
        );
        expect(skippedUserKeyStatus.entityId).toBe(userCreatedKeyTaskId);

        firstTestRunExclusionState = {
          withKeyId,
          noKeyId,
          userCreatedKeyTaskId,
          firstRunTaskDocSnapshot: {
            withKey: taskDocSliceForUiamExclusionCheck(withKeyAfter),
            noKey: taskDocSliceForUiamExclusionCheck(noKeyAfter),
            userKey: taskDocSliceForUiamExclusionCheck(userKeyAfter),
          },
        };
      }
    );

    apiTest(
      'on a later run, still provisions new candidate tasks and leaves tasks with a final provisioning status off the UIAM fetch query',
      async ({ apiClient, samlAuth, esClient, requestAuth }) => {
        expect(firstTestRunExclusionState).toBeDefined();
        const {
          withKeyId: firstTestWithKeyId,
          noKeyId: firstTestNoKeyId,
          userCreatedKeyTaskId: firstTestUserKeyId,
          firstRunTaskDocSnapshot,
        } = firstTestRunExclusionState as FirstTestRunExclusionState;

        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

        const { runs: baselineRuns } = await ensureProvisioningHasQuietNextRun({
          esClient,
          apiClient,
          cookieHeader,
          provisioningTaskId: PROVISIONING_TASK_ID,
          pollIntervalMs: POLL_INTERVAL_MS,
        });

        const withKeyId2 = await scheduleDisabledFixtureTask({
          apiClient,
          cookieHeader,
          taskIdsToCleanup,
          onEsKey: true,
        });

        const noKeyId2 = await scheduleDisabledFixtureTask({
          apiClient,
          cookieHeader,
          taskIdsToCleanup,
          skipRequestForScheduling: true,
        });

        const userCreatedKeyTaskId2 = await scheduleDisabledFixtureTask({
          apiClient,
          cookieHeader,
          taskIdsToCleanup,
          onEsKey: true,
          apiKeyHeader,
        });

        const withKey2Before = await readTaskAttributes(esClient, taskDocId(withKeyId2));
        const noKey2Before = await readTaskAttributes(esClient, taskDocId(noKeyId2));
        const userKey2Before = await readTaskAttributes(esClient, taskDocId(userCreatedKeyTaskId2));
        expect(withKey2Before.apiKey).toBeDefined();
        expect(withKey2Before.uiamApiKey).toBeUndefined();
        expect(
          (withKey2Before.userScope as { apiKeyCreatedByUser?: boolean } | undefined)
            ?.apiKeyCreatedByUser
        ).toBe(false);
        expect(noKey2Before.apiKey).toBeUndefined();
        expect(userKey2Before.apiKey).toBeDefined();
        expect(userKey2Before.uiamApiKey).toBeUndefined();
        expect(
          (userKey2Before.userScope as { apiKeyCreatedByUser?: boolean } | undefined)
            ?.apiKeyCreatedByUser
        ).toBe(true);

        await runSoon({ apiClient, cookieHeader, taskId: PROVISIONING_TASK_ID });
        await pollUntilProvisioningTaskRunsAfterBaseline(
          esClient,
          PROVISIONING_TASK_ID,
          baselineRuns,
          UIAM_KEY_POLL_TIMEOUT_MS,
          POLL_INTERVAL_MS
        );

        const withKeyAfter2 = await readTaskAttributes(esClient, taskDocId(withKeyId2));
        const noKeyAfter2 = await readTaskAttributes(esClient, taskDocId(noKeyId2));
        const userKeyAfter2 = await readTaskAttributes(esClient, taskDocId(userCreatedKeyTaskId2));
        expect(withKeyAfter2.apiKey).toBeDefined();
        expect(withKeyAfter2.uiamApiKey).toBeDefined();
        expect(noKeyAfter2.apiKey).toBeUndefined();
        expect(noKeyAfter2.uiamApiKey).toBeUndefined();
        expect(userKeyAfter2.apiKey).toBeDefined();
        expect(userKeyAfter2.uiamApiKey).toBeUndefined();

        const completedStatus2 = await readUiamTaskProvisioningStatusDoc(esClient, withKeyId2, {
          status: 'completed',
          entityType: 'task',
        });
        expect(completedStatus2.entityId).toBe(withKeyId2);

        const skippedStatus2 = await readUiamTaskProvisioningStatusDoc(esClient, noKeyId2, {
          status: 'skipped',
          entityType: 'task',
          messageIncludes: 'no API key',
        });
        expect(skippedStatus2.entityId).toBe(noKeyId2);

        const skippedUserKeyStatus2 = await readUiamTaskProvisioningStatusDoc(
          esClient,
          userCreatedKeyTaskId2,
          {
            status: 'skipped',
            entityType: 'task',
            messageIncludes: 'created by the user',
          }
        );
        expect(skippedUserKeyStatus2.entityId).toBe(userCreatedKeyTaskId2);

        // We tests that the tasks from the first case are untouched by the second run, so
        // re-read them and check the expected values.
        const withKeyReRead = await readTaskAttributes(esClient, taskDocId(firstTestWithKeyId));
        const noKeyReRead = await readTaskAttributes(esClient, taskDocId(firstTestNoKeyId));
        const userKeyReRead = await readTaskAttributes(esClient, taskDocId(firstTestUserKeyId));
        expect(taskDocSliceForUiamExclusionCheck(withKeyReRead)).toStrictEqual(
          firstRunTaskDocSnapshot.withKey
        );
        expect(taskDocSliceForUiamExclusionCheck(noKeyReRead)).toStrictEqual(
          firstRunTaskDocSnapshot.noKey
        );
        expect(taskDocSliceForUiamExclusionCheck(userKeyReRead)).toStrictEqual(
          firstRunTaskDocSnapshot.userKey
        );
      }
    );
  }
);
