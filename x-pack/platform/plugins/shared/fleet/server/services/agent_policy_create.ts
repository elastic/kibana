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

import { getDefaultFleetServerpolicyId } from '../../common/services/agent_policies_helpers';
import type { HTTPAuthorizationHeader } from '../../common/http_authorization_header';

import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  FLEET_SERVER_PACKAGE,
  FLEET_SYSTEM_PACKAGE,
} from '../../common';

import type { AgentPolicy, NewAgentPolicy, NewPackagePolicy } from '../types';

import { AgentlessAgentCreateOverProvisionnedError } from '../errors';

import { agentPolicyService, appContextService, packagePolicyService } from '.';
import { incrementPackageName } from './package_policies';
import { bulkInstallPackages } from './epm/packages';
import { ensureDefaultEnrollmentAPIKeyForAgentPolicy } from './api_keys';
import { agentlessAgentService } from './agents/agentless_agent';

async function getFleetServerAgentPolicyId(
  soClient: SavedObjectsClientContract
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
  agentPolicy: AgentPolicy,
  packageToInstall: string,
  options: {
    spaceId: string;
    user: AuthenticatedUser | undefined;
    authorizationHeader?: HTTPAuthorizationHeader | null;
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
  newPackagePolicy.name = await incrementPackageName(soClient, packageToInstall);
  if (agentPolicy.supports_agentless) {
    newPackagePolicy.supports_agentless = agentPolicy.supports_agentless;
  }

  await packagePolicyService.create(soClient, esClient, newPackagePolicy, {
    spaceId: options.spaceId,
    user: options.user,
    bumpRevision: false,
    authorizationHeader: options.authorizationHeader,
    force: options.force,
  });
}

interface CreateAgentPolicyParams {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  newPolicy: NewAgentPolicy;
  hasFleetServer?: boolean;
  withSysMonitoring: boolean;
  monitoringEnabled?: string[];
  spaceId: string;
  user?: AuthenticatedUser;
  authorizationHeader?: HTTPAuthorizationHeader | null;
  force?: boolean;
}

export async function createAgentPolicyWithPackages({
  soClient,
  esClient,
  newPolicy,
  hasFleetServer,
  withSysMonitoring,
  monitoringEnabled,
  spaceId,
  user,
  authorizationHeader,
  force,
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

    agentPolicyId = agentPolicyId || (await getFleetServerAgentPolicyId(soClient));

    if (agentPolicyId === getDefaultFleetServerpolicyId(spaceId)) {
      // setting first fleet server policy to default, so that fleet server can enroll without setting policy_id
      newPolicy.is_default_fleet_server = true;
    }
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
      authorizationHeader,
      force,
    });
  }

  const { id, ...policy } = newPolicy; // omit id from create object

  const agentPolicy = await agentPolicyService.create(soClient, esClient, policy, {
    user,
    id: agentPolicyId,
    authorizationHeader,
    hasFleetServer,
    skipDeploy: true, // skip deploying the policy until package policies are added
  });

  // Create the fleet server package policy and add it to agent policy.
  if (hasFleetServer) {
    await createPackagePolicy(soClient, esClient, agentPolicy, FLEET_SERVER_PACKAGE, {
      spaceId,
      user,
      authorizationHeader,
      force,
    });
  }

  // Create the system monitoring package policy and add it to agent policy.
  if (withSysMonitoring) {
    await createPackagePolicy(soClient, esClient, agentPolicy, FLEET_SYSTEM_PACKAGE, {
      spaceId,
      user,
      authorizationHeader,
      force,
    });
  }

  await ensureDefaultEnrollmentAPIKeyForAgentPolicy(soClient, esClient, agentPolicy.id);
  await agentPolicyService.deployPolicy(soClient, agentPolicy.id);

  // Create the agentless agent
  if (agentPolicy.supports_agentless) {
    try {
      await agentlessAgentService.createAgentlessAgent(esClient, soClient, agentPolicy);
    } catch (err) {
      if (err instanceof AgentlessAgentCreateOverProvisionnedError) {
        await agentPolicyService.delete(soClient, esClient, agentPolicy.id).catch((deleteError) => {
          appContextService
            .getLogger()
            .error(`Error deleting agentless policy`, { error: agentPolicy });
        });
      }
      throw err;
    }
  }

  return agentPolicy;
}

interface CreateAgentAndPackagePoliciesParams {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  newPolicy: NewAgentPolicy;
  newPackagePolicies: NewPackagePolicy[];
  hasFleetServer?: boolean;
  withSysMonitoring: boolean;
  monitoringEnabled?: string[];
  spaceId: string;
  user?: AuthenticatedUser;
  authorizationHeader?: HTTPAuthorizationHeader | null;
  force?: boolean;
}

export async function createAgentPolicyAndPackagePolicies({
  soClient,
  esClient,
  newPolicy,
  newPackagePolicies,
  hasFleetServer,
  withSysMonitoring,
  monitoringEnabled,
  spaceId,
  user,
  authorizationHeader,
  force,
}: CreateAgentAndPackagePoliciesParams) {
  const logger = appContextService.getLogger().get('createAgentPolicyAndPackagePolicies');

  const agentPolicy = await createAgentPolicyWithPackages({
    soClient,
    esClient,
    newPolicy,
    hasFleetServer,
    withSysMonitoring,
    monitoringEnabled,
    spaceId,
    user,
    authorizationHeader,
    force,
  });

  const createdPackagePolicyIds = [];

  try {
    for (const newPackagePolicy of newPackagePolicies) {
      // Extract the original agent policy ID from the request in order to replace it with the created agent policy ID
      const {
        policy_id: agentPolicyId,
        policy_ids: agentPolicyIds,
        ...restOfPackagePolicy
      } = newPackagePolicy;

      // Warn if the requested agent policy ID does not match the created agent policy ID
      if (agentPolicyId && agentPolicyId !== agentPolicy.id) {
        logger.warn(
          `Creating package policy with agent policy ID ${agentPolicy.id} instead of requested id ${agentPolicyId}`
        );
      }
      if (
        agentPolicyIds &&
        agentPolicyIds.length > 0 &&
        (!agentPolicyIds.includes(agentPolicy.id) || agentPolicyIds.length > 1)
      ) {
        logger.warn(
          `Creating package policy with agent policy ID ${
            agentPolicy.id
          } instead of requested id(s) ${agentPolicyIds.join(',')}`
        );
      }

      const newPackagePolicyWithPolicyIds = {
        ...restOfPackagePolicy,
        policy_ids: [agentPolicy.id],
      };

      const packagePolicy = await packagePolicyService.create(
        soClient,
        esClient,
        newPackagePolicyWithPolicyIds,
        {
          spaceId,
          user,
          bumpRevision: false,
          authorizationHeader,
          force,
        }
      );

      createdPackagePolicyIds.push(packagePolicy.id);
    }

    return agentPolicyService.get(soClient, agentPolicy.id);
  } catch (e) {
    // If there is an error creating package policies, delete any created package policy
    // and the parent agent policy
    const internalSOClient = appContextService.getInternalUserSOClient();
    const internalESClient = appContextService.getInternalUserESClient();

    if (createdPackagePolicyIds.length > 0) {
      await packagePolicyService.delete(
        internalSOClient,
        internalESClient,
        createdPackagePolicyIds,
        {
          force: true,
          skipUnassignFromAgentPolicies: true,
        }
      );
    }
    if (agentPolicy) {
      await agentPolicyService.delete(internalSOClient, internalESClient, agentPolicy.id, {
        force: true,
      });
    }

    // Rethrow
    throw e;
  }
}
