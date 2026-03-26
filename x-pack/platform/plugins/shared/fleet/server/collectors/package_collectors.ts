/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import _ from 'lodash';

import { getPackageSavedObjects } from '../services/epm/packages/get';
import { agentPolicyService } from '../services';
import type { NewPackagePolicy } from '../types';

import type { AgentUsage } from './agent_collectors';

export interface PackageUsage {
  name: string;
  version: string;
  enabled: boolean;
  agent_based?: boolean;
}

export interface AgentlessUsage {
  agentlessPackages: PackageUsage[];
  agentlessAgents: AgentUsage;
}

export const getPackageUsage = async (
  soClient?: SavedObjectsClientContract
): Promise<PackageUsage[]> => {
  if (!soClient) {
    return [];
  }
  const packagesSavedObjects = await getPackageSavedObjects(soClient);
  const agentPolicies = await agentPolicyService.list(soClient, {
    perPage: 1000, // avoiding pagination
    withPackagePolicies: true,
  });

  // Once we provide detailed telemetry on agent policies, this logic should probably be moved
  // to the (then to be created) agent policy collector, so we only query and loop over these
  // objects once.
  const packagesInAgentPolicies = agentPolicies.items.map((agentPolicy) => {
    const packagePolicies: NewPackagePolicy[] = agentPolicy.package_policies as NewPackagePolicy[];
    return packagePolicies
      .filter(
        (packagePolicy): packagePolicy is NewPackagePolicy =>
          packagePolicy.package?.name !== undefined && packagePolicy.supports_agentless !== true
      )
      .map((packagePolicy) => packagePolicy.package?.name);
  });
  const enabledPackages = _.uniq(_.flatten(packagesInAgentPolicies));

  const packagesInAgentlessPolicies = agentPolicies.items.map((agentPolicy) => {
    const packagePolicies: NewPackagePolicy[] = agentPolicy.package_policies as NewPackagePolicy[];
    return packagePolicies
      .filter(
        (packagePolicy): packagePolicy is NewPackagePolicy =>
          packagePolicy.package?.name !== undefined && packagePolicy.supports_agentless === true
      )
      .map((packagePolicy) => packagePolicy.package?.name);
  });
  const enabledAgentlessPackages = _.uniq(_.flatten(packagesInAgentlessPolicies));

  return packagesSavedObjects.saved_objects.map((p) => {
    const agentBased = enabledPackages.includes(p.attributes.name);
    const agentless = enabledAgentlessPackages.includes(p.attributes.name);
    const enabled = agentBased || agentless;
    return {
      name: p.attributes.name,
      version: p.attributes.version,
      enabled,
      ...(enabled && agentBased && { agent_based: true }), // Only include if true
      ...(enabled && agentless && { agentless: true }), // Only include if true
    };
  });
};
