/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { OsqueryAppContext } from './osquery_app_context_services';
import { fetchOsqueryPackagePolicyIds } from '../routes/utils';

export interface OsqueryAgentPolicyIds {
  /** Agent policy ids that include the osquery_manager package policy. */
  agentPolicyIds: string[];
  /** True when the osquery package policy lookup itself failed (not "none found"). */
  lookupFailed: boolean;
}

/**
 * Resolves the agent policies that actually carry the osquery integration.
 *
 * Agents enroll into an *agent* policy; osquery is configured as a *package*
 * policy referenced by it. Without this hop, "is this host osquery capable"
 * and "which agent should run this query" both degrade into "any enrolled
 * Elastic Agent", which can return a host that cannot execute a live query.
 *
 * `lookupFailed` keeps a Fleet/SO error distinguishable from a genuinely empty
 * environment — an empty list with `lookupFailed: true` must not be reported as
 * "osquery is not deployed".
 */
export const getOsqueryAgentPolicyIds = async (
  soClient: SavedObjectsClientContract,
  osqueryContext: OsqueryAppContext
): Promise<OsqueryAgentPolicyIds> => {
  const packagePolicyService = osqueryContext.service.getPackagePolicyService();

  if (!packagePolicyService) {
    return { agentPolicyIds: [], lookupFailed: true };
  }

  try {
    const packagePolicyIds = await fetchOsqueryPackagePolicyIds(soClient, osqueryContext);

    if (packagePolicyIds.length === 0) {
      return { agentPolicyIds: [], lookupFailed: false };
    }

    const packagePolicies = await packagePolicyService.getByIDs(soClient, packagePolicyIds);

    const agentPolicyIds = [
      ...new Set(
        packagePolicies?.flatMap((policy: { policy_ids?: string[] }) => policy.policy_ids ?? []) ??
          []
      ),
    ];

    return { agentPolicyIds, lookupFailed: false };
  } catch (e) {
    osqueryContext.logFactory
      .get('getOsqueryAgentPolicyIds')
      .warn(`Osquery agent policy lookup failed: ${e instanceof Error ? e.message : String(e)}`);

    return { agentPolicyIds: [], lookupFailed: true };
  }
};

/**
 * KQL clause matching agents enrolled into any osquery-capable agent policy.
 * An empty id list yields a clause that matches nothing, never every agent.
 */
export const buildOsqueryPolicyKuery = (agentPolicyIds: string[]): string =>
  agentPolicyIds.length === 0
    ? 'policy_id:"__no_osquery_policy__"'
    : agentPolicyIds
        .map((id) => `policy_id:"${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
        .join(' or ');

export const OSQUERY_PACKAGE_POLICY_SAVED_OBJECT_TYPE = PACKAGE_POLICY_SAVED_OBJECT_TYPE;
