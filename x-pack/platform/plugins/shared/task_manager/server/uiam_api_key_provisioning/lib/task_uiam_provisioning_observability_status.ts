/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';
import { TAGS } from '../constants';

/** Must stay aligned with `UiamApiKeyProvisioningEntityType.TASK` in alerting raw status schema. */
const ENTITY_TYPE_TASK = 'task' as const;

/** Must stay aligned with `UiamApiKeyProvisioningStatus` in alerting raw status schema. */
const STATUS_SKIPPED = 'skipped' as const;
const STATUS_FAILED = 'failed' as const;
const STATUS_COMPLETED = 'completed' as const;

export interface TaskUiamProvisioningStatusDoc {
  type: typeof UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE;
  id: string;
  attributes: {
    '@timestamp': string;
    entityId: string;
    entityType: typeof ENTITY_TYPE_TASK;
    status: typeof STATUS_SKIPPED | typeof STATUS_FAILED | typeof STATUS_COMPLETED;
    message?: string;
  };
}

export const createSkippedTaskProvisioningStatus = (
  taskId: string,
  message: string
): TaskUiamProvisioningStatusDoc => ({
  type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  id: taskId,
  attributes: {
    '@timestamp': new Date().toISOString(),
    entityId: taskId,
    entityType: ENTITY_TYPE_TASK,
    status: STATUS_SKIPPED,
    message,
  },
});

export const createFailedConversionTaskProvisioningStatus = (
  taskId: string,
  message: string
): TaskUiamProvisioningStatusDoc => ({
  type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  id: taskId,
  attributes: {
    '@timestamp': new Date().toISOString(),
    entityId: taskId,
    entityType: ENTITY_TYPE_TASK,
    status: STATUS_FAILED,
    message,
  },
});

export const createTaskProvisioningStatusFromBulkUpdateResult = (so: {
  id: string;
  error?: { message?: string };
}): TaskUiamProvisioningStatusDoc => ({
  type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  id: so.id,
  attributes: {
    '@timestamp': new Date().toISOString(),
    entityId: so.id,
    entityType: ENTITY_TYPE_TASK,
    status: so.error ? STATUS_FAILED : STATUS_COMPLETED,
    ...(so.error
      ? {
          message: `Error bulk updating task ${so.id} with UIAM key: ${
            so.error.message ?? so.error
          }`,
        }
      : {}),
  },
});

export interface TaskUiamProvisioningObservabilityStatusPayload {
  skipped: TaskUiamProvisioningStatusDoc[];
  failedConversions: TaskUiamProvisioningStatusDoc[];
  completed: TaskUiamProvisioningStatusDoc[];
  failed: TaskUiamProvisioningStatusDoc[];
}

export const flattenTaskUiamProvisioningObservabilityDocs = (
  payload: TaskUiamProvisioningObservabilityStatusPayload
): TaskUiamProvisioningStatusDoc[] => [
  ...payload.skipped,
  ...payload.failedConversions,
  ...payload.completed,
  ...payload.failed,
];

/**
 * Persists provisioning status docs for monitoring only. Swallows errors so execution is unchanged.
 */
export const writeTaskUiamProvisioningObservabilityStatus = async (
  savedObjectsClient: ISavedObjectsRepository,
  logger: Logger,
  payload: TaskUiamProvisioningObservabilityStatusPayload
): Promise<void> => {
  const docs = flattenTaskUiamProvisioningObservabilityDocs(payload);
  if (docs.length === 0) {
    return;
  }
  try {
    await savedObjectsClient.bulkCreate(docs, { overwrite: true });
    logger.info(
      `Task Manager UIAM provisioning observability: wrote ${docs.length} status document(s) (skipped=${payload.skipped.length}, failedConversions=${payload.failedConversions.length}, completed=${payload.completed.length}, failedUpdates=${payload.failed.length}).`,
      { tags: TAGS }
    );
  } catch (e) {
    logger.warn(
      `Task Manager UIAM provisioning observability: failed to write status documents (non-fatal): ${
        e instanceof Error ? e.message : String(e)
      }`,
      { tags: TAGS }
    );
  }
};
