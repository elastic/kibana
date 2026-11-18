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

/**
 * Best-effort lookup of the agent policies that actually receive each pack on the wire,
 * shared by the read and find routes. Returns `undefined` (and logs) on any failure so a
 * Fleet hiccup never breaks the packs read path.
 */
export const getEffectivePolicyIdsForPacks = async ({
  osqueryContext,
  request,
  soClient,
  packNames,
}: {
  osqueryContext: OsqueryAppContext;
  request: KibanaRequest;
  soClient: SavedObjectsClientContract;
  packNames: string[];
}): Promise<Map<string, string[]> | undefined> => {
  if (packNames.length === 0) return new Map();

  try {
    const spaceId = osqueryContext?.service?.getActiveSpace
      ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
      : DEFAULT_SPACE_ID;
    const agentPolicyService = osqueryContext.service.getAgentPolicyService();
    if (!agentPolicyService) {
      throw new Error('Agent policy service is unavailable');
    }

    const packagePolicies = await fetchAllPackagePolicies(
      osqueryContext.service.getPackagePolicyService(),
      soClient
    );

    return await computeEffectivePolicyIds(packNames, spaceId, packagePolicies, {
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
