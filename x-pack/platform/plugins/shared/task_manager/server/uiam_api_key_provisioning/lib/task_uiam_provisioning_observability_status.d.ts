/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type {
  UiamApiKeyProvisioningEntityType,
  UiamApiKeyProvisioningStatus,
} from '@kbn/uiam-api-keys-provisioning-status';
import type { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';
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
export declare const createSkippedTaskProvisioningStatus: (
  taskId: string,
  message: string
) => TaskUiamProvisioningStatusDoc;
export declare const createFailedConversionTaskProvisioningStatus: (
  taskId: string,
  message: string,
  errorCode?: string
) => TaskUiamProvisioningStatusDoc;
export declare const createTaskProvisioningStatusFromBulkUpdateResult: (so: {
  id: string;
  error?: {
    message?: string;
  };
}) => TaskUiamProvisioningStatusDoc;
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
export declare const prepareTaskProvisioningStatusWrite: (
  payload: TaskProvisioningStatusWritePayload
) => {
  docs: TaskUiamProvisioningStatusDoc[];
  counts: TaskProvisioningStatusCounts;
};
/**
 * Persists provisioning status docs for monitoring only. Swallows errors so execution is unchanged.
 */
export declare const writeTaskUiamProvisioningObservabilityStatus: (
  savedObjectsClient: ISavedObjectsRepository,
  logger: Logger,
  payload: TaskUiamProvisioningObservabilityStatusPayload
) => Promise<void>;
