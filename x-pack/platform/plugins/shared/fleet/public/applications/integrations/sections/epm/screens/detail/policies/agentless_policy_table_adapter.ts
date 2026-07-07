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
 * - `agentPolicies` is a minimal `{ id, name, supports_agentless }`: the table reads the id
 *   (status lookup, agents kuery, upgrade href), the flyout uses it only for optional
 *   error-state details, and shared row consumers (actions menu, delete modal) branch on
 *   `supports_agentless` — without it they'd offer "Add agent" and show the agent-based
 *   delete wording on agentless rows.
 */
export const agentlessPolicyToTableItem = (
  agentlessPolicy: AgentlessPolicy,
  packageInfo: PackageInfo
): AgentlessPolicyTableItem => {
  // Identifiers/timestamps the table renders directly, independent of input expansion.
  const identity = {
    id: agentlessPolicy.id,
    policy_ids: [agentlessPolicy.id],
    revision: 1,
    created_at: agentlessPolicy.created_at,
    created_by: agentlessPolicy.created_by,
    updated_at: agentlessPolicy.updated_at,
    updated_by: agentlessPolicy.updated_by,
  };

  const agentPolicies = [
    {
      id: agentlessPolicy.id,
      name: agentlessPolicy.name,
      supports_agentless: true,
    } as GetAgentPoliciesResponseItem,
  ];

  let packagePolicy: PackagePolicy;
  try {
    packagePolicy = {
      ...agentlessPolicyToPackagePolicy(agentlessPolicy, packageInfo),
      ...identity,
      // Keep each row's own package version: the mapper stamps `package` from the shared
      // (installed/latest) `packageInfo`, which would misreport an older policy's version and
      // hide its "upgrade available" indicator. The API returns the policy's real package.
      package: agentlessPolicy.package,
    } as PackagePolicy;
  } catch {
    // Re-deriving a policy's inputs against the manifest can throw (e.g. the policy references a
    // field that is absent from the loaded package info, or the policy predates the installed
    // package version). Degrade this single row to a minimal package policy so one bad policy
    // can never crash the whole deployments table.
    packagePolicy = {
      name: agentlessPolicy.name,
      namespace: agentlessPolicy.namespace ?? 'default',
      description: agentlessPolicy.description,
      package: agentlessPolicy.package,
      enabled: true,
      inputs: [],
      vars: {},
      supports_agentless: true,
      ...identity,
    } as unknown as PackagePolicy;
  }

  return { packagePolicy, agentPolicies };
};
