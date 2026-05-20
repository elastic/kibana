/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import {
  UiamApiKeyProvisioningEntityType,
  UiamApiKeyProvisioningStatus,
} from '@kbn/uiam-api-keys-provisioning-status';
import { GET_STATUS_BATCH_SIZE, NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE } from '../constants';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';

/**
 * Returns task `entityId`s that already have a final UIAM provisioning status
 * (completed, skipped, or failed due to non-Cloud user API key creator code) so
 * the provisioning fetch can exclude them.
 *
 * Mirrors {@link getExcludeRulesFilter} in
 * `x-pack/.../alerting/server/provisioning/lib/get_exclude_rules_filter.ts`.
 */
export const getExcludeTasksFilter = async (
  savedObjectsClient: ISavedObjectsRepository
): Promise<string[]> => {
  const statusAttr = `${UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE}.attributes`;
  const filter = nodeBuilder.and([
    nodeBuilder.or([
      nodeBuilder.is(`${statusAttr}.status`, UiamApiKeyProvisioningStatus.COMPLETED),
      nodeBuilder.is(`${statusAttr}.status`, UiamApiKeyProvisioningStatus.SKIPPED),
      nodeBuilder.and([
        nodeBuilder.is(`${statusAttr}.status`, UiamApiKeyProvisioningStatus.FAILED),
        nodeBuilder.is(`${statusAttr}.errorCode`, NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE),
      ]),
    ]),
    nodeBuilder.is(`${statusAttr}.entityType`, UiamApiKeyProvisioningEntityType.TASK),
  ]);
  const taskIds = new Set<string>();
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const { saved_objects, total } = await savedObjectsClient.find<{ entityId: string }>({
      type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
      filter,
      perPage: GET_STATUS_BATCH_SIZE,
      page,
      namespaces: ['*'],
    });
    for (const so of saved_objects) {
      if (so.attributes?.entityId) {
        taskIds.add(so.attributes.entityId);
      }
    }
    hasMore = page * GET_STATUS_BATCH_SIZE < total;
    page += 1;
  }
  return Array.from(taskIds);
};
