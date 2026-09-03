/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import {
  buildUiamApiKeyProvisioningStatusId,
  UiamApiKeyProvisioningEntityType,
  UiamApiKeyProvisioningStatus,
} from '@kbn/uiam-api-keys-provisioning-status';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';
import { TAGS } from '../constants';
import { getErrorMessage } from './error_utils';

const buildTaskStatusId = (taskId: string): string =>
  buildUiamApiKeyProvisioningStatusId(UiamApiKeyProvisioningEntityType.TASK, taskId);

export interface TaskUiamProvisioningStatusDoc {
  type: typeof UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE;
  id: string;
  attributes: {
    '@timestamp': string;
    entityId: string;
    entityType: typeof UiamApiKeyProvisioningEntityType.TASK;
    status:
      | typeof UiamApiKeyProvisioningStatus.SKIPPED
      | typeof UiamApiKeyProvisioningStatus.FAILED
      | typeof UiamApiKeyProvisioningStatus.COMPLETED;
    message?: string;
    errorCode?: string;
  };
}

export const createSkippedTaskProvisioningStatus = (
  taskId: string,
  message: string
): TaskUiamProvisioningStatusDoc => ({
  type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  id: buildTaskStatusId(taskId),
  attributes: {
    '@timestamp': new Date().toISOString(),
    entityId: taskId,
    entityType: UiamApiKeyProvisioningEntityType.TASK,
    status: UiamApiKeyProvisioningStatus.SKIPPED,
    message,
  },
});

export const createFailedConversionTaskProvisioningStatus = (
  taskId: string,
  message: string,
  errorCode?: string
): TaskUiamProvisioningStatusDoc => ({
  type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  id: buildTaskStatusId(taskId),
  attributes: {
    '@timestamp': new Date().toISOString(),
    entityId: taskId,
    entityType: UiamApiKeyProvisioningEntityType.TASK,
    status: UiamApiKeyProvisioningStatus.FAILED,
    message,
    ...(errorCode ? { errorCode } : {}),
  },
});

export const createTaskProvisioningStatusFromBulkUpdateResult = (so: {
  id: string;
  error?: { message?: string };
}): TaskUiamProvisioningStatusDoc => ({
  type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  id: buildTaskStatusId(so.id),
  attributes: {
    '@timestamp': new Date().toISOString(),
    entityId: so.id,
    entityType: UiamApiKeyProvisioningEntityType.TASK,
    status: so.error ? UiamApiKeyProvisioningStatus.FAILED : UiamApiKeyProvisioningStatus.COMPLETED,
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

/**
 * Same shape as Alerting's `ProvisioningStatusWritePayload` for `uiam_api_keys_provisioning_status`.
 */
export type TaskProvisioningStatusWritePayload = TaskUiamProvisioningObservabilityStatusPayload;

export interface TaskProvisioningStatusCounts {
  skipped: number;
  failedConversions: number;
  completed: number;
  failed: number;
  total: number;
}

/**
 * Builds the flat docs array and counts for a provisioning status write (mirrors
 * `prepareProvisioningStatusWrite` in `alerting/server/provisioning/lib/provisioning_status.ts`).
 */
export const prepareTaskProvisioningStatusWrite = (
  payload: TaskProvisioningStatusWritePayload
): { docs: TaskUiamProvisioningStatusDoc[]; counts: TaskProvisioningStatusCounts } => {
  const { skipped, failedConversions, completed, failed } = payload;
  const docs: TaskUiamProvisioningStatusDoc[] = [
    ...skipped,
    ...failedConversions,
    ...completed,
    ...failed,
  ];
  const counts: TaskProvisioningStatusCounts = {
    skipped: skipped.length,
    failedConversions: failedConversions.length,
    completed: completed.length,
    failed: failed.length,
    total: docs.length,
  };
  return { docs, counts };
};

/**
 * Deletes the status docs written under the pre-namespacing bare entity id (`<taskId>` rather than
 * `task:<taskId>`) for the tasks we just wrote a namespaced doc for. Mirrors
 * `deleteLegacyProvisioningStatusDocs` in `alerting/server/provisioning/lib/provisioning_status.ts`.
 * Best effort: a legacy doc is missing for every task first provisioned after this change, and any
 * other failure is retried the next time the task is written.
 */
export const deleteLegacyTaskProvisioningStatusDocs = async (
  savedObjectsClient: ISavedObjectsRepository,
  logger: Logger,
  docs: TaskUiamProvisioningStatusDoc[]
): Promise<void> => {
  const legacyIds = Array.from(new Set(docs.map(({ attributes }) => attributes.entityId)));
  if (legacyIds.length === 0) {
    return;
  }
  try {
    const { statuses } = await savedObjectsClient.bulkDelete(
      legacyIds.map((id) => ({ type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE, id }))
    );
    // 404 means there is nothing to migrate for that task, which is the steady state.
    const unexpectedErrors = statuses.filter(
      ({ success, error }) => !success && error?.statusCode !== 404
    );
    if (unexpectedErrors.length > 0) {
      logger.warn(
        `Failed to delete ${unexpectedErrors.length} legacy UIAM provisioning status doc(s): ${unexpectedErrors[0].error?.message}`,
        { tags: TAGS }
      );
    }
  } catch (e) {
    logger.warn(`Error deleting legacy UIAM provisioning status docs: ${getErrorMessage(e)}`, {
      tags: TAGS,
    });
  }
};

/**
 * Persists provisioning status docs for monitoring only. Swallows errors so execution is unchanged.
 */
export const writeTaskUiamProvisioningObservabilityStatus = async (
  savedObjectsClient: ISavedObjectsRepository,
  logger: Logger,
  payload: TaskUiamProvisioningObservabilityStatusPayload
): Promise<void> => {
  const { docs, counts } = prepareTaskProvisioningStatusWrite(payload);
  if (docs.length === 0) {
    return;
  }
  try {
    const result = await savedObjectsClient.bulkCreate(docs, { overwrite: true });
    const persistedIds = new Set<string>();
    result.saved_objects.forEach((so) => {
      if (isSavedObjectErrorResult(so)) {
        logger.warn(
          `Error writing task provisioning status for ${so.id}: ${so.error.message ?? so.error}`,
          { tags: TAGS }
        );
      } else {
        persistedIds.add(so.id);
      }
    });
    logger.info(
      `Wrote provisioning status: ${counts.total} total (${counts.skipped} skipped, ${counts.failedConversions} failed conversions, ${counts.completed} completed, ${counts.failed} failed updates).`,
      { tags: TAGS }
    );
    // Only for docs whose write is confirmed persisted: deleting the legacy doc after a
    // failed (or unconfirmed) namespaced write would lose that entity's only status.
    await deleteLegacyTaskProvisioningStatusDocs(
      savedObjectsClient,
      logger,
      docs.filter(({ id }) => persistedIds.has(id))
    );
  } catch (e) {
    logger.error(`Error writing provisioning status: ${getErrorMessage(e)}`, {
      error: {
        stack_trace: e instanceof Error ? e.stack : undefined,
        tags: [...TAGS, 'status-write-failed'],
      },
    });
  }
};
