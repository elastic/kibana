/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '../../task';
import type { ApiKeyToConvert } from '../types';
import {
  createSkippedTaskProvisioningStatus,
  type TaskUiamProvisioningStatusDoc,
} from './task_uiam_provisioning_observability_status';

/**
 * Task document for UIAM provisioning classification
 * (mirrors {@link RuleForClassification} in `alerting/.../fetch_first_batch.ts`).
 */
export type TaskForClassification = ConcreteTaskInstance;

export type ClassifyTaskResult =
  | { action: 'skip'; status: TaskUiamProvisioningStatusDoc }
  | { action: 'convert'; task: ApiKeyToConvert };

/**
 * Classifies a task as either skip (with status doc) or convert (with API key payload + instance for merge).
 * Skip: no API key, already has UIAM key, user-created key, or unusable userScope.
 * Convert: system-generated API key, no UIAM key yet, usable userScope.
 */
export const classifyTaskForUiamProvisioning = (
  task: TaskForClassification
): ClassifyTaskResult => {
  const { id, apiKey, uiamApiKey, userScope, taskType } = task;
  if (!apiKey) {
    return {
      action: 'skip',
      status: createSkippedTaskProvisioningStatus(id, 'The task has no API key'),
    };
  }
  if (uiamApiKey && userScope?.uiamApiKeyId) {
    return {
      action: 'skip',
      status: createSkippedTaskProvisioningStatus(id, 'The task already has a UIAM API key'),
    };
  }
  if (userScope?.apiKeyCreatedByUser === true) {
    return {
      action: 'skip',
      status: createSkippedTaskProvisioningStatus(id, 'The API key was created by the user'),
    };
  }
  if (!userScope?.apiKeyId) {
    return {
      action: 'skip',
      status: createSkippedTaskProvisioningStatus(
        id,
        'The task has no userScope or apiKeyId is empty; cannot run UIAM bulk merge'
      ),
    };
  }
  return {
    action: 'convert',
    task: {
      taskId: id,
      attributes: {
        apiKey,
        taskType,
        userScope,
      },
      version: task.version,
    },
  };
};

export interface ClassifyTasksResult {
  provisioningStatusForSkippedTasks: TaskUiamProvisioningStatusDoc[];
  apiKeysToConvert: ApiKeyToConvert[];
}

/**
 * Classifies a batch of tasks into skipped (with status docs) and to-convert payloads.
 * Mirrors `classifyRulesForUiamProvisioning` in `alerting/.../classify_rule.ts`.
 */
export const classifyTasksForUiamProvisioning = (
  tasks: TaskForClassification[]
): ClassifyTasksResult => {
  const provisioningStatusForSkippedTasks: TaskUiamProvisioningStatusDoc[] = [];
  const apiKeysToConvert: ApiKeyToConvert[] = [];

  for (const t of tasks) {
    const result = classifyTaskForUiamProvisioning(t);
    if (result.action === 'skip') {
      provisioningStatusForSkippedTasks.push(result.status);
    } else {
      apiKeysToConvert.push(result.task);
    }
  }
  return { provisioningStatusForSkippedTasks, apiKeysToConvert };
};
