/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersection } from 'lodash';

import type { Agent, AgentPolicy } from '../../../../types';
import { removeVersionSuffixFromPolicyId } from '../../../../../../../common/services/version_specific_policies_utils';

export const getCommonTags = (
  agents: string | Agent[],
  agentsOnCurrentPage: Agent[],
  agentPolicies: AgentPolicy[]
): string[] => {
  const isManagedPolicy = (agent: Agent): boolean => {
    // Strip the version suffix so agents on a version-specific variant (`my-policy#9.2`) match
    // the base agent policy saved object.
    const basePolicyId = agent.policy_id
      ? removeVersionSuffixFromPolicyId(agent.policy_id)
      : undefined;
    const policy = agentPolicies.find((pol) => pol.id === basePolicyId);
    return !!policy && policy.is_managed;
  };

  const commonSelectedTags = (agentList: Agent[]): string[] =>
    agentList.reduce((acc: string[], curr: Agent) => {
      if (isManagedPolicy(curr)) {
        return acc;
      }
      if (acc.length < 1) {
        return curr.tags ?? [];
      }
      return intersection(curr.tags ?? [], acc);
    }, []);

  if (!Array.isArray(agents)) {
    // in query mode, returning common tags of all agents in current page
    // this is a simplification to avoid querying all agents from backend to determine common tags
    return commonSelectedTags(agentsOnCurrentPage);
  }
  // taking latest tags from freshly loaded agents data, as selected agents array does not contain the latest tags of agents
  const freshSelectedAgentsData =
    agentsOnCurrentPage.length > 0
      ? agentsOnCurrentPage.filter((newAgent) =>
          agents.find((existingAgent) => existingAgent.id === newAgent.id)
        )
      : agents;

  return commonSelectedTags(freshSelectedAgentsData);
};
