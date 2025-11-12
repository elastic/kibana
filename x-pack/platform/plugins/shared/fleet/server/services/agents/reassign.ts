/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';

import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import semverSatisfies from 'semver/functions/satisfies';

import type { Agent } from '../../types';
import { agentPolicyService } from '../agent_policy';
import {
  AgentReassignmentError,
  HostedAgentPolicyRestrictionRelatedError,
  AgentPolicyNotFoundError,
} from '../../errors';

import { SO_SEARCH_LIMIT } from '../../constants';

import { agentsKueryNamespaceFilter } from '../spaces/agent_namespaces';
import { getCurrentNamespace } from '../spaces/get_current_namespace';
import { getPackageInfo } from '../epm/packages';

import { extractMinVersionFromRanges } from './version_compatibility';
import {
  getAgentsById,
  getAgentPolicyForAgent,
  updateAgent,
  getAgentsByKuery,
  openPointInTime,
  getAgentById,
} from './crud';
import type { GetAgentsOptions } from '.';
import { createAgentAction } from './actions';

import { ReassignActionRunner, reassignBatch } from './reassign_action_runner';

async function verifyNewAgentPolicy(
  soClient: SavedObjectsClientContract,
  newAgentPolicyId: string
) {
  let newAgentPolicy;
  try {
    newAgentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  } catch (err) {
    if (err instanceof SavedObjectNotFound) {
      throw new AgentPolicyNotFoundError(`Agent policy not found: ${newAgentPolicyId}`);
    }
  }
  if (!newAgentPolicy) {
    throw new AgentPolicyNotFoundError(`Agent policy not found: ${newAgentPolicyId}`);
  }
  if (newAgentPolicy?.is_managed) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot reassign agents to hosted agent policy ${newAgentPolicy.id}`
    );
  }
}

/**
 * Checks if an agent's version is compatible with the target agent policy's package requirements.
 * Returns an AgentReassignmentError if incompatible, null if compatible or no requirements.
 */
export async function checkAgentVersionCompatibilityForReassign(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  targetPolicyId: string
): Promise<AgentReassignmentError | null> {
  const targetAgentPolicy = await agentPolicyService.get(soClient, targetPolicyId, true);
  if (!targetAgentPolicy?.package_policies || targetAgentPolicy.package_policies.length === 0) {
    return null;
  }

  // Collect all agent version requirements from package policies
  const versionRequirements: string[] = [];
  for (const packagePolicy of targetAgentPolicy.package_policies) {
    if (packagePolicy.package?.name && packagePolicy.package?.version) {
      try {
        const pkgInfo = await getPackageInfo({
          savedObjectsClient: soClient,
          pkgName: packagePolicy.package.name,
          pkgVersion: packagePolicy.package.version,
          ignoreUnverified: true,
          prerelease: true,
        });
        if (pkgInfo?.conditions?.agent?.version) {
          versionRequirements.push(pkgInfo.conditions.agent.version);
        }
      } catch (error) {
        // If we can't get package info, skip this package policy
        continue;
      }
    }
  }

  // Check if agent version satisfies all version requirements
  if (versionRequirements.length > 0) {
    const agentVersion = agent.agent?.version || agent.local_metadata?.elastic?.agent?.version;
    if (!agentVersion) {
      return null;
    }
    for (const requiredVersionRange of versionRequirements) {
      if (!semverSatisfies(agentVersion, requiredVersionRange)) {
        // Extract min version for error message
        const minVersion = extractMinVersionFromRanges([requiredVersionRange]);
        const minVersionDisplay = minVersion || requiredVersionRange;
        return new AgentReassignmentError(
          `Agent ${agent.id} version ${agentVersion} does not satisfy required version range ${requiredVersionRange} (minimum: ${minVersionDisplay}) for target agent policy. Use force:true to override.`
        );
      }
    }
  }

  return null;
}

export async function reassignAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string,
  newAgentPolicyId: string
) {
  await verifyNewAgentPolicy(soClient, newAgentPolicyId);

  await getAgentById(esClient, soClient, agentId); // throw 404 if agent not in namespace

  const agentPolicy = await getAgentPolicyForAgent(soClient, esClient, agentId);
  if (agentPolicy?.is_managed) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot reassign an agent from hosted agent policy ${agentPolicy.id}`
    );
  }

  const newAgentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);

  await updateAgent(esClient, agentId, {
    policy_id: newAgentPolicyId,
    policy_revision: null,
    ...(newAgentPolicy?.space_ids ? { namespaces: newAgentPolicy.space_ids } : {}),
  });

  const currentSpaceId = getCurrentNamespace(soClient);

  await createAgentAction(esClient, soClient, {
    agents: [agentId],
    created_at: new Date().toISOString(),
    type: 'POLICY_REASSIGN',
    data: {
      policy_id: newAgentPolicyId,
    },
    namespaces: [currentSpaceId],
  });
}

export async function reassignAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: ({ agents: Agent[] } | GetAgentsOptions) & {
    force?: boolean;
    batchSize?: number;
  },
  newAgentPolicyId: string
): Promise<{ actionId: string }> {
  await verifyNewAgentPolicy(soClient, newAgentPolicyId);

  const currentSpaceId = getCurrentNamespace(soClient);
  const outgoingErrors: Record<Agent['id'], Error> = {};
  let givenAgents: Agent[] = [];
  if ('agents' in options) {
    givenAgents = options.agents;
  } else if ('agentIds' in options) {
    const maybeAgents = await getAgentsById(esClient, soClient, options.agentIds);
    for (const maybeAgent of maybeAgents) {
      if ('notFound' in maybeAgent) {
        outgoingErrors[maybeAgent.id] = new AgentReassignmentError(
          `Cannot find agent ${maybeAgent.id}`
        );
      } else {
        givenAgents.push(maybeAgent);
      }
    }
  } else if ('kuery' in options) {
    const batchSize = options.batchSize ?? SO_SEARCH_LIMIT;
    const namespaceFilter = await agentsKueryNamespaceFilter(currentSpaceId);
    const kuery = namespaceFilter ? `${namespaceFilter} AND ${options.kuery}` : options.kuery;
    const res = await getAgentsByKuery(esClient, soClient, {
      kuery,
      showAgentless: options.showAgentless,
      showInactive: options.showInactive ?? false,
      page: 1,
      perPage: batchSize,
    });
    // running action in async mode for >10k agents (or actions > batchSize for testing purposes)
    if (res.total <= batchSize) {
      givenAgents = res.agents;
    } else {
      return await new ReassignActionRunner(
        esClient,
        soClient,
        {
          ...options,
          spaceId: currentSpaceId,
          batchSize,
          total: res.total,
          newAgentPolicyId,
        },
        { pitId: await openPointInTime(esClient) }
      ).runActionAsyncTask();
    }
  }

  return await reassignBatch(
    esClient,
    { newAgentPolicyId, spaceId: currentSpaceId, force: options.force },
    givenAgents,
    outgoingErrors
  );
}
