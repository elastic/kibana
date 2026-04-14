/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe('Task Manager API Keys', { tag: tags.serverless.observability.complete }, () => {
  let createdTaskId: string;

  apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const scheduleResponse = await apiClient.post('internal/task_manager/schedule', {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: {
        task: {
          taskType: 'task_manager:noop',
          params: {},
          state: {},
        },
      },
      responseType: 'json',
    });
    expect(scheduleResponse).toHaveStatusCode(200);
    const body = scheduleResponse.body as { id: string };
    expect(body.id).toBeDefined();
    createdTaskId = body.id;
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['api_key_to_invalidate'] });
  });

  apiTest('scheduled task has both apiKey and uiamApiKey', async ({ esClient }) => {
    const { _source } = await esClient.get({
      index: '.kibana_task_manager',
      id: `task:${createdTaskId}`,
    });

    expect(_source).toBeDefined();
    const taskAttrs = (_source as Record<string, unknown>)?.task as Record<string, unknown>;
    expect(taskAttrs).toBeDefined();
    expect(taskAttrs.apiKey).toBeDefined();
    expect(taskAttrs.uiamApiKey).toBeDefined();
  });

  apiTest(
    'when task is removed, apiKey and uiamApiKey are queued for invalidation',
    async ({ apiClient, kbnClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const { saved_objects: pendingBefore } = await kbnClient.savedObjects.find({
        type: 'api_key_to_invalidate',
      });
      expect(pendingBefore).toHaveLength(0);

      const deleteResponse = await apiClient.delete(
        `internal/task_manager/tasks/${createdTaskId}`,
        { headers: { ...COMMON_HEADERS, ...cookieHeader } }
      );
      expect(deleteResponse).toHaveStatusCode(200);

      const { saved_objects: pendingAfter } = await kbnClient.savedObjects.find({
        type: 'api_key_to_invalidate',
      });

      expect(pendingAfter).toHaveLength(2);
    }
  );
});
