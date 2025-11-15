/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';

import type { PackagePolicyClient } from '../package_policy';
import { cloudConnectorService } from '../cloud_connector';

/**
 * Decrements the packagePolicyCount for a cloud connector
 * This should be called when a package policy using the cloud connector is deleted
 *
 * @param soClient - Saved objects client
 * @param cloudConnectorId - ID of the cloud connector
 * @param logger - Logger instance
 * @throws Error if the operation fails
 */
export async function decrementCloudConnectorPackageCount(
  soClient: SavedObjectsClientContract,
  cloudConnectorId: string,
  logger: Logger
): Promise<void> {
  logger.debug(`Decrementing package policy count for cloud connector ${cloudConnectorId}`);

  try {
    const cloudConnector = await cloudConnectorService.getById(soClient, cloudConnectorId);

    const newCount = Math.max(0, cloudConnector.packagePolicyCount - 1);

    await cloudConnectorService.update(soClient, cloudConnectorId, {
      packagePolicyCount: newCount,
    });

    logger.debug(
      `Successfully decremented package policy count for cloud connector ${cloudConnectorId} to ${newCount}`
    );
  } catch (error) {
    logger.error(
      `Error decrementing package policy count for cloud connector ${cloudConnectorId}: ${error.message}`
    );
    throw error;
  }
}

/**
 * Increments the packagePolicyCount for a cloud connector
 * This should be called when a package policy starts using an existing cloud connector
 *
 * @param soClient - Saved objects client
 * @param cloudConnectorId - ID of the cloud connector
 * @param logger - Logger instance
 * @throws Error if the operation fails
 */
export async function incrementCloudConnectorPackageCount(
  soClient: SavedObjectsClientContract,
  cloudConnectorId: string,
  logger: Logger
): Promise<void> {
  logger.debug(`Incrementing package policy count for cloud connector ${cloudConnectorId}`);

  try {
    const cloudConnector = await cloudConnectorService.getById(soClient, cloudConnectorId);

    const newCount = cloudConnector.packagePolicyCount + 1;

    await cloudConnectorService.update(soClient, cloudConnectorId, {
      packagePolicyCount: newCount,
    });

    logger.debug(
      `Successfully incremented package policy count for cloud connector ${cloudConnectorId} to ${newCount}`
    );
  } catch (error) {
    logger.error(
      `Error incrementing package policy count for cloud connector ${cloudConnectorId}: ${error.message}`
    );
    throw error;
  }
}

/**
 * Handles cloud connector cleanup when a policy is deleted
 * Fetches associated package policies and decrements cloud connector count if needed
 *
 * This function is designed for agentless policy deletion but can be used
 * in any context where a policy deletion requires cloud connector cleanup.
 *
 * @param soClient - Saved objects client
 * @param packagePolicyService - Package policy service
 * @param policyId - Agent policy ID being deleted
 * @param logger - Logger instance
 */
export async function cleanupCloudConnectorForPolicy(
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyClient,
  policyId: string,
  logger: Logger
): Promise<void> {
  logger.debug(`Checking for cloud connectors to cleanup for policy ${policyId}`);

  // Get package policies to check for cloud connectors
  const packagePolicies = await packagePolicyService.list(soClient, {
    kuery: `ingest-package-policies.policy_ids:${policyId}`,
    perPage: 1,
  });

  // If there's a cloud connector associated with the package policy, decrement its count
  if (packagePolicies.items.length > 0) {
    const packagePolicy = packagePolicies.items[0];
    if (packagePolicy.cloud_connector_id) {
      logger.debug(
        `Decrementing package count for cloud connector ${packagePolicy.cloud_connector_id}`
      );
      try {
        await decrementCloudConnectorPackageCount(
          soClient,
          packagePolicy.cloud_connector_id,
          logger
        );
      } catch (error) {
        logger.error(`Error decrementing cloud connector package count: ${error.message}`);
        // Don't fail the deletion if we can't decrement the count
      }
    }
  }
}
