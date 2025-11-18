/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';

import { AGENTS_PREFIX } from '../../../common';
import { AgentStatusKueryHelper } from '../../../common/services';
import type {
  CurrentVersionCount,
  GetAutoUpgradeAgentsStatusResponse,
} from '../../../common/types/rest_spec/agent_policy';
import { appContextService } from '../app_context';

import { getAgentActions } from './actions';
import type { AgentClient } from './agent_service';

const MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_20 = 20;

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
        action_id_versions: {
          multi_terms: {
            terms: [
              {
                field: 'upgrade_details.target_version.keyword',
              },
              {
                field: 'upgrade_details.action_id',
              },
            ],
            size: 1000,
          },
        },
      },
    })
    .then(async (result) => {
      if (!result.aggregations?.action_id_versions) {
        return;
      }

      const actionCacheIsAutomatic = new Map<string, boolean>();

      await pMap(
        (result.aggregations.action_id_versions as any)?.buckets ?? [],
        async (bucket: { key: string[]; doc_count: number }) => {
          const version = bucket.key[0];
          const actionId = bucket.key[1];

          let isAutomatic = actionCacheIsAutomatic.get(actionId);
          if (isAutomatic === undefined) {
            const actions = await getAgentActions(
              appContextService.getInternalUserESClient(),
              actionId
            );
            isAutomatic = actions?.some((action) => action.is_automatic) ?? false;
            actionCacheIsAutomatic.set(actionId, isAutomatic);
          }

          if (isAutomatic) {
            if (!currentVersionsMap[version]) {
              currentVersionsMap[version] = {
                version,
                agents: 0,
                failedUpgradeAgents: 0,
              };
            }

            currentVersionsMap[version].failedUpgradeAgents += bucket.doc_count;
            if (!currentVersionsMap[version].failedUpgradeActionIds) {
              currentVersionsMap[version].failedUpgradeActionIds = [];
            }
            currentVersionsMap[version].failedUpgradeActionIds!.push(actionId);
          }
        },
        { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_20 }
      );
    });

  return {
    currentVersions: Object.values(currentVersionsMap),
    totalAgents: total,
  };
}
