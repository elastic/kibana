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
  TASK_MANAGER_INDEX,
  deleteTaskManagerTaskSilently,
  readInvalidationMarkerKeyIds,
  readTaskAttributes,
  taskDocId,
} from '../lib/helpers';

const PERSISTED_TASK_ID = 'scout-bulk-schedule-persisted';
const OMITTED_TASK_ID = 'scout-bulk-schedule-omitted';
const REJECTED_BULK_TASK_ID = 'scout-bulk-schedule-rejected-bulk';
const UNSUPPORTED_TASK_ID = 'scout-bulk-schedule-unsupported';
const ALL_TASK_IDS = [
  PERSISTED_TASK_ID,
  OMITTED_TASK_ID,
  REJECTED_BULK_TASK_ID,
  UNSUPPORTED_TASK_ID,
];

/**
 * A second registered Task Manager internal type, so the omitted task gets its own key set
 * (keys are granted per task type) and the assertions can tell the two sets apart.
 */
const OMITTED_TASK_TYPE = 'task_manager:mark_removed_tasks_as_unrecognized';
const UNSUPPORTED_TASK_TYPE = 'scout_bulk_schedule_unsupported_type';

apiTest.describe(
  'Task Manager bulkSchedule API keys',
  { tag: tags.serverless.observability.complete },
  () => {
    // Defensive cleanup on both sides: a prior crashed run may have left task docs behind, and
    // deleting a task marks its keys for invalidation, so markers are cleaned after the deletes.
    apiTest.beforeEach(async ({ apiClient, kbnClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      for (const taskId of ALL_TASK_IDS) {
        await deleteTaskManagerTaskSilently(apiClient, cookieHeader, taskId);
      }
      await kbnClient.savedObjects.clean({ types: ['api_key_to_invalidate'] });
    });

    apiTest.afterAll(async ({ apiClient, kbnClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      for (const taskId of ALL_TASK_IDS) {
        await deleteTaskManagerTaskSilently(apiClient, cookieHeader, taskId);
      }
      await kbnClient.savedObjects.clean({ types: ['api_key_to_invalidate'] });
    });

    apiTest(
      'invalidates only the keys granted for a task omitted during local preparation',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        // The second task passes the route schema but fails Task Manager's own interval
        // validation, which happens after its API keys were granted.
        const response = await apiClient.post('internal/task_manager/bulk_schedule', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            tasks: [
              {
                taskType: TEST_TASK_TYPE,
                id: PERSISTED_TASK_ID,
                params: {},
                state: {},
                schedule: { interval: '1h' },
                enabled: false,
              },
              {
                taskType: OMITTED_TASK_TYPE,
                id: OMITTED_TASK_ID,
                params: {},
                state: {},
                schedule: { interval: 'not-an-interval' },
                enabled: false,
              },
            ],
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const scheduled = response.body as Array<{ id: string }>;
        expect(scheduled).toHaveLength(1);
        expect(scheduled[0].id).toBe(PERSISTED_TASK_ID);

        const persisted = await readTaskAttributes(esClient, taskDocId(PERSISTED_TASK_ID));
        const persistedUserScope = persisted.userScope as Record<string, string>;
        expect(persisted.apiKey).toBeDefined();
        expect(persisted.uiamApiKey).toBeDefined();

        const omittedExists = await esClient.exists({
          index: TASK_MANAGER_INDEX,
          id: taskDocId(OMITTED_TASK_ID),
        });
        expect(omittedExists).toBe(false);

        // The omitted task has no entry in the bulk response, but its granted keys must still be
        // marked: one marker for the ES key and one for the UIAM key. The persisted task's keys
        // must not be marked.
        const markerKeyIds = await readInvalidationMarkerKeyIds(esClient);
        expect(markerKeyIds).toHaveLength(2);
        expect(markerKeyIds).not.toContain(persistedUserScope.apiKeyId);
        expect(markerKeyIds).not.toContain(persistedUserScope.uiamApiKeyId);
      }
    );

    apiTest(
      'invalidates every granted key when the bulk contains an unsupported task type',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        // Keys are granted for both task types before the unsupported type is detected, which
        // fails the whole call: nothing is written and both key sets must be marked.
        const response = await apiClient.post('internal/task_manager/bulk_schedule', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            tasks: [
              {
                taskType: TEST_TASK_TYPE,
                id: REJECTED_BULK_TASK_ID,
                params: {},
                state: {},
                schedule: { interval: '1h' },
                enabled: false,
              },
              {
                taskType: UNSUPPORTED_TASK_TYPE,
                id: UNSUPPORTED_TASK_ID,
                params: {},
                state: {},
                schedule: { interval: '1h' },
                enabled: false,
              },
            ],
          },
          responseType: 'json',
        });
        expect(response.statusCode).toBe(500);

        for (const taskId of [REJECTED_BULK_TASK_ID, UNSUPPORTED_TASK_ID]) {
          const exists = await esClient.exists({
            index: TASK_MANAGER_INDEX,
            id: taskDocId(taskId),
          });
          expect(exists).toBe(false);
        }

        // Two granted key sets (one per task type), each producing an ES and a UIAM marker.
        const markerKeyIds = await readInvalidationMarkerKeyIds(esClient);
        expect(markerKeyIds).toHaveLength(4);
      }
    );
  }
);
