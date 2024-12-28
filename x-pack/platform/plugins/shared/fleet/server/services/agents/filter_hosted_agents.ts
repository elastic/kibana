/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { Agent } from '../../types';
import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { getHostedPolicies, isHostedAgent } from './hosted_agent';

export async function filterHostedPolicies(
  soClient: SavedObjectsClientContract,
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  errorMessage: string
): Promise<Agent[]> {
  const hostedPolicies = await getHostedPolicies(soClient, givenAgents);

  return givenAgents.reduce<Agent[]>((agents, agent, index) => {
    if (isHostedAgent(hostedPolicies, agent)) {
      const id = givenAgents[index].id;
      outgoingErrors[id] = new HostedAgentPolicyRestrictionRelatedError(errorMessage);
    } else {
      agents.push(agent);
    }
    return agents;
  }, []);
}
