/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import { getDefaultFleetServerpolicyId } from '../../common/services/agent_policies_helpers';

import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  FLEET_SERVER_PACKAGE,
  FLEET_SYSTEM_PACKAGE,
} from '../../common';

import type { AgentPolicy, NewAgentPolicy } from '../types';

import { type AgentPolicyServiceInterface, appContextService, packagePolicyService } from '.';
import { incrementPackageName } from './package_policies';
import { bulkInstallPackages } from './epm/packages';
import { ensureDefaultEnrollmentAPIKeyForAgentPolicy } from './api_keys';

async function getFleetServerAgentPolicyId(
  soClient: SavedObjectsClientContract,
  agentPolicyService: AgentPolicyServiceInterface
): Promise<string | undefined> {
  const logger = appContextService.getLogger().get('getFleetServerAgentPolicyId');

  logger.debug(
    `Retrieving fleet server agent policy id using soClient scoped to [${soClient.getCurrentNamespace()}]`
  );

  let agentPolicyId;
  // creating first fleet server policy with id '(space-)?fleet-server-policy'
  let agentPolicy;
  try {
    agentPolicy = await agentPolicyService.get(
      soClient,
      getDefaultFleetServerpolicyId(soClient.getCurrentNamespace()),
      false
    );
  } catch (err) {
    if (!err.isBoom || err.output.statusCode !== 404) {
      throw err;
    }
  }
  if (!agentPolicy) {
    agentPolicyId = getDefaultFleetServerpolicyId(soClient.getCurrentNamespace());
  }

  logger.debug(`Returning agent policy id [${agentPolicyId}]`);

  return agentPolicyId;
}

async function createPackagePolicy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicyService: AgentPolicyServiceInterface,
  agentPolicy: AgentPolicy,
  packageToInstall: string,
  options: {
    spaceId: string;
    user: AuthenticatedUser | undefined;
    request?: KibanaRequest;
    force?: boolean;
  }
) {
  const newPackagePolicy = await packagePolicyService
    .buildPackagePolicyFromPackage(soClient, packageToInstall)
    .catch(async (error) => {
      // rollback agent policy on error
      await agentPolicyService.delete(soClient, esClient, agentPolicy.id, {
        force: true,
        user: options.user,
      });

      throw error;
    });
  if (!newPackagePolicy) return;

  newPackagePolicy.policy_id = agentPolicy.id;
  newPackagePolicy.policy_ids = [agentPolicy.id];
  newPackagePolicy.name = await incrementPackageName(
    soClient,
    packageToInstall,
    agentPolicy.space_ids ?? [options.spaceId]
  );
  if (agentPolicy.supports_agentless) {
    newPackagePolicy.supports_agentless = agentPolicy.supports_agentless;
  }

  await packagePolicyService.create(
    soClient,
    esClient,
    newPackagePolicy,
    {
      spaceId: options.spaceId,
      user: options.user,
      bumpRevision: false,
      force: options.force,
    },
    undefined,
    options.request
  );
}

interface CreateAgentPolicyParams {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  agentPolicyService: AgentPolicyServiceInterface;
  newPolicy: NewAgentPolicy;
  hasFleetServer?: boolean;
  withSysMonitoring: boolean;
  monitoringEnabled?: string[];
  spaceId: string;
  user?: AuthenticatedUser;
  /** Pass force to all following calls: package install, policy creation */
  force?: boolean;
  /** Pass force only to package policy creation */
  forcePackagePolicyCreation?: boolean;
  request?: KibanaRequest;
}

export async function createAgentPolicyWithPackages({
  soClient,
  esClient,
  agentPolicyService,
  newPolicy,
  hasFleetServer,
  withSysMonitoring: withSysMonitoringParams,
  monitoringEnabled: monitoringEnabledParams,
  spaceId,
  user,
  request,
  force,
  forcePackagePolicyCreation,
}: CreateAgentPolicyParams) {
  const logger = appContextService.getLogger().get('createAgentPolicyWithPackages');

  logger.debug(
    `creating policy [${
      newPolicy.name
    }] for space [${spaceId}] using soClient scoped to [${soClient.getCurrentNamespace()}]`
  );

  let agentPolicyId = newPolicy.id;
  const packagesToInstall: string[] = [];
  if (hasFleetServer) {
    packagesToInstall.push(FLEET_SERVER_PACKAGE);

    agentPolicyId =
      agentPolicyId || (await getFleetServerAgentPolicyId(soClient, agentPolicyService));

    if (agentPolicyId === getDefaultFleetServerpolicyId(spaceId)) {
      // setting first fleet server policy to default, so that fleet server can enroll without setting policy_id
      newPolicy.is_default_fleet_server = true;
    }
  }

  const withSysMonitoring = withSysMonitoringParams && !newPolicy.supports_agentless;
  if (!withSysMonitoring && withSysMonitoringParams) {
    logger.info(`Disabling system monitoring for agentless policy [${newPolicy.name}]`);
  }
  const monitoringEnabled =
    newPolicy.supports_agentless && monitoringEnabledParams?.length
      ? []
      : (monitoringEnabledParams as NewAgentPolicy['monitoring_enabled']);

  if (monitoringEnabledParams?.length && !monitoringEnabled?.length) {
    logger.info(`Disabling monitoring for agentless policy [${newPolicy.name}]`);
  }
  if (newPolicy.supports_agentless) {
    newPolicy.keep_monitoring_alive = true;
    logger.info(`Enabling keep monitoring alive for agentless policy [${newPolicy.name}]`);
  }

  if (withSysMonitoring) {
    packagesToInstall.push(FLEET_SYSTEM_PACKAGE);
  }
  if (monitoringEnabled?.length) {
    packagesToInstall.push(FLEET_ELASTIC_AGENT_PACKAGE);
  }
  if (packagesToInstall.length > 0) {
    logger.debug(() => `Installing packages [${packagesToInstall.join(', ')}]`);

    await bulkInstallPackages({
      savedObjectsClient: soClient,
      esClient,
      packagesToInstall,
      spaceId,
      request,
      force,
    });
  }

  const { id, monitoring_enabled: _, ...policy } = newPolicy; // omit id from create object

  const agentPolicy = await agentPolicyService.create(
    soClient,
    esClient,
    { ...policy, monitoring_enabled: monitoringEnabled },
    {
      user,
      id: agentPolicyId,
      request,
      hasFleetServer,
      skipDeploy: true, // skip deploying the policy until package policies are added
    }
  );

  // Since agentPolicyService does not handle multispace assignments, we need to keep this context with package policy creation
  const agentPolicyWithStagedSpaces = {
    ...agentPolicy,
    space_ids: newPolicy.space_ids,
  };

  // Create the fleet server package policy and add it to agent policy.
  if (hasFleetServer) {
    await createPackagePolicy(
      soClient,
      esClient,
      agentPolicyService,
      agentPolicyWithStagedSpaces,
      FLEET_SERVER_PACKAGE,
      {
        spaceId,
        user,
        request,
        force: force || forcePackagePolicyCreation,
      }
    );
  }

  // Create the system monitoring package policy and add it to agent policy.
  if (withSysMonitoring) {
    await createPackagePolicy(
      soClient,
      esClient,
      agentPolicyService,
      agentPolicyWithStagedSpaces,
      FLEET_SYSTEM_PACKAGE,
      {
        spaceId,
        user,
        request,
        force: force || forcePackagePolicyCreation,
      }
    );
  }

  await ensureDefaultEnrollmentAPIKeyForAgentPolicy(soClient, esClient, agentPolicy.id);

  try {
    // Deploy policy will create the agentless agent if needed
    await agentPolicyService.deployPolicy(soClient, agentPolicy.id, undefined, {
      throwOnAgentlessError: true,
    });
  } catch (err) {
    if (agentPolicy.supports_agentless) {
      await agentPolicyService.delete(soClient, esClient, agentPolicy.id).catch(() => {
        appContextService
          .getLogger()
          .error(`Error deleting agentless policy`, { error: agentPolicy });
      });
    }
    throw err;
  }

  return agentPolicy;
}
