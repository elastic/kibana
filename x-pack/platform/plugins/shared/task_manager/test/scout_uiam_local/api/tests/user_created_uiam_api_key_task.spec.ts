/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import type { Client } from '@elastic/elasticsearch';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS, TEST_TASK_TYPE } from '../fixtures/constants';
import {
  deleteTaskManagerTaskSilently,
  parseTaskState,
  readTaskAttributes,
  taskDocId,
} from '../lib/helpers';

// A user-created Cloud API key is presented as the raw `essu_` secret with no key id,
// exactly as obtained from the Elastic Cloud UI.
const ORG_KEY_HEADERS = {
  ...COMMON_HEADERS,
  Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
};

const TASK_RUN_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 3_000;

/**
 * Polls until the task runner has written its state, which only happens after `run()` has
 * completed. Reaching it proves the poller claimed the task, decrypted its UIAM key, built the
 * user-scoped fake request, and executed the runner: a framework-level failure on that path
 * (e.g. fake request construction) leaves the state untouched and `attempts` incrementing.
 */
const pollUntilTaskHasRun = async (esClient: Client, taskId: string): Promise<void> => {
  const deadline = Date.now() + TASK_RUN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const task = await readTaskAttributes(esClient, taskDocId(taskId));
      const state = parseTaskState(task.state);
      if (state.missing_api_key_retries !== undefined) {
        return;
      }
    } catch {
      // the task doc may be mid-update while being claimed
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Timed out waiting for task ${taskId} to run (user-created UIAM key task)`);
};

// These tests cannot be run on MKI because they rely on the Mock IdP UIAM setup (raw `essu_`
// org-level key) from the local UIAM server config set.
apiTest.describe(
  '[NON-MKI] Task Manager task scheduled with a user-created (external) UIAM API key',
  { tag: tags.serverless.observability.complete },
  () => {
    const taskIdsToCleanup: string[] = [];

    // No `api_key_to_invalidate` cleanup here: this spec never enqueues invalidations (that is
    // what it asserts), so a type-wide wipe would only remove entries other suites rely on.
    apiTest.afterAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      for (const taskId of taskIdsToCleanup) {
        await deleteTaskManagerTaskSilently(apiClient, cookieHeader, taskId);
      }
    });

    apiTest(
      'persists the raw key UIAM-only, executes the task, and never queues the key for invalidation',
      async ({ apiClient, esClient, kbnClient, samlAuth }) => {
        // Scheduling from a request authenticated with the raw `essu_` credential exercises the
        // user-created-key branch of `grantApiKeys` in `EsAndUiamApiKeyStrategy`: the key is
        // reused as-is instead of minting new credentials.
        const scheduleResponse = await apiClient.post('internal/task_manager/schedule', {
          headers: ORG_KEY_HEADERS,
          body: {
            task: {
              taskType: TEST_TASK_TYPE,
              params: {},
              state: {},
              enabled: true,
            },
          },
          responseType: 'json',
        });
        expect(scheduleResponse).toHaveStatusCode(200);
        const taskId = (scheduleResponse.body as { id: string }).id;
        taskIdsToCleanup.push(taskId);

        // The task saved object holds the raw key UIAM-only: no ES API key is minted, the key id
        // is empty (user-created keys carry none), and UIAM's external verdict rides along so the
        // run-time fake request withholds the UIAM shared secret, which UIAM rejects for
        // external keys.
        const taskAttrs = await readTaskAttributes(esClient, taskDocId(taskId));
        expect(taskAttrs.apiKey).toBeUndefined();
        expect(taskAttrs.uiamApiKey).toBeDefined();
        expect(taskAttrs.userScope).toMatchObject({
          apiKeyId: '',
          apiKeyCreatedByUser: true,
          uiamApiKeyExternal: true,
        });
        expect((taskAttrs.userScope as Record<string, unknown>).uiamApiKeyId).toBeUndefined();

        // The task is enabled with no schedule, so the poller claims it right away.
        await pollUntilTaskHasRun(esClient, taskId);

        // After the run the task still holds only the user's raw key: no replacement
        // credential was minted at claim or run time.
        const taskAttrsAfterRun = await readTaskAttributes(esClient, taskDocId(taskId));
        expect(taskAttrsAfterRun.apiKey).toBeUndefined();
        expect(taskAttrsAfterRun.uiamApiKey).toBeDefined();

        // Removing the task must not queue the user-created key for invalidation: its lifecycle
        // (rotation, deletion) remains the user's responsibility.
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const deleteResponse = await apiClient.delete(`internal/task_manager/tasks/${taskId}`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });
        expect(deleteResponse).toHaveStatusCode(200);
        taskIdsToCleanup.splice(taskIdsToCleanup.indexOf(taskId), 1);

        // The delete handler enqueues invalidation entries synchronously, so reading right after
        // the 200 is deterministic for this task's entries. Assert on entries that could only
        // belong to this task's user-created key — an empty `apiKeyId` (user-created keys carry
        // no id) or the raw secret itself — rather than on cluster-wide counts, which other
        // suites and the invalidation poller change concurrently.
        const { saved_objects: pendingInvalidations } = await kbnClient.savedObjects.find({
          type: 'api_key_to_invalidate',
        });
        const entriesForUserCreatedKey = pendingInvalidations.filter((so) => {
          const attributes = so.attributes as { apiKeyId?: string; uiamApiKey?: string };
          return (
            attributes.apiKeyId === '' || attributes.uiamApiKey === MOCK_IDP_UIAM_ORG_ADMIN_API_KEY
          );
        });
        expect(entriesForUserCreatedKey).toHaveLength(0);
      }
    );
  }
);
