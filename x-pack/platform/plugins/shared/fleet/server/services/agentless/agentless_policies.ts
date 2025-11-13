/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ElasticsearchClient,
  type KibanaRequest,
  type Logger,
  type RequestHandlerContext,
  type SavedObjectsClientContract,
} from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { v4 as uuidv4 } from 'uuid';
import { omit } from 'lodash';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';

import type { CreateAgentlessPolicyRequestSchema } from '../../../common/types';

import { AGENTLESS_AGENT_POLICY_INACTIVITY_TIMEOUT } from '../../../common/constants';

import { simplifiedPackagePolicytoNewPackagePolicy } from '../../../common/services/simplified_package_policy_helper';

import { HTTPAuthorizationHeader } from '../../../common/http_authorization_header';
import type { PackagePolicyClient } from '../package_policy_service';

import { agentPolicyService } from '../agent_policy';
import { getPackageInfo } from '../epm/packages';
import { appContextService, cloudConnectorService } from '../app_context';

import type { PackageInfo } from '../../types';
import {
  getAgentlessAgentPolicyNameFromPackagePolicyName,
  getAgentlessGlobalDataTags,
} from '../../../common/services/agentless_policy_helper';
import { agentlessAgentService } from '../agents/agentless_agent';
import {
  createAndIntegrateCloudConnector,
  cleanupCloudConnectorForPolicy,
  decrementCloudConnectorPackageCount,
} from '../cloud_connectors';

export interface AgentlessPoliciesService {
  createAgentlessPolicy: (
    data: TypeOf<typeof CreateAgentlessPolicyRequestSchema.body>,
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ) => Promise<any>;

  deleteAgentlessPolicy: (
    policyId: string,
    options?: { force?: boolean },
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ) => Promise<void>;
}

const getAgentlessPolicy = (packageInfo?: PackageInfo) => {
  if (
    !packageInfo?.policy_templates &&
    !packageInfo?.policy_templates?.some((policy) => policy.deployment_modes)
  ) {
    return;
  }
  const agentlessPolicyTemplate = packageInfo.policy_templates.find(
    (policy) => policy.deployment_modes
  );

  // assumes that all the policy templates agentless deployments modes indentify have the same organization, division and team
  const agentlessInfo = agentlessPolicyTemplate?.deployment_modes?.agentless;

  if (!agentlessInfo?.resources) {
    return;
  }

  return {
    resources: agentlessInfo.resources,
  };
};

export class AgentlessPoliciesServiceImpl implements AgentlessPoliciesService {
  constructor(
    private readonly packagePolicyService: PackagePolicyClient,
    private readonly soClient: SavedObjectsClientContract,
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  async createAgentlessPolicy(
    data: TypeOf<typeof CreateAgentlessPolicyRequestSchema.body>,
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ) {
    const packagePolicyId = data.id || uuidv4();

    const agentPolicyId = packagePolicyId; // Use the same ID for agent policy and package policy
    const force = data.force;
    this.logger.debug('Creating agentless policy');

    const user = request
      ? appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined
      : undefined;
    const authorizationHeader = request
      ? HTTPAuthorizationHeader.parseFromRequest(request, user?.username)
      : null;

    const spaceId = this.soClient.getCurrentNamespace() || DEFAULT_SPACE_ID;

    let createdAgentPolicyId: string | undefined;
    let createdCloudConnectorId: string | undefined;
    let cloudConnectorWasCreated = false;

    try {
      const pkg = data.package;
      this.logger.debug(`Creating agentless agent policy ${agentPolicyId}`);
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: this.soClient,
        pkgName: pkg.name,
        pkgVersion: pkg.version,
        ignoreUnverified: force,
        prerelease: true,
      });
      const { outputId, fleetServerId } = agentlessAgentService.getDefaultSettings();

      const agentPolicyName = getAgentlessAgentPolicyNameFromPackagePolicyName(data.name);
      const agentPolicy = await agentPolicyService.create(
        this.soClient,
        this.esClient,
        {
          name: agentPolicyName,
          description: 'Internal agentless policy',
          inactivity_timeout: AGENTLESS_AGENT_POLICY_INACTIVITY_TIMEOUT,
          supports_agentless: true,
          namespace: data.namespace || 'default',
          monitoring_enabled: [],
          keep_monitoring_alive: true,
          agentless: getAgentlessPolicy(pkgInfo),
          global_data_tags: getAgentlessGlobalDataTags(pkgInfo),
          fleet_server_host_id: fleetServerId,
          data_output_id: outputId,
          is_protected: false,
        },
        { id: agentPolicyId, skipDeploy: true, authorizationHeader, user }
      );

      createdAgentPolicyId = agentPolicy.id;

      const newPolicy = {
        ...omit(data, 'id', 'package'),
        namespace: data.namespace || 'default',
        policy_ids: [agentPolicy.id],
        supports_agentless: true,
      };

      let newPackagePolicy = simplifiedPackagePolicytoNewPackagePolicy(newPolicy, pkgInfo);

      // Integrate cloud connector if enabled for this agentless policy
      const {
        packagePolicy: updatedPackagePolicy,
        cloudConnectorId,
        wasCreated,
      } = await createAndIntegrateCloudConnector({
        packagePolicy: newPackagePolicy,
        agentPolicy,
        policyName: data.name,
        soClient: this.soClient,
        esClient: this.esClient,
        logger: this.logger,
      });

      newPackagePolicy = updatedPackagePolicy;
      createdCloudConnectorId = cloudConnectorId;
      cloudConnectorWasCreated = wasCreated;

      // Create package policy
      this.logger.debug(`Creating agentless package policy ${packagePolicyId}`);
      const packagePolicy = await this.packagePolicyService.create(
        this.soClient,
        this.esClient,
        newPackagePolicy,
        {
          id: packagePolicyId,
          force,
          bumpRevision: false,
          spaceId,
          authorizationHeader,
          user,
        },
        context,
        request
      );

      this.logger.debug(`Deploy agentless policy ${agentPolicyId}`);
      await agentPolicyService.deployPolicy(this.soClient, agentPolicyId, undefined, {
        throwOnAgentlessError: true,
      });

      return packagePolicy;
    } catch (err) {
      // Handle cloud connector rollback
      if (createdCloudConnectorId) {
        if (cloudConnectorWasCreated) {
          // If we created a new cloud connector, delete it to avoid orphaned connectors
          this.logger.debug(
            `Rolling back: deleting created cloud connector ${createdCloudConnectorId}`
          );
          await cloudConnectorService
            .delete(this.soClient, createdCloudConnectorId, true)
            .catch((e) => {
              this.logger.error(
                `Failed to delete cloud connector ${createdCloudConnectorId}: ${e.message}`,
                { error: e }
              );
            });
        } else {
          // If we reused an existing cloud connector, decrement its usage count
          this.logger.debug(
            `Rolling back: decrementing count for reused cloud connector ${createdCloudConnectorId}`
          );
          await decrementCloudConnectorPackageCount(
            this.soClient,
            createdCloudConnectorId,
            this.logger
          ).catch((e) => {
            this.logger.error(
              `Failed to decrement cloud connector package count for ${createdCloudConnectorId}: ${e.message}`,
              { error: e }
            );
          });
        }
      }

      // If policy was created and error happens later during package policy creation or agentless API call, delete the created policy to avoid orphaned policies
      if (createdAgentPolicyId) {
        await agentPolicyService
          .delete(this.soClient, this.esClient, createdAgentPolicyId, {
            force: true,
          })
          .catch((e) => {
            this.logger.error(
              `Failed to delete agentless agent policy ${createdAgentPolicyId}: ${e.message}`,
              { error: e }
            );
          });
      }

      throw err;
    }
  }

  async deleteAgentlessPolicy(
    policyId: string,
    options?: { force?: boolean },
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ) {
    this.logger.debug(`Deleting agentless policy ${policyId}`);

    const user = request
      ? appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined
      : undefined;

    const agentPolicy = await agentPolicyService.get(this.soClient, policyId);
    if (!agentPolicy?.supports_agentless) {
      throw new Error(`Policy ${policyId} is not an agentless policy`);
    }

    // Cleanup cloud connector if associated with this policy
    await cleanupCloudConnectorForPolicy(
      this.soClient,
      this.packagePolicyService,
      policyId,
      this.logger
    );

    // Delete agent policy (this will also delete associated package policies)
    await agentPolicyService.delete(this.soClient, this.esClient, policyId, {
      force: options?.force,
      user,
    });
  }
}
