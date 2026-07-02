/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetAgentPoliciesResponseItem,
  PackageInfo,
  PackagePolicy,
} from '../../../../../types';
import type { AgentlessPolicy } from '../../../../../../../../common/types/models/agentless_policy';
import { agentlessPolicyToPackagePolicy } from '../../../../../../../../common/services';

export interface AgentlessPolicyTableItem {
  packagePolicy: PackagePolicy;
  agentPolicies: GetAgentPoliciesResponseItem[];
}

/**
 * Map an {@link AgentlessPolicy} (from the agentless policies LIST API) onto the
 * `{ packagePolicy, agentPolicies }` shape the deployments table consumes, so the table
 * component and its `mapPoliciesData` enrichment stay unchanged.
 *
 * - `packagePolicy` is expanded to the full `PackagePolicy` shape via
 *   `agentlessPolicyToPackagePolicy` (same converter the edit read uses), then enriched with
 *   the identifiers/timestamps the table renders (`id`, `updated_at`, `updated_by`).
 * - `policy_ids` is set to `[agentlessPolicy.id]`: the agentless agent-policy id equals the
 *   policy id by server design, and the enrollment flyout keys the agent lookup off it.
 * - `agentPolicies` is a minimal `{ id, name }`: the table only reads the id (status lookup,
 *   agents kuery, upgrade href) and the flyout uses it only for optional error-state details.
 */
export const agentlessPolicyToTableItem = (
  agentlessPolicy: AgentlessPolicy,
  packageInfo: PackageInfo
): AgentlessPolicyTableItem => {
  const packagePolicy = {
    ...agentlessPolicyToPackagePolicy(agentlessPolicy, packageInfo),
    id: agentlessPolicy.id,
    policy_ids: [agentlessPolicy.id],
    revision: 1,
    created_at: agentlessPolicy.created_at,
    created_by: agentlessPolicy.created_by,
    updated_at: agentlessPolicy.updated_at,
    updated_by: agentlessPolicy.updated_by,
  } as PackagePolicy;

  const agentPolicies = [
    { id: agentlessPolicy.id, name: agentlessPolicy.name } as GetAgentPoliciesResponseItem,
  ];

  return { packagePolicy, agentPolicies };
};
