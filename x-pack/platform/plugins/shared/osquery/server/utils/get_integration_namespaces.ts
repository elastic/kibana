/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicyServiceInterface, PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';

export interface GetIntegrationNamespacesOptions {
  logger: Logger;
  soClient: SavedObjectsClientContract;
  packagePolicyService: PackagePolicyClient;
  agentPolicyService: AgentPolicyServiceInterface;
  integrationNames: string[];
}

/**
 * Retrieves namespaces used by specified integrations.
 * Based on the implementation from security_solution's fetchIntegrationNamespaces.
 */
export const getIntegrationNamespaces = async ({
  logger,
  soClient,
  packagePolicyService,
  agentPolicyService,
  integrationNames = [],
}: GetIntegrationNamespacesOptions): Promise<Record<string, string[]>> => {
  const integrationToNamespaceMap = integrationNames.reduce((acc, name) => {
    acc[name] = new Set<string>();

    return acc;
  }, {} as Record<string, Set<string>>);
  const agentPolicyIdsToRetrieve: Record<string, Set<Set<string>>> = {};

  if (integrationNames.length > 0) {
    const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: (${integrationNames.join(
      ' OR '
    )})`;

    logger.debug(`Fetch of policies for integrations using Kuery [${kuery}]`);

    const policiesFound = await packagePolicyService.list(soClient, {
      perPage: 10000,
      kuery,
    });

    logger.trace(
      `Fetch of policies for integrations using Kuery [${kuery}] returned ${policiesFound.items.length} policies`
    );

    for (const packagePolicy of policiesFound.items) {
      if (packagePolicy.package?.name) {
        const integrationName = packagePolicy.package.name;

        if (packagePolicy.namespace) {
          integrationToNamespaceMap[integrationName].add(packagePolicy.namespace);
        } else {
          // Integration policy does not have an explicit namespace, which means it
          // inherits it from the associated agent policies. We'll retrieve these next
          packagePolicy.policy_ids.forEach((agentPolicyId) => {
            if (!agentPolicyIdsToRetrieve[agentPolicyId]) {
              agentPolicyIdsToRetrieve[agentPolicyId] = new Set();
            }

            agentPolicyIdsToRetrieve[agentPolicyId].add(integrationToNamespaceMap[integrationName]);
          });
        }
      }
    }
  }

  const agentPolicyIds = Object.keys(agentPolicyIdsToRetrieve);

  if (agentPolicyIds.length > 0) {
    logger.debug(`Retrieving agent policies from fleet for: ${agentPolicyIds.join(', ')}`);

    const agentPolicies = await agentPolicyService.getByIds(soClient, agentPolicyIds);

    logger.trace(`Fleet agent policies retrieved: ${agentPolicies.length} policies`);

    for (const agentPolicy of agentPolicies) {
      for (const nameSpaceSet of agentPolicyIdsToRetrieve[agentPolicy.id]) {
        nameSpaceSet.add(agentPolicy.namespace);
      }
    }
  }

  const response = Object.entries(integrationToNamespaceMap).reduce(
    (acc, [integrationName, namespaceSet]) => {
      acc[integrationName] = Array.from(namespaceSet.values());

      return acc;
    },
    {} as Record<string, string[]>
  );

  logger.debug(`Integration namespaces in use: ${JSON.stringify(response)}`);

  return response;
};
