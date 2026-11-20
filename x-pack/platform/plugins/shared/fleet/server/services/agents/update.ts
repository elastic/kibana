/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { AGENTS_PREFIX } from '../../constants';

import { getAgentsByKuery, updateAgent } from './crud';
import { unenrollAgent } from './unenroll';
import { buildPolicyBaseIdWithFallbackKuery } from '../../../common/services/version_specific_policies_utils';

export async function unenrollForAgentPolicyId(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  policyId: string,
  options?: { revoke?: boolean; unenrolledReason?: string }
) {
  const revoke = options?.revoke ?? false;
  const unenrolledReason = options?.unenrolledReason;
  const policyKuery = buildPolicyBaseIdWithFallbackKuery(
    policyId,
    `${AGENTS_PREFIX}.policy_base_id`,
    `${AGENTS_PREFIX}.policy_id`
  );
  let hasMore = true;
  let page = 1;
  while (hasMore) {
    const { agents } = await getAgentsByKuery(esClient, soClient, {
      // Agents that are already unenrolled are excluded unless the kuery references their status
      kuery: unenrolledReason ? `(${policyKuery}) AND status:*` : policyKuery,
      showInactive: revoke,
      page: page++,
      perPage: 1000,
    });

    if (agents.length === 0) {
      hasMore = false;
    }
    for (const agent of agents) {
      if (unenrolledReason && agent.status === 'unenrolled') {
        await updateAgent(esClient, agent.id, { unenrolled_reason: unenrolledReason });
        continue;
      }
      await unenrollAgent(soClient, esClient, agent.id, {
        force: revoke,
        revoke,
        unenrolledReason,
        skipAgentlessValidation: true,
      });
    }
  }
}
