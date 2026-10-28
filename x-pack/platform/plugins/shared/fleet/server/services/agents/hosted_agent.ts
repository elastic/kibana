/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { Agent, AgentPolicy } from '../../types';
import { AgentlessAgentRestrictionError } from '../../errors';
import { agentPolicyService } from '../agent_policy';

import { getAgentPolicyForAgent } from './crud';

export type AgentPolicyRestrictions = Pick<AgentPolicy, 'is_managed' | 'supports_agentless'>;

export interface AgentPolicyRestrictionsById {
  [policyId: string]: AgentPolicyRestrictions;
}

export async function getAgentPolicyRestrictions(
  soClient: SavedObjectsClientContract,
  agents: Agent[],
  options?: { spaceId?: string }
): Promise<AgentPolicyRestrictionsById> {
  // get any policy ids from upgradable agents; `policy_base_id` is always the base id, so agents
  // on a version-specific variant (`my-policy#9.2`) are looked up by the base policy id.
  const policyIdsToGet = new Set(
    agents.filter((agent) => agent.policy_base_id).map((agent) => agent.policy_base_id!)
  );

  // get the agent policies for those ids
  const agentPolicies = await agentPolicyService.getByIds(soClient, Array.from(policyIdsToGet), {
    fields: ['is_managed', 'supports_agentless'],
    ignoreMissing: true,
    // Only pass spaceId when the client is unscoped (spaceId '*'). For a space-scoped client the
    // client already enforces the namespace; passing an explicit namespaces param would trigger a
    // _has_privileges check with no user credentials.
    ...(options?.spaceId === '*' ? { spaceId: options.spaceId } : {}),
  });

  return agentPolicies.reduce<AgentPolicyRestrictionsById>((acc, policy) => {
    acc[policy.id] = {
      is_managed: policy.is_managed,
      supports_agentless: policy.supports_agentless === true,
    };
    return acc;
  }, {});
}

export function isHostedAgent(restrictions: AgentPolicyRestrictionsById, agent: Agent) {
  // `restrictions` is keyed by base policy id (see getAgentPolicyRestrictions above), so match on
  // `policy_base_id` — agents on version-specific variants (`my-policy#9.2`) are correctly
  // identified as hosted.
  return !!agent.policy_base_id && !!restrictions[agent.policy_base_id]?.is_managed;
}

/**
 * Agentless agents are managed by Elastic: users cannot run agent actions on them.
 */
export function isAgentlessAgent(restrictions: AgentPolicyRestrictionsById, agent: Agent) {
  return !!agent.policy_base_id && !!restrictions[agent.policy_base_id]?.supports_agentless;
}

/**
 * Single-agent actions: throws when the agent's policy is agentless.
 */
export function throwIfAgentlessAgentPolicy(
  agentPolicy: Pick<AgentPolicy, 'supports_agentless'> | null | undefined,
  message: string
) {
  if (agentPolicy?.supports_agentless) {
    throw new AgentlessAgentRestrictionError(message);
  }
}

/**
 * Single-agent actions that already loaded the agent: only the agent policy is fetched, saving the
 * extra agent lookup of `throwIfAgentlessAgent`.
 */
export async function throwIfAgentInAgentlessPolicy(
  soClient: SavedObjectsClientContract,
  agent: Pick<Agent, 'policy_id'>,
  message: string
) {
  if (!agent.policy_id) {
    return;
  }
  const agentPolicy = await agentPolicyService
    .get(soClient, agent.policy_id, false)
    .catch((err) => {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return undefined;
      }
      throw err;
    });
  throwIfAgentlessAgentPolicy(agentPolicy, message);
}

/**
 * Single-agent actions that did not load the agent yet.
 */
export async function throwIfAgentlessAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string,
  message: string
) {
  const agentPolicy = await getAgentPolicyForAgent(soClient, esClient, agentId).catch((err) => {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return undefined;
    }
    throw err;
  });
  throwIfAgentlessAgentPolicy(agentPolicy, message);
}
