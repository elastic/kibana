/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fleet compiles a pack into the integration, so every agent policy of a shared
 * integration receives it. Expands agent policy ids by the integration groups they
 * belong to. The groups only contain integrations Fleet delivers through (the server
 * leaves disabled integrations and inputs out of `package_policy_id`).
 */
export const expandToSharedIntegrations = (
  policyIds: Iterable<string>,
  groupsByPackagePolicyId: Record<string, { policyIds: string[] }> | undefined
): Set<string> => {
  const expanded = new Set(policyIds);
  for (const { policyIds: groupPolicyIds } of Object.values(groupsByPackagePolicyId ?? {})) {
    if (groupPolicyIds.some((id) => expanded.has(id))) {
      groupPolicyIds.forEach((id) => expanded.add(id));
    }
  }

  return expanded;
};
