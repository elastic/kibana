/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetAgentsQuery } from '../../../hooks';
import { AGENTS_PREFIX, SO_SEARCH_LIMIT } from '../constants';
import type { Agent } from '../types';

export const hasFipsAgents = (agents: Agent[]) =>
  agents.some((agent) => agent.local_metadata?.elastic?.agent?.fips === true);

export const useAgentPoliciesWithFipsAgents = (policyIds: string[]) => {
  const policiesKuery = policyIds
    .map((policyId) => `${AGENTS_PREFIX}.policy_id:"${policyId}"`)
    .join(' or ');
  const { data: fipsAgentsRes } = useGetAgentsQuery(
    {
      showInactive: true,
      kuery: `${policiesKuery} and not status: unenrolled`,
      perPage: SO_SEARCH_LIMIT,
    },
    { enabled: policyIds.length > 0 } // don't run the query until agent policies are present
  );

  if (fipsAgentsRes?.error) {
    throw new Error(fipsAgentsRes.error.message);
  }

  if (!fipsAgentsRes?.data?.items || fipsAgentsRes.data?.items.length === 0) return false;

  return hasFipsAgents(fipsAgentsRes.data?.items);
};
