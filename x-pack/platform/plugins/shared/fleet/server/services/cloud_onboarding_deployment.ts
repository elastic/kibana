/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type {
  CloudOnboardingDeployment,
  CloudOnboardingDeploymentMechanism,
  CreateCloudOnboardingDeploymentInput,
  UpdateCloudOnboardingDeploymentInput,
} from '../../common/types/models/cloud_onboarding_deployment';
import type { CloudOnboardingDeploymentSOAttributes } from '../types/so_attributes';

const CLOUD_ONBOARDING_DEPLOYMENT_LIMIT = 100;

const PUSH_MECHANISMS: CloudOnboardingDeploymentMechanism[] = ['firehose', 'cloud_forwarder'];

const CFN_TEMPLATE_URLS: Record<string, string> = {
  identity_federation:
    'https://elastic-cloudformation-templates.s3.amazonaws.com/identity-federation/latest.yaml',
  firehose: 'https://elastic-cloudformation-templates.s3.amazonaws.com/firehose/latest.yaml',
  cloud_forwarder:
    'https://elastic-cloudformation-templates.s3.amazonaws.com/cloud-forwarder/latest.yaml',
};

export interface PrepareResult {
  templateUrl: string;
  templateParameters: Record<string, string>;
  cliCommand: string;
  apiKeyId?: string;
}

class CloudOnboardingDeploymentService {
  public async create(
    soClient: SavedObjectsClientContract,
    input: CreateCloudOnboardingDeploymentInput
  ): Promise<CloudOnboardingDeployment> {
    // Validates connectorId exists in the same space; throws SavedObjectsErrorHelpers not-found if not.
    await soClient.get(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, input.connectorId);

    const attributes: CloudOnboardingDeploymentSOAttributes = {
      ...input,
      status: 'pending',
      attemptCount: 1,
    };

    const so = await soClient.create<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      attributes
    );

    return { id: so.id, ...so.attributes };
  }

  public async getById(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<CloudOnboardingDeployment> {
    const so = await soClient.get<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      id
    );

    return { id: so.id, ...so.attributes };
  }

  public async getByConnectorId(
    soClient: SavedObjectsClientContract,
    connectorId: string
  ): Promise<CloudOnboardingDeployment[]> {
    const finder = soClient.createPointInTimeFinder<CloudOnboardingDeploymentSOAttributes>({
      type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      filter: nodeBuilder.is(
        `${CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE}.attributes.connectorId`,
        connectorId
      ),
      perPage: CLOUD_ONBOARDING_DEPLOYMENT_LIMIT,
    });

    const deployments: CloudOnboardingDeployment[] = [];
    try {
      outer: for await (const result of finder.find()) {
        for (const so of result.saved_objects) {
          deployments.push({ id: so.id, ...so.attributes });
          if (deployments.length >= CLOUD_ONBOARDING_DEPLOYMENT_LIMIT) {
            break outer;
          }
        }
      }
    } finally {
      await finder.close();
    }
    return deployments;
  }

  public async update(
    soClient: SavedObjectsClientContract,
    id: string,
    update: UpdateCloudOnboardingDeploymentInput
  ): Promise<CloudOnboardingDeployment> {
    await soClient.update<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      id,
      { ...update }
    );

    return this.getById(soClient, id);
  }

  public async prepare(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string
  ): Promise<PrepareResult> {
    const deployment = await this.getById(soClient, id);

    if (deployment.status !== 'pending') {
      throw new Error(`Deployment ${id} is not in pending status (current: ${deployment.status})`);
    }

    const primaryMechanism = deployment.mechanisms[0] ?? 'agentless';
    const needsApiKey = deployment.mechanisms.some((m) => PUSH_MECHANISMS.includes(m));

    let apiKeyId: string | undefined;
    let apiKeyEncoded: string | undefined;

    if (needsApiKey) {
      const keyResponse = await esClient.security.createApiKey({
        name: `cloud-onboarding-${id}-${primaryMechanism}`,
        metadata: { deployment_id: id, mechanism: primaryMechanism },
      });
      apiKeyId = keyResponse.id;
      apiKeyEncoded = keyResponse.encoded;

      await soClient.update<CloudOnboardingDeploymentSOAttributes>(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        id,
        { apiKeyId }
      );
    }

    const templateUrl =
      CFN_TEMPLATE_URLS[primaryMechanism] ?? CFN_TEMPLATE_URLS.identity_federation;

    const templateParameters: Record<string, string> = {
      DeploymentId: id,
    };

    if (apiKeyEncoded) {
      templateParameters.ElasticApiKey = apiKeyEncoded;
    }

    if (deployment.serviceVars) {
      const allRegions = new Set<string>();
      for (const entries of Object.values(deployment.serviceVars)) {
        for (const entry of entries) {
          for (const r of entry.regions ?? []) {
            allRegions.add(r);
          }
          if (entry.aws_region) allRegions.add(entry.aws_region);
          if (entry.region) allRegions.add(entry.region);
        }
      }
      if (allRegions.size > 0) {
        templateParameters.Regions = [...allRegions].join(',');
      }
    }

    const paramFlags = Object.entries(templateParameters)
      .map(([k, v]) => `ParameterKey=${k},ParameterValue=${v}`)
      .join(' ');

    const cliCommand = [
      'aws cloudformation create-stack',
      `--stack-name elastic-onboarding-${primaryMechanism}`,
      `--template-url ${templateUrl}`,
      `--parameters ${paramFlags}`,
      '--capabilities CAPABILITY_NAMED_IAM',
    ].join(' \\\n  ');

    return { templateUrl, templateParameters, cliCommand, apiKeyId };
  }

  public async delete(soClient: SavedObjectsClientContract, id: string): Promise<void> {
    await soClient.delete(CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE, id);
  }
}

export const cloudOnboardingDeploymentService = new CloudOnboardingDeploymentService();
