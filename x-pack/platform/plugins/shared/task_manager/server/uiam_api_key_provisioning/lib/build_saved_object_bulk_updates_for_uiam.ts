/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import type { InvalidationTarget } from '../../api_key_strategy';
import { TASK_SO_NAME } from '../../saved_objects';
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
export const invalidationTargetsFromUiamTaskBulkUpdates = (
  updates: Array<SavedObjectsBulkUpdateObject<UiamBulkUpdateAttrs>>
): InvalidationTarget[] => {
  const targets: InvalidationTarget[] = [];
  for (const u of updates) {
    const attrs = u.attributes;
    if (attrs == null) {
      continue;
    }
    const { uiamApiKey, userScope } = attrs;
    if (userScope == null) {
      continue;
    }
    const uiamId = userScope.uiamApiKeyId;
    if (uiamId && uiamId.length > 0 && uiamApiKey && uiamApiKey.length > 0) {
      targets.push({ apiKeyId: uiamId, uiamApiKey });
    }
  }
  return targets;
};

/**
 * Saved-object bulk update operations for successful UIAM converts.
 * Callers only enqueue tasks that passed {@link classifyTaskForUiamProvisioning} with usable
 * `userScope` / `apiKeyId`, so one update is built per converted result.
 */
export const buildSavedObjectBulkUpdatesForUiamKeys = (
  converted: UiamKeyResult[]
): Array<SavedObjectsBulkUpdateObject<UiamBulkUpdateAttrs>> =>
  converted.map((c) => {
    const mergedUserScope: TaskUserScope = {
      ...c.attributes.userScope,
      uiamApiKeyId: c.uiamApiKeyId,
    };
    return {
      type: TASK_SO_NAME,
      id: c.taskId,
      attributes: {
        uiamApiKey: c.uiamApiKey,
        userScope: mergedUserScope,
        // Carry the original taskType so ESO computes a consistent AAD when
        // encrypting `uiamApiKey` on this partial update. See `UiamBulkUpdateAttrs`.
        taskType: c.attributes.taskType,
      },
      ...(c.version ? { version: c.version } : {}),
      mergeAttributes: true,
    };
  });
