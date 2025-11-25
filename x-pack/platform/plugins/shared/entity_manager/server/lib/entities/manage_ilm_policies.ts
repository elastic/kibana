/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IlmPutLifecycleRequest } from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_HISTORY_ILM_POLICY } from '../../../common/constants_entities';
import { generateEntitiesHistoryILMPolicy } from './ilm_policies/history_ilm_policy';
import { retryTransientEsErrors } from './helpers/retry';

export async function createAndInstallILMPolicies(esClient: ElasticsearchClient): Promise<void> {
  const historyPolicy: IlmPutLifecycleRequest = generateEntitiesHistoryILMPolicy();
  await esClient.ilm.putLifecycle(historyPolicy);
}

export async function getILMPoliciesStatus(
  esClient: ElasticsearchClient
): Promise<Array<{ type: 'ilm_policy'; id: string }>> {
  const policies: Array<{ type: 'ilm_policy'; id: string }> = [];

  await esClient.ilm.getLifecycle({ name: ENTITY_HISTORY_ILM_POLICY });
  policies.push({ type: 'ilm_policy', id: ENTITY_HISTORY_ILM_POLICY });

  return policies;
}

export async function deleteILMPolicy(esClient: ElasticsearchClient, name: string, logger: Logger) {
  try {
    await retryTransientEsErrors(() => esClient.ilm.deleteLifecycle({ name }, { ignore: [404] }), {
      logger,
    });
  } catch (error: any) {
    logger.error(`Error deleting entity manager index ilm policy: ${error.message}`);
    throw error;
  }
}

export async function deleteILMPolicies(esClient: ElasticsearchClient, logger: Logger) {
  await deleteILMPolicy(esClient, ENTITY_HISTORY_ILM_POLICY, logger);
}
