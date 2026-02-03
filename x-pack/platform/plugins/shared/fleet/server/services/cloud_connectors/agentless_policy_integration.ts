/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import type { PackageInfo } from '../../../common/types';
import type { AgentPolicy, NewPackagePolicy } from '../../types';
import { CloudConnectorCreateError } from '../../errors';
import { cloudConnectorService } from '../cloud_connector';
import { extractAndCreateCloudConnectorSecrets } from '../secrets/cloud_connector';

import {
  updatePackagePolicyWithCloudConnectorSecrets,
  getCloudConnectorNameFromPackagePolicy,
  extractAccountType,
} from './integration_helpers';

/**
 * Result of cloud connector integration with a package policy
 */
export interface CloudConnectorIntegrationResult {
  /** Updated package policy with cloud connector references */
  packagePolicy: NewPackagePolicy;
  /** ID of the cloud connector (created or reused) */
  cloudConnectorId?: string;
  /** Whether a new cloud connector was created (true) or an existing one was reused (false) */
  wasCreated: boolean;
}

/**
 * Creates or reuses a cloud connector and integrates it with a package policy for agentless workflows
 * Handles the complete integration flow:
 * - Checks if cloud connectors are enabled
 * - If package policy has cloud_connector_id: reuses existing connector and increments usage count
 * - If no cloud_connector_id: extracts and creates secrets, creates new cloud connector
 * - Updates package policy with secret references and cloud connector ID
 *
 * This function is designed for the agentless policy API but can be reused
 * in other contexts where cloud connectors need to be integrated with package policies.
 *
 * @param params - Integration parameters
 * @returns Updated package policy, cloud connector ID, and whether it was created or reused
 * @throws CloudConnectorCreateError if cloud connector creation or reuse fails
 */
export async function createAndIntegrateCloudConnector(params: {
  packagePolicy: NewPackagePolicy;
  agentPolicy: AgentPolicy;
  policyName: string;
  packageInfo: PackageInfo;
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
  cloudConnectorName?: string;
}): Promise<CloudConnectorIntegrationResult> {
  const {
    packagePolicy,
    agentPolicy,
    policyName,
    packageInfo,
    soClient,
    esClient,
    logger,
    cloudConnectorName: providedCloudConnectorName,
  } = params;

  // Check if cloud connectors are enabled for this agentless policy
  const cloudProvider = agentPolicy.agentless?.cloud_connectors?.target_csp;
  const cloudConnectorsEnabled = agentPolicy.agentless?.cloud_connectors?.enabled;

  if (!cloudConnectorsEnabled || !cloudProvider) {
    logger.debug('Cloud connectors not enabled for this policy');
    return { packagePolicy, wasCreated: false };
  }

  logger.debug(`Cloud connectors enabled for agentless policy with provider: ${cloudProvider}`);

  // Set supports_cloud_connector flag before extracting vars
  let updatedPackagePolicy: NewPackagePolicy = {
    ...packagePolicy,
    supports_cloud_connector: true,
  };

  // Check if user provided an existing cloud connector ID to reuse
  const existingCloudConnectorId = updatedPackagePolicy.cloud_connector_id;

  if (existingCloudConnectorId) {
    logger.debug(`Reusing existing cloud connector: ${existingCloudConnectorId}`);

    try {
      // Validate the cloud connector exists and matches the provider
      const existingConnector = await cloudConnectorService.getById(
        soClient,
        existingCloudConnectorId
      );

      if (existingConnector.cloudProvider !== cloudProvider) {
        throw new CloudConnectorCreateError(
          `Cloud connector ${existingCloudConnectorId} is for ${existingConnector.cloudProvider} but policy requires ${cloudProvider}`
        );
      }

      logger.info(`Successfully reused cloud connector: ${existingCloudConnectorId}`);

      return {
        packagePolicy: updatedPackagePolicy,
        cloudConnectorId: existingCloudConnectorId,
        wasCreated: false,
      };
    } catch (error) {
      logger.error(`Error reusing cloud connector ${existingCloudConnectorId}: ${error}`);
      throw new CloudConnectorCreateError(
        `Failed to reuse cloud connector ${existingCloudConnectorId}: ${error.message}`
      );
    }
  }

  // No existing cloud connector ID provided, create a new one
  // Extract cloud connector vars and create secrets for them
  // This decouples cloud connector secret handling from extractAndWriteSecrets
  const cloudConnectorVars = await extractAndCreateCloudConnectorSecrets(
    cloudProvider,
    updatedPackagePolicy,
    packageInfo,
    esClient,
    logger
  );

  if (!cloudConnectorVars) {
    logger.debug('No cloud connector vars found or incomplete');
    return { packagePolicy: updatedPackagePolicy, wasCreated: false };
  }

  logger.debug('Creating new cloud connector for agentless policy with secret references');

  // Use provided cloud connector name from API request if available,
  // otherwise extract from package policy or generate default
  const cloudConnectorName =
    providedCloudConnectorName ||
    getCloudConnectorNameFromPackagePolicy(
      updatedPackagePolicy,
      cloudProvider,
      policyName,
      packageInfo
    );

  // Extract account type from package policy vars
  const accountType = extractAccountType(cloudProvider, updatedPackagePolicy, packageInfo);

  try {
    const cloudConnector = await cloudConnectorService.create(soClient, {
      name: cloudConnectorName,
      vars: cloudConnectorVars,
      cloudProvider,
      accountType,
    });

    logger.info(`Successfully created cloud connector: ${cloudConnector.id}`);

    // Update package policy inputs with the secret references from cloud connector vars
    // This ensures that when extractAndWriteSecrets is called, it sees these as existing secrets
    updatedPackagePolicy = updatePackagePolicyWithCloudConnectorSecrets(
      updatedPackagePolicy,
      cloudConnectorVars,
      cloudProvider,
      packageInfo
    );

    // Set cloud connector ID on package policy
    updatedPackagePolicy = {
      ...updatedPackagePolicy,
      cloud_connector_id: cloudConnector.id,
    };

    return {
      packagePolicy: updatedPackagePolicy,
      cloudConnectorId: cloudConnector.id,
      wasCreated: true,
    };
  } catch (error) {
    logger.error(`Error creating cloud connector: ${error}`);
    throw new CloudConnectorCreateError(`${error}`);
  }
}
