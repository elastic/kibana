/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CookieHeader } from '@kbn/scout';
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
