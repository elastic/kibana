/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';

import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { computeEffectivePolicyIds, fetchAllPackagePolicies } from './utils';

export const EFFECTIVE_POLICY_IDS_PACKAGE_POLICY_FIELDS = [
  'name',
  'enabled',
  'policy_ids',
  'inputs',
];

/**
 * Best-effort lookup of the agent policies that actually receive each pack on the wire,
 * shared by the read and find routes (only when the request opts in with
 * `withEffectivePolicyIds=true`). Returns a map keyed by pack saved-object id, or
 * `undefined` (and logs) on any failure so a Fleet hiccup never breaks the packs read path.
 */
export const getEffectivePolicyIdsForPacks = async ({
  osqueryContext,
  request,
  soClient,
  packs,
}: {
  osqueryContext: OsqueryAppContext;
  request: KibanaRequest;
  soClient: SavedObjectsClientContract;
  packs: Array<{ id: string; name: string }>;
}): Promise<Map<string, string[]> | undefined> => {
  if (packs.length === 0) return new Map();

  try {
    const spaceId = osqueryContext?.service?.getActiveSpace
      ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
      : DEFAULT_SPACE_ID;
    const agentPolicyService = osqueryContext.service.getAgentPolicyService();
    if (!agentPolicyService) {
      throw new Error('Agent policy service is unavailable');
    }

    // Only what the scan reads: pack blocks live in `inputs`, owners in `policy_ids`.
    const packagePolicies = await fetchAllPackagePolicies(
      osqueryContext.service.getPackagePolicyService(),
      soClient,
      undefined,
      undefined,
      EFFECTIVE_POLICY_IDS_PACKAGE_POLICY_FIELDS
    );

    return await computeEffectivePolicyIds(packs, spaceId, packagePolicies, {
      soClient,
      agentPolicyService,
    });
  } catch (error) {
    osqueryContext.logFactory
      .get('pack')
      .warn(`Failed to compute effective pack policy ids: ${error.message}`);

    return undefined;
  }
};
