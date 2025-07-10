/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTS_PREFIX } from '../../../common';
import { AgentStatusKueryHelper } from '../../../common/services';
import type {
  CurrentVersionCount,
  GetAutoUpgradeAgentsStatusResponse,
} from '../../../common/types/rest_spec/agent_policy';

import type { AgentClient } from './agent_service';

export async function getAutoUpgradeAgentsStatus(
  agentClient: AgentClient,
  agentPolicyId: string
): Promise<GetAutoUpgradeAgentsStatusResponse> {
  const currentVersionsMap: {
    [version: string]: CurrentVersionCount;
  } = {};
  let total = 0;

  await agentClient
    .listAgents({
      showInactive: false,
      perPage: 0,
      kuery: `${AgentStatusKueryHelper.buildKueryForActiveAgents()} AND ${AGENTS_PREFIX}.policy_id:"${agentPolicyId}"`,
      aggregations: {
        versions: {
          terms: {
            field: 'agent.version',
            size: 1000,
          },
        },
      },
    })
    .then((result) => {
      (result.aggregations?.versions as any)?.buckets.forEach(
        (bucket: { key: string; doc_count: number }) =>
          (currentVersionsMap[bucket.key] = {
            version: bucket.key,
            agents: bucket.doc_count,
            failedUpgradeAgents: 0,
          })
      );
      total = result.total;
    });

  await agentClient
    .listAgents({
      showInactive: false,
      perPage: 0,
      kuery: `${AgentStatusKueryHelper.buildKueryForActiveAgents()} AND ${AGENTS_PREFIX}.policy_id:"${agentPolicyId}" AND ${AGENTS_PREFIX}.upgrade_details.state:"UPG_FAILED"`,
      aggregations: {
        versions: {
          terms: {
            field: 'upgrade_details.target_version.keyword',
            size: 1000,
          },
        },
      },
    })
    .then((result) => {
      (result.aggregations?.versions as any)?.buckets.forEach(
        (bucket: { key: string; doc_count: number }) =>
          (currentVersionsMap[bucket.key] = {
            version: bucket.key,
            agents: currentVersionsMap[bucket.key]?.agents ?? 0,
            failedUpgradeAgents: bucket.doc_count,
          })
      );
    });

  return {
    currentVersions: Object.values(currentVersionsMap),
    totalAgents: total,
  };
}
