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
import {
  countActiveTaskManagerEsApiKeys,
  deleteTaskManagerTasksWithoutInvalidationQueue,
  deleteTaskManagerTaskSilently,
  readTaskAttributes,
  taskDocId,
} from '../lib/helpers';
import type { ScheduledTaskWithApiKeyIds } from '../lib/helpers';

const TASK_ID = 'scout-ensure-scheduled-api-key-leak';

apiTest.describe(
  'Task Manager ensureScheduled API keys',
  { tag: tags.serverless.observability.complete },
  () => {
    let taskToCleanup: ScheduledTaskWithApiKeyIds | undefined;

    // Defensive cleanup on both sides: a stale task from a prior crashed run would make the
    // first ensureScheduled call skip granting (the behavior under test) and break the key-count
    // delta. Invalidation markers enqueued by the delete are left for the invalidation task to
    // consume; a type-wide clean would also wipe markers belonging to other suites.
    apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      await deleteTaskManagerTaskSilently(apiClient, cookieHeader, TASK_ID);
    });

    apiTest.afterAll(async ({ apiClient, kbnClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      if (taskToCleanup) {
        await deleteTaskManagerTasksWithoutInvalidationQueue({
          apiClient,
          cookieHeader,
          kbnClient,
          tasks: [taskToCleanup],
        });
      }
    });

    apiTest(
      'grants a single ES + UIAM pair when called repeatedly for the same task',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const ensureScheduled = async (): Promise<ScheduledTaskWithApiKeyIds> => {
          const response = await apiClient.post('internal/task_manager/schedule', {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
            body: {
              task: {
                taskType: TEST_TASK_TYPE,
                id: TASK_ID,
                params: {},
                state: {},
                schedule: { interval: '1h' },
                // enabled: false so the task is never claimed or executed by the poller
                enabled: false,
              },
              ensureScheduled: true,
            },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          return response.body as ScheduledTaskWithApiKeyIds;
        };

        const keysBefore = await countActiveTaskManagerEsApiKeys(esClient);

        taskToCleanup = await ensureScheduled();

        const created = await readTaskAttributes(esClient, taskDocId(TASK_ID));
        const createdUserScope = created.userScope as Record<string, string>;

        expect(created.apiKey).toBeDefined();
        expect(created.uiamApiKey).toBeDefined();
        expect(createdUserScope.apiKeyId).toBeDefined();
        expect(createdUserScope.uiamApiKeyId).toBeDefined();

        const keysAfterFirstCall = await countActiveTaskManagerEsApiKeys(esClient);
        expect(keysAfterFirstCall).toBe(keysBefore + 1);

        // API keys are granted before the task document is written, so an ensureScheduled call for
        // a task that already exists used to mint an ES + UIAM pair and then discard it when the
        // create came back with a version conflict.
        await ensureScheduled();
        await ensureScheduled();

        // The ES key count is the observable half of the pair: both keys are granted in the same
        // call, so no new ES key means no new UIAM key either. UIAM keys cannot be enumerated from
        // a test, so the stored UIAM key id below stands in for the rest.
        const keysAfterRepeatCalls = await countActiveTaskManagerEsApiKeys(esClient);
        expect(keysAfterRepeatCalls).toBe(keysBefore + 1);

        const unchanged = await readTaskAttributes(esClient, taskDocId(TASK_ID));
        const unchangedUserScope = unchanged.userScope as Record<string, string>;

        expect(unchangedUserScope.apiKeyId).toBe(createdUserScope.apiKeyId);
        expect(unchangedUserScope.uiamApiKeyId).toBe(createdUserScope.uiamApiKeyId);
      }
    );
  }
);
