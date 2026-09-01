/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS, TEST_TASK_TYPE } from '../fixtures/constants';
import {
  TASK_MANAGER_INDEX,
  deleteTaskManagerTasksWithoutInvalidationQueue,
  deleteTaskManagerTaskSilently,
  queryTaskManagerEsApiKeysByType,
  readInvalidationMarkerKeyIds,
  readTaskAttributes,
  taskDocId,
} from '../lib/helpers';
import type { ScheduledTaskWithApiKeyIds } from '../lib/helpers';

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

/**
 * The keys granted for the tasks under test never land on a task document, so their ids can only
 * be captured by diffing the type-scoped key listing across the scheduling call.
 */
const diffGrantedKeys = (
  before: Array<{ id: string; invalidated: boolean }>,
  after: Array<{ id: string; invalidated: boolean }>
) => {
  const beforeIds = new Set(before.map(({ id }) => id));
  return after.filter(({ id }) => !beforeIds.has(id));
};

/**
 * The granted key must be queued for invalidation. Right after the scheduling call that is a
 * marker saved object; if the invalidation task consumed the marker in the meantime, the key
 * itself must already be revoked.
 */
const expectKeyMarkedOrInvalidated = async (
  esClient: Client,
  markerKeyIds: string[],
  taskType: string,
  keyId: string
) => {
  if (markerKeyIds.includes(keyId)) {
    return;
  }
  const keys = await queryTaskManagerEsApiKeysByType(esClient, taskType);
  expect(keys.find(({ id }) => id === keyId)?.invalidated).toBe(true);
};

apiTest.describe(
  'Task Manager bulkSchedule API keys',
  { tag: tags.serverless.observability.complete },
  () => {
    const tasksToCleanup: ScheduledTaskWithApiKeyIds[] = [];

    // Defensive cleanup on both sides: a prior crashed run may have left task docs behind. The
    // deletes enqueue invalidation markers for the deleted tasks' keys; those are left for the
    // invalidation task to consume (their designed lifecycle) rather than cleaned type-wide,
    // which would also wipe markers belonging to other suites on the shared server.
    apiTest.beforeEach(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      for (const taskId of ALL_TASK_IDS) {
        await deleteTaskManagerTaskSilently(apiClient, cookieHeader, taskId);
      }
    });

    apiTest.afterEach(async ({ apiClient, kbnClient, samlAuth }) => {
      if (tasksToCleanup.length === 0) {
        return;
      }

      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      await deleteTaskManagerTasksWithoutInvalidationQueue({
        apiClient,
        cookieHeader,
        kbnClient,
        tasks: tasksToCleanup,
      });
      tasksToCleanup.length = 0;
    });

    apiTest.afterAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      for (const taskId of ALL_TASK_IDS) {
        await deleteTaskManagerTaskSilently(apiClient, cookieHeader, taskId);
      }
    });

    apiTest(
      'invalidates only the keys granted for a task omitted during local preparation',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const omittedTypeKeysBefore = await queryTaskManagerEsApiKeysByType(
          esClient,
          OMITTED_TASK_TYPE
        );

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
        tasksToCleanup.push(...(response.body as ScheduledTaskWithApiKeyIds[]));

        const persisted = await readTaskAttributes(esClient, taskDocId(PERSISTED_TASK_ID));
        const persistedUserScope = persisted.userScope as Record<string, string>;
        expect(persisted.apiKey).toBeDefined();
        expect(persisted.uiamApiKey).toBeDefined();

        const omittedExists = await esClient.exists({
          index: TASK_MANAGER_INDEX,
          id: taskDocId(OMITTED_TASK_ID),
        });
        expect(omittedExists).toBe(false);

        // Exactly one ES key was granted for the omitted task's type during this call.
        const grantedForOmitted = diffGrantedKeys(
          omittedTypeKeysBefore,
          await queryTaskManagerEsApiKeysByType(esClient, OMITTED_TASK_TYPE)
        );
        expect(grantedForOmitted).toHaveLength(1);

        // The omitted task has no entry in the bulk response, but its granted key must still be
        // queued for invalidation, while the persisted task's keys must be left alone.
        const markerKeyIds = await readInvalidationMarkerKeyIds(esClient);
        await expectKeyMarkedOrInvalidated(
          esClient,
          markerKeyIds,
          OMITTED_TASK_TYPE,
          grantedForOmitted[0].id
        );
        expect(markerKeyIds).not.toContain(persistedUserScope.apiKeyId);
        expect(markerKeyIds).not.toContain(persistedUserScope.uiamApiKeyId);

        const persistedTypeKeys = await queryTaskManagerEsApiKeysByType(esClient, TEST_TASK_TYPE);
        expect(
          persistedTypeKeys.find(({ id }) => id === persistedUserScope.apiKeyId)?.invalidated
        ).toBe(false);
      }
    );

    apiTest(
      'invalidates every granted key when the bulk contains an unsupported task type',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const supportedTypeKeysBefore = await queryTaskManagerEsApiKeysByType(
          esClient,
          TEST_TASK_TYPE
        );
        const unsupportedTypeKeysBefore = await queryTaskManagerEsApiKeysByType(
          esClient,
          UNSUPPORTED_TASK_TYPE
        );

        // Keys are granted for both task types before the unsupported type is detected, which
        // fails the whole call: nothing is written and both key sets must be queued.
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

        const grantedForSupported = diffGrantedKeys(
          supportedTypeKeysBefore,
          await queryTaskManagerEsApiKeysByType(esClient, TEST_TASK_TYPE)
        );
        const grantedForUnsupported = diffGrantedKeys(
          unsupportedTypeKeysBefore,
          await queryTaskManagerEsApiKeysByType(esClient, UNSUPPORTED_TASK_TYPE)
        );
        expect(grantedForSupported).toHaveLength(1);
        expect(grantedForUnsupported).toHaveLength(1);

        const markerKeyIds = await readInvalidationMarkerKeyIds(esClient);
        await expectKeyMarkedOrInvalidated(
          esClient,
          markerKeyIds,
          TEST_TASK_TYPE,
          grantedForSupported[0].id
        );
        await expectKeyMarkedOrInvalidated(
          esClient,
          markerKeyIds,
          UNSUPPORTED_TASK_TYPE,
          grantedForUnsupported[0].id
        );
      }
    );

    apiTest(
      'keeps separately granted keys correlated with id-less tasks',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const firstTypeKeysBefore = await queryTaskManagerEsApiKeysByType(esClient, TEST_TASK_TYPE);
        const secondTypeKeysBefore = await queryTaskManagerEsApiKeysByType(
          esClient,
          OMITTED_TASK_TYPE
        );

        const response = await apiClient.post('internal/task_manager/bulk_schedule', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            tasks: [
              {
                taskType: TEST_TASK_TYPE,
                params: {},
                state: {},
                schedule: { interval: '1h' },
                enabled: false,
              },
              {
                taskType: OMITTED_TASK_TYPE,
                params: {},
                state: {},
                schedule: { interval: '1h' },
                enabled: false,
              },
            ],
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const scheduled = response.body as ScheduledTaskWithApiKeyIds[];
        expect(scheduled).toHaveLength(2);
        tasksToCleanup.push(...scheduled);

        const [firstTask, secondTask] = scheduled;
        expect(firstTask.id).not.toBe('');
        expect(secondTask.id).not.toBe('');
        expect(firstTask.id).not.toBe(secondTask.id);
        expect(firstTask.taskType).toBe(TEST_TASK_TYPE);
        expect(secondTask.taskType).toBe(OMITTED_TASK_TYPE);
        expect(firstTask.userScope?.apiKeyId).toBeDefined();
        expect(secondTask.userScope?.apiKeyId).toBeDefined();
        expect(firstTask.userScope?.uiamApiKeyId).toBeDefined();
        expect(secondTask.userScope?.uiamApiKeyId).toBeDefined();
        expect(firstTask.userScope?.apiKeyId).not.toBe(secondTask.userScope?.apiKeyId);
        expect(firstTask.userScope?.uiamApiKeyId).not.toBe(secondTask.userScope?.uiamApiKeyId);

        const grantedForFirstType = diffGrantedKeys(
          firstTypeKeysBefore,
          await queryTaskManagerEsApiKeysByType(esClient, TEST_TASK_TYPE)
        );
        const grantedForSecondType = diffGrantedKeys(
          secondTypeKeysBefore,
          await queryTaskManagerEsApiKeysByType(esClient, OMITTED_TASK_TYPE)
        );
        expect(grantedForFirstType).toHaveLength(1);
        expect(grantedForSecondType).toHaveLength(1);
        expect(firstTask.userScope?.apiKeyId).toBe(grantedForFirstType[0].id);
        expect(secondTask.userScope?.apiKeyId).toBe(grantedForSecondType[0].id);
      }
    );
  }
);
