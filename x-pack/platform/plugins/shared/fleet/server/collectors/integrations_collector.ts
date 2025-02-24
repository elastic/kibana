/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../constants';
import { packagePolicyService } from '../services';

export interface IntegrationsDetails {
  total_integration_policies: number;
  shared_integration_policies: number;
  shared_integrations: SharedIntegration;
}

interface SharedIntegration {
  name: string;
  shared_by_agent_policies: number;
  pkg_name?: string;
  pkg_version?: string;
  agents?: number;
}

export const getIntegrationsDetails = async (
  soClient?: SavedObjectsClientContract
): Promise<IntegrationsDetails[]> => {
  if (!soClient) {
    return [];
  }
  const allPackagePolicies = await packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });
  const sharedPackagePolicies = allPackagePolicies.items.filter((packagePolicy) => {
    if (packagePolicy?.policy_ids?.length > 1) return packagePolicy;
  });

  const integrationsDetails: IntegrationsDetails[] = (sharedPackagePolicies || []).map(
    (packagePolicy) => {
      return {
        total_integration_policies: allPackagePolicies.items.length,
        shared_integration_policies: sharedPackagePolicies.length,
        shared_integrations: {
          name: packagePolicy.name,
          pkg_name: packagePolicy.package?.name,
          pkg_version: packagePolicy.package?.version,
          shared_by_agent_policies: packagePolicy?.policy_ids.length,
          agents: packagePolicy?.agents,
        },
      };
    }
  );
  return integrationsDetails;
};
