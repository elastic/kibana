/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';

import {
  AGENTS_INDEX,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
  UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import type { AgentPolicy } from '../../../common/types';
import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { ENROLLMENT_API_KEYS_INDEX } from '../../constants';
import { packagePolicyService } from '../package_policy';
import { FleetError, HostedAgentPolicyRestrictionRelatedError } from '../../errors';
import type { UninstallTokenSOAttributes } from '../security/uninstall_token_service';
import { closePointInTime, getAgentsByKuery, openPointInTime } from '../agents';

import { validatePackagePoliciesUniqueNameAcrossSpaces } from './policy_namespaces';

import { isSpaceAwarenessEnabled } from './helpers';

const UPDATE_AGENT_BATCH_SIZE = 1000;

export async function updateAgentPolicySpaces({
  agentPolicy,
  currentSpaceId,
  authorizedSpaces,
  options,
}: {
  agentPolicy: Pick<AgentPolicy, 'id' | 'name' | 'space_ids' | 'supports_agentless'>;
  currentSpaceId: string;
  authorizedSpaces: string[];
  options?: { force?: boolean };
}) {
  const { id: agentPolicyId, space_ids: newSpaceIds } = agentPolicy;

  const useSpaceAwareness = await isSpaceAwarenessEnabled();
  if (!useSpaceAwareness || !newSpaceIds || newSpaceIds.length === 0) {
    return;
  }

  const esClient = appContextService.getInternalUserESClient();
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const currentSpaceSoClient = appContextService.getInternalUserSOClientForSpaceId(currentSpaceId);
  const newSpaceSoClient = appContextService.getInternalUserSOClientForSpaceId(newSpaceIds[0]);
  const existingPolicy = await agentPolicyService.get(currentSpaceSoClient, agentPolicyId);

  const existingPackagePolicies = await packagePolicyService.findAllForAgentPolicy(
    currentSpaceSoClient,
    agentPolicyId
  );

  if (!existingPolicy) {
    return;
  }

  if (existingPolicy.is_managed && !options?.force) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot update hosted agent policy ${existingPolicy.id} space `
    );
  }

  if (deepEqual(existingPolicy?.space_ids?.sort() ?? [DEFAULT_SPACE_ID], newSpaceIds.sort())) {
    return;
  }

  if (existingPackagePolicies.some((packagePolicy) => packagePolicy.policy_ids.length > 1)) {
    throw new FleetError(
      'Agent policies using reusable integration policies cannot be moved to a different space.'
    );
  }
  const spacesToAdd = newSpaceIds.filter(
    // @ts-expect-error upgrade typescript v5.9.3
    (spaceId) => !existingPolicy?.space_ids?.includes(spaceId) ?? true
  );
  const spacesToRemove =
    // @ts-expect-error upgrade typescript v5.9.3
    existingPolicy?.space_ids?.filter((spaceId) => !newSpaceIds.includes(spaceId) ?? true) ?? [];

  // Privileges check
  for (const spaceId of spacesToAdd) {
    if (!authorizedSpaces.includes(spaceId)) {
      throw new FleetError(`Not enough permissions to create policies in space ${spaceId}`);
    }
  }

  for (const spaceId of spacesToRemove) {
    if (!authorizedSpaces.includes(spaceId)) {
      throw new FleetError(`Not enough permissions to remove policies from space ${spaceId}`);
    }
  }

  await agentPolicyService.requireUniqueName(soClient, agentPolicy);
  await validatePackagePoliciesUniqueNameAcrossSpaces(existingPackagePolicies, newSpaceIds);

  const res = await soClient.updateObjectsSpaces(
    [
      {
        id: agentPolicyId,
        type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      },
      ...existingPackagePolicies.map(({ id }) => ({
        id,
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      })),
    ],
    spacesToAdd,
    spacesToRemove,
    { refresh: 'wait_for', namespace: currentSpaceId }
  );

  for (const soRes of res.objects) {
    if (soRes.error) {
      throw soRes.error;
    }
  }

  // Update uninstall tokens
  const uninstallTokensRes = await soClient.find<UninstallTokenSOAttributes>({
    perPage: SO_SEARCH_LIMIT,
    type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
    filter: `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.policy_id:"${agentPolicyId}"`,
  });

  if (uninstallTokensRes.total > 0) {
    await soClient.bulkUpdate(
      uninstallTokensRes.saved_objects.map((so) => ({
        id: so.id,
        type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
        attributes: {
          namespaces: newSpaceIds,
        },
      }))
    );
  }

  // Update fleet server index agents, enrollment api keys
  await esClient.updateByQuery({
    index: ENROLLMENT_API_KEYS_INDEX,
    query: {
      bool: {
        must: {
          terms: {
            policy_id: [agentPolicyId],
          },
        },
      },
    },
    script: `ctx._source.namespaces = [${newSpaceIds.map((spaceId) => `"${spaceId}"`).join(',')}]`,
    ignore_unavailable: true,
    refresh: true,
  });

  const agentIndexExists = await esClient.indices.exists({
    index: AGENTS_INDEX,
  });

  // Update agent actions
  if (agentIndexExists) {
    let pitId = await openPointInTime(esClient);

    try {
      let hasMore = true;
      let searchAfter: SortResults | undefined;
      while (hasMore) {
        const { agents, pit } = await getAgentsByKuery(esClient, newSpaceSoClient, {
          kuery: `policy_id:"${agentPolicyId}"`,
          showInactive: true,
          perPage: UPDATE_AGENT_BATCH_SIZE,
          pitId,
          searchAfter,
        });
        if (pit) {
          pitId = pit;
        }

        if (agents.length === 0) {
          hasMore = false;
          break;
        }

        const agentBulkRes = await esClient.bulk({
          operations: agents.flatMap(({ id }) => [
            { update: { _id: id, _index: AGENTS_INDEX, retry_on_conflict: 5 } },
            { doc: { namespaces: newSpaceIds } },
          ]),
          refresh: 'wait_for',
          index: AGENTS_INDEX,
        });

        for (const item of agentBulkRes.items) {
          if (item.update?.error) {
            throw item.update?.error;
          }
        }

        const lastAgent = agents[agents.length - 1];
        searchAfter = lastAgent.sort;
      }
    } finally {
      await closePointInTime(esClient, pitId);
    }
  }
}
