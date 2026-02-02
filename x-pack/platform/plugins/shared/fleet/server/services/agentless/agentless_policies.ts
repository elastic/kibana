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

import type { AgentlessPolicy, CreateAgentlessPolicyRequestSchema } from '../../../common/types';

import { AGENTLESS_AGENT_POLICY_INACTIVITY_TIMEOUT } from '../../../common/constants';

import { simplifiedPackagePolicytoNewPackagePolicy } from '../../../common/services/simplified_package_policy_helper';

import { HTTPAuthorizationHeader } from '../../../common/http_authorization_header';
import type { PackagePolicyClient } from '../package_policy_service';

import { agentPolicyService } from '../agent_policy';
import { getPackageInfo } from '../epm/packages';
import { appContextService, cloudConnectorService } from '..';

import type { PackageInfo } from '../../types';
import {
  getAgentlessAgentPolicyNameFromPackagePolicyName,
  getAgentlessGlobalDataTags,
} from '../../../common/services/agentless_policy_helper';
import { agentlessAgentService } from '../agents/agentless_agent';
import { createAndIntegrateCloudConnector } from '../cloud_connectors';

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

const getAgentlessPolicy = (packageInfo?: PackageInfo): AgentlessPolicy | undefined => {
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

    const policyTemplate = data.policy_template;

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

      // Get base agentless config from package info
      const baseAgentlessConfig = getAgentlessPolicy(pkgInfo);

      // Build agentless config with cloud connectors if provided
      let agentlessConfig = baseAgentlessConfig;
      if (data.cloud_connector?.enabled) {
        const inputsArray = data.inputs ? Object.entries(data.inputs) : [];
        const input = inputsArray.find(([, pinput]) => pinput.enabled !== false);
        const targetCsp = input?.[0].match(/aws|azure|gcp/)?.[0] as
          | 'aws'
          | 'azure'
          | 'gcp'
          | undefined;

        this.logger.debug(
          `Configuring cloud connectors for cloud provider: ${targetCsp} from cloud_connector object`
        );
        agentlessConfig = {
          ...baseAgentlessConfig,
          cloud_connectors: {
            target_csp: targetCsp,
            enabled: true,
          },
        };
      }

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
          agentless: agentlessConfig,
          global_data_tags: getAgentlessGlobalDataTags(pkgInfo),
          fleet_server_host_id: fleetServerId,
          data_output_id: outputId,
          is_protected: false,
        },
        { id: agentPolicyId, skipDeploy: true, authorizationHeader, user }
      );

      createdAgentPolicyId = agentPolicy.id;

      const newPolicy = {
        ...omit(data, 'id', 'package', 'cloud_connector'),
        namespace: data.namespace || 'default',
        policy_ids: [agentPolicy.id],
        supports_agentless: true,
        // Extract cloud connector fields from cloud_connector object
        ...(data.cloud_connector &&
          data.cloud_connector.enabled && {
            supports_cloud_connector: true,
            ...(data.cloud_connector.cloud_connector_id && {
              cloud_connector_id: data.cloud_connector.cloud_connector_id,
            }),
          }),
      };

      let newPackagePolicy = simplifiedPackagePolicytoNewPackagePolicy(newPolicy, pkgInfo, {
        policyTemplate,
      });

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
        cloudConnectorName: data.cloud_connector?.name,
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
            .delete(this.soClient, this.esClient, createdCloudConnectorId, true)
            .catch((e: Error) => {
              this.logger.error(
                `Failed to delete cloud connector ${createdCloudConnectorId}: ${e.message}`,
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

    // Delete agent policy (this will also delete associated package policies)
    await agentPolicyService.delete(this.soClient, this.esClient, policyId, {
      force: options?.force,
      user,
    });
  }
}
