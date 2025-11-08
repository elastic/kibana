/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import type { NewAgentPolicy, NewPackagePolicy } from '../types';
import type { HTTPAuthorizationHeader } from '../../common/http_authorization_header';
import type { CreateCloudConnectorRequestWithSecrets } from '../../common/types/rest_spec/cloud_connector';
import type { AgentPolicy } from '../../common/types';

import type { AgentPolicyServiceInterface } from '.';
import { appContextService, packagePolicyService, cloudConnectorService } from '.';
import {
  extractAndWriteCloudConnectorSecrets,
  deleteCloudConnectorSecrets,
} from './secrets/cloud_connectors';

export interface CreateAgentPolicyWithCloudConnectorParams {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  agentPolicyService: AgentPolicyServiceInterface;
  newPolicy: NewAgentPolicy;
  cloudConnectorRequest: CreateCloudConnectorRequestWithSecrets;
  packagePolicyRequest: Omit<NewPackagePolicy, 'policy_id' | 'policy_ids'>;
  spaceId: string;
  user?: AuthenticatedUser;
  authorizationHeader?: HTTPAuthorizationHeader | null;
  force?: boolean;
}

export interface CreateAgentPolicyWithCloudConnectorResult {
  agentPolicyId: string;
  cloudConnectorId: string;
  packagePolicyId: string;
}

/**
 * Atomically creates agent policy, cloud connector, and package policy
 * Implements rollback on failure to prevent orphaned resources
 *
 * Order of operations:
 * 1. Create agent policy (with skipDeploy: true)
 * 2. Create cloud connector with secrets handling
 * 3. Create package policy referencing the cloud connector
 * 4. Deploy the agent policy
 *
 * Rollback order (if any step fails):
 * 1. Delete package policy (if created)
 * 2. Delete cloud connector and its secrets (if created)
 * 3. Delete agent policy (if created)
 */
export async function createAgentPolicyWithCloudConnector({
  soClient,
  esClient,
  agentPolicyService,
  newPolicy,
  cloudConnectorRequest,
  packagePolicyRequest,
  spaceId,
  user,
  authorizationHeader,
  force,
}: CreateAgentPolicyWithCloudConnectorParams): Promise<CreateAgentPolicyWithCloudConnectorResult> {
  const logger = appContextService.getLogger().get('createAgentPolicyWithCloudConnector');

  logger.debug(
    `Creating agent policy [${newPolicy.name}] with cloud connector [${cloudConnectorRequest.name}] in space [${spaceId}]`
  );

  let createdAgentPolicy: AgentPolicy | undefined;
  let createdCloudConnector: any | undefined;
  let createdPackagePolicy: any | undefined;

  try {
    // Step 1: Create agent policy (skip deployment until all resources are ready)
    logger.debug(`Creating agent policy [${newPolicy.name}]`);
    createdAgentPolicy = await agentPolicyService.create(
      soClient,
      esClient,
      {
        ...newPolicy,
        // Disable monitoring for agentless policies
        monitoring_enabled: newPolicy.supports_agentless ? [] : newPolicy.monitoring_enabled,
      },
      {
        user,
        authorizationHeader,
        skipDeploy: true, // CRITICAL: Skip deployment until package policy is added
      }
    );
    logger.info(`Created agent policy [${createdAgentPolicy.id}]`);

    // Step 2: Create cloud connector with secrets handling
    logger.debug(
      `Creating cloud connector [${cloudConnectorRequest.name}] for provider [${cloudConnectorRequest.cloudProvider}]`
    );

    const { cloudConnector: cloudConnectorWithSecrets, secretReferences } =
      await extractAndWriteCloudConnectorSecrets({
        cloudConnector: cloudConnectorRequest,
        esClient,
      });

    createdCloudConnector = await cloudConnectorService.create(soClient, cloudConnectorWithSecrets);
    logger.info(
      `Created cloud connector [${createdCloudConnector.id}] with [${secretReferences.length}] secrets`
    );

    // Step 3: Create package policy with cloud connector reference
    logger.debug(
      `Creating package policy [${packagePolicyRequest.name}] with cloud connector reference`
    );
    const packagePolicyWithConnector: NewPackagePolicy = {
      ...packagePolicyRequest,
      policy_id: createdAgentPolicy.id,
      policy_ids: [createdAgentPolicy.id],
      cloud_connector_id: createdCloudConnector.id,
      supports_cloud_connector: true,
    };

    createdPackagePolicy = await packagePolicyService.create(
      soClient,
      esClient,
      packagePolicyWithConnector,
      {
        spaceId,
        user,
        bumpRevision: false, // We'll bump when deploying
        authorizationHeader,
        force,
      }
    );
    logger.info(
      `Created package policy [${createdPackagePolicy.id}] with cloud connector [${createdCloudConnector.id}]`
    );

    // Step 4: Deploy the agent policy (this will trigger agentless agent creation if needed)
    logger.debug(`Deploying agent policy [${createdAgentPolicy.id}]`);
    try {
      await agentPolicyService.deployPolicy(soClient, createdAgentPolicy.id, undefined, {
        throwOnAgentlessError: true, // Fail fast for agentless deployment errors
      });
      logger.info(`Successfully deployed agent policy [${createdAgentPolicy.id}]`);
    } catch (deployError) {
      logger.error(
        `Failed to deploy agent policy [${createdAgentPolicy.id}]: ${deployError.message}`
      );
      throw deployError;
    }

    return {
      agentPolicyId: createdAgentPolicy.id,
      cloudConnectorId: createdCloudConnector.id,
      packagePolicyId: createdPackagePolicy.id,
    };
  } catch (error) {
    logger.error(
      `Failed to create agent policy with cloud connector: ${error.message}. Initiating rollback.`
    );

    // Rollback in reverse order of creation
    // Use .catch() to suppress rollback errors and avoid masking the original error

    // Rollback Step 3: Delete package policy if created
    if (createdPackagePolicy) {
      logger.warn(`Rolling back: Deleting package policy [${createdPackagePolicy.id}]`);
      await packagePolicyService
        .delete(soClient, esClient, [createdPackagePolicy.id], {
          force: true,
          skipUnassignFromAgentPolicies: true,
        })
        .catch((rollbackError) => {
          logger.error(
            `Error during rollback - failed to delete package policy [${createdPackagePolicy.id}]: ${rollbackError.message}`
          );
        });
    }

    // Rollback Step 2: Delete cloud connector and its secrets if created
    if (createdCloudConnector) {
      logger.warn(
        `Rolling back: Deleting cloud connector [${createdCloudConnector.id}] and its secrets`
      );
      await cloudConnectorService
        .delete(soClient, createdCloudConnector.id, true) // force: true to bypass validation
        .catch((rollbackError) => {
          logger.error(
            `Error during rollback - failed to delete cloud connector [${createdCloudConnector.id}]: ${rollbackError.message}`
          );
        });

      await deleteCloudConnectorSecrets({
        cloudConnector: createdCloudConnector,
        esClient,
      }).catch((rollbackError) => {
        logger.error(
          `Error during rollback - failed to delete cloud connector secrets: ${rollbackError.message}`
        );
      });
    }

    // Rollback Step 1: Delete agent policy if created
    if (createdAgentPolicy) {
      logger.warn(`Rolling back: Deleting agent policy [${createdAgentPolicy.id}]`);
      await agentPolicyService
        .delete(soClient, esClient, createdAgentPolicy.id, {
          force: true,
          user,
        })
        .catch((rollbackError: any) => {
          logger.error(
            `Error during rollback - failed to delete agent policy [${createdAgentPolicy?.id}]: ${rollbackError.message}`
          );
        });
    }

    // Re-throw the original error
    throw error;
  }
}
