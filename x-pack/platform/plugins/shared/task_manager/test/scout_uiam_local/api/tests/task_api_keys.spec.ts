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
  deleteTaskManagerTaskSilently,
  readInvalidationMarkerKeyIds,
  readTaskAttributes,
  taskDocId,
} from '../lib/helpers';

apiTest.describe('Task Manager API Keys', { tag: tags.serverless.observability.complete }, () => {
  let createdTaskId: string | undefined;
  let createdTaskKeyIds: string[] = [];

  apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const scheduleResponse = await apiClient.post('internal/task_manager/schedule', {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: {
        task: {
          taskType: TEST_TASK_TYPE,
          params: {},
          state: {},
          // enabled: false so the task is never claimed or executed by the poller
          enabled: false,
        },
      },
      responseType: 'json',
    });
    expect(scheduleResponse).toHaveStatusCode(200);
    const body = scheduleResponse.body as { id: string };
    expect(body.id).toBeDefined();
    createdTaskId = body.id;

    const taskAttrs = await readTaskAttributes(esClient, taskDocId(createdTaskId));
    const userScope = taskAttrs.userScope as Record<string, string>;
    expect(userScope.apiKeyId).toBeDefined();
    expect(userScope.uiamApiKeyId).toBeDefined();
    createdTaskKeyIds = [userScope.apiKeyId, userScope.uiamApiKeyId];
  });

  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    // Safety-net cleanup: remove the task in case a test failed before it got deleted.
    if (createdTaskId) {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      await deleteTaskManagerTaskSilently(apiClient, cookieHeader, createdTaskId);
    }
  });

  apiTest('scheduled task has both apiKey and uiamApiKey', async ({ esClient }) => {
    const taskAttrs = await readTaskAttributes(esClient, taskDocId(createdTaskId!));
    expect(taskAttrs.apiKey).toBeDefined();
    expect(taskAttrs.uiamApiKey).toBeDefined();
  });

  apiTest(
    'when task is removed, apiKey and uiamApiKey are queued for invalidation',
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const pendingBefore = await readInvalidationMarkerKeyIds(esClient);
      for (const keyId of createdTaskKeyIds) {
        expect(pendingBefore).not.toContain(keyId);
      }

      const deleteResponse = await apiClient.delete(
        `internal/task_manager/tasks/${createdTaskId}`,
        { headers: { ...COMMON_HEADERS, ...cookieHeader } }
      );
      expect(deleteResponse).toHaveStatusCode(200);
      createdTaskId = undefined;

      const pendingAfter = await readInvalidationMarkerKeyIds(esClient);
      for (const keyId of createdTaskKeyIds) {
        expect(pendingAfter).toContain(keyId);
      }
    }
  );
});
