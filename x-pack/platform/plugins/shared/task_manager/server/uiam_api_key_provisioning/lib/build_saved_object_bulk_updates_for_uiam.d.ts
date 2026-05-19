/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import type { InvalidationTarget } from '../../api_key_strategy';
import type { TaskUserScope } from '../../task';
import type { UiamKeyResult } from '../types';
/** Shape of attributes sent in a UIAM provisioning partial bulkUpdate. */
interface UiamBulkUpdateAttrs {
  uiamApiKey: string;
  userScope: TaskUserScope;
  /**
   * `taskType` is in the Task ESO `attributesToIncludeInAAD` set, so it must be
   * included on every partial encrypt-update — otherwise `uiamApiKey` is encrypted
   * with a mismatched AAD and decrypt fails on subsequent reads (and ESO strips
   * `apiKey` along with it). See `task_manager_dependencies/server/plugin.ts`.
   */
  taskType: string;
}
/**
 * {@link markApiKeysForInvalidation} targets from task SO bulk updates built by
 * {@link buildSavedObjectBulkUpdatesForUiamKeys} (attributes carry UIAM id + secret).
 */
export declare const invalidationTargetsFromUiamTaskBulkUpdates: (
  updates: Array<SavedObjectsBulkUpdateObject<UiamBulkUpdateAttrs>>
) => InvalidationTarget[];
/**
 * Saved-object bulk update operations for successful UIAM converts.
 * Callers only enqueue tasks that passed {@link classifyTaskForUiamProvisioning} with usable
 * `userScope` / `apiKeyId`, so one update is built per converted result.
 */
export declare const buildSavedObjectBulkUpdatesForUiamKeys: (
  converted: UiamKeyResult[]
) => Array<SavedObjectsBulkUpdateObject<UiamBulkUpdateAttrs>>;
export {};
