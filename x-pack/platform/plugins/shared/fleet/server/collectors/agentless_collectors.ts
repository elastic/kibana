/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClient } from '@kbn/core/server';
import _ from 'lodash';

import { getPackageSavedObjects } from '../services/epm/packages/get';
import { agentPolicyService } from '../services';
import type { NewPackagePolicy } from '../types';

import type { AgentUsage } from './agent_collectors';
import { getAgentUsage } from './agent_collectors';
import type { PackageUsage } from './package_collectors';

export interface AgentlessUsage {
  agentlessPackages: PackageUsage[];
  agentlessAgents: AgentUsage;
}

export const getAgenlessUsage = async (
  soClient?: SavedObjectsClient,
  esClient?: ElasticsearchClient
): Promise<AgentlessUsage> => {
  if (!soClient) {
    return {
      agentlessPackages: [],
      agentlessAgents: {
        total_enrolled: 0,
        healthy: 0,
        unhealthy: 0,
        offline: 0,
        inactive: 0,
        unenrolled: 0,
        total_all_statuses: 0,
        updating: 0,
      },
    };
  }
  const packagesSavedObjects = await getPackageSavedObjects(soClient);
  const agentPolicies = await agentPolicyService.list(soClient, {
    perPage: 1000, // avoiding pagination
    withPackagePolicies: true,
  });

  const agentPolicyIds = agentPolicies.items
    .filter((agentPolicy) =>
      (agentPolicy.package_policies as NewPackagePolicy[]).some(
        (packagePolicy) => packagePolicy.supports_agentless === true
      )
    )
    .map((agentPolicy) => agentPolicy.id);

  const packagesInAgentPolicies = agentPolicies.items.map((agentPolicy) => {
    const packagePolicies: NewPackagePolicy[] = agentPolicy.package_policies as NewPackagePolicy[];
    return packagePolicies
      .map((packagePolicy) => {
        if (packagePolicy.supports_agentless === true) {
          return packagePolicy.package?.name;
        }
      })
      .filter((packageName): packageName is string => packageName !== undefined);
  });

  const enabledPackages = _.uniq(_.flatten(packagesInAgentPolicies));

  const packages = packagesSavedObjects.saved_objects.map((p) => {
    return {
      name: p.attributes.name,
      version: p.attributes.version,
      enabled: enabledPackages.includes(p.attributes.name),
    };
  });

  const agentlessAgentsStatus = await getAgentUsage(soClient, esClient, agentPolicyIds);

  return {
    agentlessPackages: packages,
    agentlessAgents: agentlessAgentsStatus,
  };
};
