/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type {
  CloudOnboardingDeployment,
  CloudOnboardingDeploymentListItem,
  CloudOnboardingDeploymentPackage,
} from '../../../common/types/models/cloud_onboarding_deployment';
import { appContextService } from '../../services/app_context';
import { packagePolicyService } from '../../services/package_policy';
import { getAgentCountForAgentPolicies } from '../../services/agent_policies/agent_policy_agent_count';

/**
 * Service IDs by the mechanism that deploys them. An agent-based or ECF-only deployment runs all
 * its services through that one mechanism. A managed integration deployment can add ECF stacks for
 * the services that have no managed integration, so the services of its stacks are the ECF ones
 * and the rest are managed integrations.
 */
export function getServicesByMethod(
  deployment: Pick<CloudOnboardingDeployment, 'mechanisms' | 'services' | 'ecfStacks'>
): CloudOnboardingDeploymentListItem['servicesByMethod'] {
  const { mechanisms, services } = deployment;
  if (mechanisms.includes('agent_based')) return { agent_based: services };

  const hasEcf = mechanisms.includes('ecf');
  const hasManagedIntegration = mechanisms.includes('managed_integration');
  if (hasEcf && !hasManagedIntegration) return { ecf: services };
  if (!hasEcf) return hasManagedIntegration ? { managed_integration: services } : {};

  const ecfServiceIds = new Set((deployment.ecfStacks ?? []).flatMap((s) => s.serviceIds ?? []));
  const ecf = services.filter((id) => ecfServiceIds.has(id));
  const managedIntegration = services.filter((id) => !ecfServiceIds.has(id));
  return {
    ...(managedIntegration.length ? { managed_integration: managedIntegration } : {}),
    ...(ecf.length ? { ecf } : {}),
  };
}

/**
 * Adds what the list needs from the deployments' policies: the deployed package versions and the
 * number of enrolled agents. A policy that no longer exists is skipped.
 */
export async function enrichDeployments(
  soClient: SavedObjectsClientContract,
  deployments: CloudOnboardingDeployment[]
): Promise<CloudOnboardingDeploymentListItem[]> {
  const packagePolicyIds = [...new Set(deployments.flatMap((d) => d.packagePolicyIds ?? []))];
  const packagePolicies = packagePolicyIds.length
    ? await packagePolicyService.getByIDs(soClient, packagePolicyIds, { ignoreMissing: true })
    : [];
  const packagePolicyById = new Map(packagePolicies.map((policy) => [policy.id, policy]));

  const agentPolicyIdsOf = (deployment: CloudOnboardingDeployment): string[] => [
    ...new Set([
      ...(deployment.agentPolicyIds ?? []),
      ...(deployment.packagePolicyIds ?? []).flatMap(
        (id) => packagePolicyById.get(id)?.policy_ids ?? []
      ),
    ]),
  ];

  const allAgentPolicyIds = [...new Set(deployments.flatMap(agentPolicyIdsOf))];
  const agentCounts = allAgentPolicyIds.length
    ? await getAgentCountForAgentPolicies(
        appContextService.getInternalUserESClient(),
        allAgentPolicyIds
      )
    : {};

  return deployments.map((deployment) => {
    const packages = new Map<string, CloudOnboardingDeploymentPackage>();
    for (const id of deployment.packagePolicyIds ?? []) {
      const pkg = packagePolicyById.get(id)?.package;
      if (pkg && !packages.has(pkg.name)) {
        packages.set(pkg.name, { name: pkg.name, version: pkg.version });
      }
    }
    return {
      ...deployment,
      packages: [...packages.values()],
      servicesByMethod: getServicesByMethod(deployment),
      agentCount: agentPolicyIdsOf(deployment).reduce((sum, id) => sum + (agentCounts[id] ?? 0), 0),
    };
  });
}
