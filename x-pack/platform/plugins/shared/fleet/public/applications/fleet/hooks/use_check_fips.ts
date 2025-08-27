/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sendGetAgents } from '../../../hooks';
import { AGENTS_PREFIX, SO_SEARCH_LIMIT } from '../constants';
import type { Agent, PackageInfo, RegistryPolicyTemplate } from '../types';

export const hasFipsAgents = (agents: Agent[]) =>
  agents.some((agent) => agent.local_metadata?.elastic?.agent?.fips === true);

export const agentPoliciesWithFipsAgents = async (policyIds: string[]) => {
  const policiesKuery = policyIds
    .map((policyId) => `${AGENTS_PREFIX}.policy_id:"${policyId}"`)
    .join(' or ');
  const res = await sendGetAgents({
    showInactive: true,
    kuery: `${policiesKuery} and not status: unenrolled`,
    perPage: SO_SEARCH_LIMIT,
  });
  if (!res.data?.items || res.data?.items.length === 0) return false;

  return hasFipsAgents(res.data?.items);
};

export const checkFipsCompatibleIntegration = (
  packageInfo?: Pick<PackageInfo, 'policy_templates'>,
  integrationName?: string
) => {
  if (!packageInfo?.policy_templates || packageInfo.policy_templates?.length === 0) {
    return true;
  }
  if (
    packageInfo.policy_templates.find(
      (p) => p.name === integrationName && policyTemplateFipsCompatible(p)
    )
  )
    return true;
  return false;
};

// assuming that policy templates that have fips_compatible not defined are still compatible
// only `fips_compatible: false` is considered not compatible
const policyTemplateFipsCompatible = (policyTemplate: RegistryPolicyTemplate) => {
  return policyTemplate.fips_compatible !== false;
};
