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

// TODO: Replace with values served by the upcoming IaC template-generation plugin.
const CFN_TEMPLATE_URLS: Record<string, string> = {
  identity_federation:
    'https://elastic-cloudformation-templates.s3.amazonaws.com/identity-federation/latest.yaml',
  firehose: 'https://elastic-cloudformation-templates.s3.amazonaws.com/firehose/latest.yaml',
  cloud_forwarder:
    'https://elastic-cloudformation-templates.s3.amazonaws.com/cloud-forwarder/latest.yaml',
};

// Per-mechanism CloudFormation capabilities. Each template declares the IAM
// resources it manages; the user must acknowledge them via the matching capability.
const CFN_CAPABILITIES: Record<string, readonly string[]> = {
  identity_federation: ['CAPABILITY_NAMED_IAM'],
  firehose: ['CAPABILITY_IAM'],
  cloud_forwarder: ['CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
};

// Placeholder substituted for the encoded API key in the CLI command string so
// the secret never ends up in the user's shell history. The real key is still
// returned in `templateParameters` and `apiKeyId` for the AWS Console tab.
export const API_KEY_CLI_PLACEHOLDER = '<paste-elastic-api-key-here>';

// Quote a CLI argument with single quotes, escaping any embedded single quotes
// using the POSIX-portable `'\''` sequence.
const shellSingleQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

const collectRegions = (serviceVars: CloudOnboardingDeployment['serviceVars']): string[] => {
  const regions = new Set<string>();
  if (!serviceVars) {
    return [];
  }
  for (const entries of Object.values(serviceVars)) {
    for (const entry of entries) {
      for (const r of entry.regions ?? []) regions.add(r);
      if (entry.aws_region) regions.add(entry.aws_region);
      if (entry.region) regions.add(entry.region);
    }
  }
  return [...regions];
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
    update: UpdateCloudOnboardingDeploymentInput,
    esClient?: ElasticsearchClient
  ): Promise<CloudOnboardingDeployment> {
    if (update.status === 'pending' && update.attemptCount) {
      const current = await this.getById(soClient, id);
      if (current.apiKeyId && esClient) {
        await esClient.security.invalidateApiKey({ ids: [current.apiKeyId] }).catch(() => {});
      }
      await soClient.update<CloudOnboardingDeploymentSOAttributes>(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        id,
        { ...update, apiKeyId: undefined }
      );
    } else {
      await soClient.update<CloudOnboardingDeploymentSOAttributes>(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        id,
        { ...update }
      );
    }

    return this.getById(soClient, id);
  }

  public async complete(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<CloudOnboardingDeployment> {
    const deployment = await this.getById(soClient, id);

    if (deployment.status !== 'deploying') {
      throw new Error(
        `Deployment ${id} is not in deploying status (current: ${deployment.status})`
      );
    }

    await soClient.update<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      id,
      { status: 'succeeded' }
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

    const regions = collectRegions(deployment.serviceVars);
    const primaryRegion = regions[0];

    const templateParameters: Record<string, string> = {
      DeploymentId: id,
    };

    if (apiKeyEncoded) {
      templateParameters.ElasticApiKey = apiKeyEncoded;
    }

    if (regions.length > 0) {
      templateParameters.Regions = regions.join(',');
    }

    // The CLI variant uses a placeholder for the API key to keep the secret
    // out of shell history. Everything else mirrors templateParameters.
    const cliParameters: Record<string, string> = {
      ...templateParameters,
      ...(apiKeyEncoded ? { ElasticApiKey: API_KEY_CLI_PLACEHOLDER } : {}),
    };

    const paramFlags = Object.entries(cliParameters)
      .map(([k, v]) => `ParameterKey=${k},ParameterValue=${shellSingleQuote(v)}`)
      .join(' ');

    // Suffix with first 8 chars of the SO id to make repeated runs distinguishable.
    const stackName = `elastic-onboarding-${primaryMechanism}-${id.slice(0, 8)}`;
    const capabilities = CFN_CAPABILITIES[primaryMechanism] ?? ['CAPABILITY_NAMED_IAM'];

    const cliCommandParts = [
      'aws cloudformation create-stack',
      `--stack-name ${stackName}`,
      `--template-url ${templateUrl}`,
    ];
    if (primaryRegion) {
      cliCommandParts.push(`--region ${primaryRegion}`);
    }
    cliCommandParts.push(`--parameters ${paramFlags}`);
    cliCommandParts.push(`--capabilities ${capabilities.join(' ')}`);

    const cliCommand = cliCommandParts.join(' \\\n  ');

    return { templateUrl, templateParameters, cliCommand, apiKeyId };
  }

  public async delete(soClient: SavedObjectsClientContract, id: string): Promise<void> {
    await soClient.delete(CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE, id);
  }
}

export const cloudOnboardingDeploymentService = new CloudOnboardingDeploymentService();
