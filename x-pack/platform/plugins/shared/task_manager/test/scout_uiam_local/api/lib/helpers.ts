/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CookieHeader, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { Client } from '@elastic/elasticsearch';
import type { ApiClientFixture } from '@kbn/scout/src/playwright/fixtures/scope/worker/api_client';
import { COMMON_HEADERS } from '../fixtures/constants';

/** Task Manager saved-object index (concrete task documents). */
export const TASK_MANAGER_INDEX = '.kibana_task_manager';

export const taskDocId = (taskId: string) => `task:${taskId}`;

export const parseTaskState = (raw: unknown): Record<string, unknown> => {
  if (raw == null) {
    return {};
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }
  return {};
};

/**
 * Reads the nested `task` attributes from a Task Manager concrete task document in ES.
 */
export const readTaskAttributes = async (esClient: Client, id: string) => {
  const { _source } = await esClient.get({ index: TASK_MANAGER_INDEX, id });
  const task = (_source as Record<string, unknown>)?.task as Record<string, unknown> | undefined;
  expect(task).toBeDefined();
  return task!;
};

/**
 * Counts the Elasticsearch API keys Task Manager has granted and not yet invalidated.
 *
 * Names are built as `TaskManager: <taskType>[ - <username>]`, so this covers every task type. Use
 * it as a delta within a single test: other specs sharing the stack grant keys with the same names.
 */
export const countActiveTaskManagerEsApiKeys = async (esClient: Client): Promise<number> => {
  const { api_keys: apiKeys } = await esClient.security.queryApiKeys({
    size: 1000,
    query: { prefix: { name: 'TaskManager: ' } },
  });

  return apiKeys.filter(({ invalidated }) => !invalidated).length;
};

/**
 * Lists the ES API keys Task Manager granted for one task type (names are
 * `TaskManager: <taskType>[ - <username>]`), including already-invalidated ones so callers can
 * diff ids across a call and separately check the `invalidated` flag.
 */
export const queryTaskManagerEsApiKeysByType = async (
  esClient: Client,
  taskType: string
): Promise<Array<{ id: string; invalidated: boolean }>> => {
  const { api_keys: apiKeys } = await esClient.security.queryApiKeys({
    size: 1000,
    query: { prefix: { name: `TaskManager: ${taskType}` } },
  });
  return apiKeys.map(({ id, invalidated }) => ({ id, invalidated }));
};

/**
 * Reads the key ids of every `api_key_to_invalidate` marker saved object. One granted ES + UIAM
 * key set produces two markers: one carrying the ES key id and one carrying the UIAM key id.
 * The result is cluster-wide, so assert membership of ids owned by the test, never counts.
 */
export const readInvalidationMarkerKeyIds = async (esClient: Client): Promise<string[]> => {
  await esClient.indices.refresh({ index: TASK_MANAGER_INDEX }).catch(() => {});
  const { hits } = await esClient.search({
    index: TASK_MANAGER_INDEX,
    size: 100,
    query: { term: { type: 'api_key_to_invalidate' } },
  });
  return hits.hits
    .map((hit) => {
      const source = hit._source as Record<string, unknown> | undefined;
      const attrs = source?.api_key_to_invalidate as Record<string, unknown> | undefined;
      return typeof attrs?.apiKeyId === 'string' ? attrs.apiKeyId : undefined;
    })
    .filter((id): id is string => id !== undefined);
};

export const deleteTaskManagerTaskSilently = async (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  taskId: string
): Promise<void> => {
  await apiClient
    .delete(`internal/task_manager/tasks/${taskId}`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    })
    .catch(() => {});
};

export interface ScheduledTaskWithApiKeyIds {
  id: string;
  taskType: string;
  userScope?: {
    apiKeyId: string;
    uiamApiKeyId?: string;
  };
}

/** Invalidates test-owned keys immediately, then removes their task documents without queueing. */
export const deleteTaskManagerTasksWithoutInvalidationQueue = async ({
  apiClient,
  cookieHeader,
  kbnClient,
  tasks,
}: {
  apiClient: ApiClientFixture;
  cookieHeader: CookieHeader;
  kbnClient: KbnClient;
  tasks: ScheduledTaskWithApiKeyIds[];
}): Promise<void> => {
  const esApiKeyIds = tasks.flatMap(({ userScope }) =>
    userScope?.apiKeyId ? [userScope.apiKeyId] : []
  );
  if (esApiKeyIds.length > 0) {
    const response = await apiClient.post('test_endpoints/api_keys/_invalidate', {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: { ids: esApiKeyIds },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.error_count).toBe(0);
  }

  for (const { id: taskId, userScope } of tasks) {
    if (userScope?.uiamApiKeyId) {
      const response = await apiClient.post('test_endpoints/uiam/api_keys/_invalidate', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          id: userScope.uiamApiKeyId,
          taskId,
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.error_count).toBe(0);
    }
  }

  const { deleted, missing } = await kbnClient.savedObjects.bulkDelete({
    objects: tasks.map(({ id }) => ({ type: 'task', id })),
  });
  expect(deleted).toBe(tasks.length);
  expect(missing).toBe(0);
};
