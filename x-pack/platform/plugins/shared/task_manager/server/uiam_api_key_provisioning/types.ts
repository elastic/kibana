/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ISavedObjectsRepository } from '@kbn/core/server';
import type { ConvertUiamAPIKeysResponse } from '@kbn/core-security-server';
import type { TaskUiamProvisioningStatusDoc } from './lib/task_uiam_provisioning_observability_status';
import type { TaskUserScope } from '../task';
import type { TaskManagerStartContract } from '../plugin';

/** Success result from UIAM convert API */
export interface UiamConvertSuccessResult {
  status: 'success';
  id: string;
  key: string;
  organization_id: string;
  description: string;
  internal: boolean;
  role_assignments: Record<string, unknown>;
  creation_date: string;
}

/** Failed result from UIAM convert API */
export interface UiamConvertFailedResult {
  status: 'failed';
  message: string;
  type: string;
  resource: string;
  code: string;
}

/** Response from core.security.authc.apiKeys.uiam.convert */
export interface UiamConvertResponse {
  results: Array<UiamConvertSuccessResult | UiamConvertFailedResult>;
}

/** Task document fields required for convert + ESO/SO merge (mirrors Alerting's full `RawRule` on `ApiKeyToConvert`) */
export interface TaskApiKeyToConvertAttributes {
  /** System API key string to send to UIAM convert (mirrors `apiKey` on the rule) */
  apiKey: string;
  /**
   * Required so the partial `bulkUpdate` payload includes `taskType` and ESO can
   * compute the same AAD that was used when the doc was originally encrypted.
   * The Task ESO type lists `taskType` in `attributesToIncludeInAAD` (see
   * `task_manager_dependencies/server/plugin.ts`); omitting it would corrupt
   * `uiamApiKey` (and silently strip `apiKey` on subsequent reads).
   */
  taskType: string;
  userScope: TaskUserScope;
}

/**
 * Runtime dependencies for a UIAM task provisioning run
 * (mirrors Alerting's `ProvisioningRunContext` in `alerting/server/provisioning/types.ts`).
 */
export interface TaskManagerUiamProvisioningRunContext {
  coreStart: CoreStart;
  taskManager: TaskManagerStartContract;
  savedObjectsClient: ISavedObjectsRepository;
  uiamConvert: (keys: string[]) => Promise<ConvertUiamAPIKeysResponse | null>;
}

/** Task doc queued for UIAM convert + SO update (mirrors Alerting's `ApiKeyToConvert`) */
export interface ApiKeyToConvert {
  taskId: string;
  attributes: TaskApiKeyToConvertAttributes;
  /** Task SO version for `bulkUpdate` (mirrors rule `version` on `ApiKeyToConvert`) */
  version?: string;
}

/**
 * One successfully converted task with material for SO update
 * (mirrors `UiamApiKeyByRuleId` in `alerting/server/provisioning/types.ts`).
 */
export interface UiamKeyResult {
  taskId: string;
  uiamApiKey: string;
  uiamApiKeyId: string;
  /** Decrypted task fields for merge; required for ESO/SO `bulkUpdate` */
  attributes: TaskApiKeyToConvertAttributes;
  /** Task SO version for `bulkUpdate` (optimistic concurrency) */
  version?: string;
}

/**
 * Result of the first provisioning step (mirrors Alerting's `GetApiKeysToConvertResult`).
 */
export interface GetApiKeysToConvertResult {
  apiKeysToConvert: ApiKeyToConvert[];
  provisioningStatusForSkippedTasks: TaskUiamProvisioningStatusDoc[];
  /** True when the fetch batch is full, so more tasks may be provisioned on a later run */
  hasMoreToProvision: boolean;
}

/**
 * Result of the convert step (mirrors Alerting's `ConvertApiKeysResult`).
 */
export interface ConvertApiKeysResult {
  converted: UiamKeyResult[];
  provisioningStatusForFailedConversions: TaskUiamProvisioningStatusDoc[];
}

/**
 * Result of the bulk task update step (mirrors completed/failed status from Alerting's `updateRules`).
 */
export interface UpdateTasksResult {
  provisioningStatusForCompletedTasks: TaskUiamProvisioningStatusDoc[];
  provisioningStatusForFailedTasks: TaskUiamProvisioningStatusDoc[];
}
