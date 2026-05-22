/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { nodeBuilder, nodeTypes, type KueryNode } from '@kbn/es-query';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE } from '../constants';
import {
  UiamApiKeyProvisioningStatus,
  UiamApiKeyProvisioningEntityType,
} from '../../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import { convertRuleIdsToKueryNode } from '../../lib/convert_rule_ids_to_kuery_node';
import { GET_STATUS_BATCH_SIZE, EXCLUDE_FILTER_CLAUSE_BATCH_SIZE } from '../constants';

/**
 * Returns a KQL filter that excludes rules which already have provisioning status
 * COMPLETED/SKIPPED or failed due to non-Cloud user API key creator code.
 * Returns undefined when there are no such rules (no filter applied).
 */
export const getExcludeRulesFilter = async (
  savedObjectsClient: SavedObjectsClientContract
): Promise<KueryNode | undefined> => {
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
    nodeBuilder.is(`${statusAttr}.entityType`, UiamApiKeyProvisioningEntityType.RULE),
  ]);
  const ruleIds = new Set<string>();
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const { saved_objects, total } = await savedObjectsClient.find<{
      entityId: string;
      entityType: string;
      status: string;
    }>({
      type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
      filter,
      perPage: GET_STATUS_BATCH_SIZE,
      page,
      namespaces: ['*'],
    });
    for (const so of saved_objects) {
      if (so.attributes?.entityId) {
        ruleIds.add(so.attributes.entityId);
      }
    }
    hasMore = page * GET_STATUS_BATCH_SIZE < total;
    page += 1;
  }
  if (ruleIds.size === 0) return undefined;
  return nodeTypes.function.buildNode(
    'not',
    buildChunkedOrNode(Array.from(ruleIds), EXCLUDE_FILTER_CLAUSE_BATCH_SIZE)
  );
};

/**
 * Splits rule IDs into chunks and builds nested `or` nodes so that no single
 * bool.should exceeds Elasticsearch's max_clause_count.
 */
export const buildChunkedOrNode = (ruleIds: string[], chunkSize: number): KueryNode => {
  if (ruleIds.length <= chunkSize) {
    return convertRuleIdsToKueryNode(ruleIds);
  }
  const chunks: KueryNode[] = [];
  for (let i = 0; i < ruleIds.length; i += chunkSize) {
    chunks.push(convertRuleIdsToKueryNode(ruleIds.slice(i, i + chunkSize)));
  }
  return nodeBuilder.or(chunks);
};
