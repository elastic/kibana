/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type {
  SOSecretPath,
  AwsCloudConnectorVars,
  AzureCloudConnectorVars,
} from '../../../common/types';
import type {
  CreateCloudConnectorRequest,
  CreateCloudConnectorRequestWithSecrets,
  CreateCloudConnectorWithProcessedSecrets,
  UpdateCloudConnectorRequest,
} from '../../../common/types/rest_spec/cloud_connector';
import type { CloudConnector, CloudProvider } from '../../../common/types/models/cloud_connector';
import type { SecretReference } from '../../types';

import { extractAndWriteSOSecrets, extractAndUpdateSOSecrets, deleteSOSecrets } from './common';

/**
 * Extracts secrets from cloud connector variables and writes them to secrets storage
 * Returns the cloud connector with secret references and list of created secret IDs
 *
 * This function transforms CreateCloudConnectorRequestWithSecrets (raw string secrets)
 * into CreateCloudConnectorRequest (with CloudConnectorSecretReference objects)
 */
export async function extractAndWriteCloudConnectorSecrets(opts: {
  cloudConnector: CreateCloudConnectorRequestWithSecrets;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{
  cloudConnector: CreateCloudConnectorWithProcessedSecrets;
  secretReferences: SecretReference[];
}> {
  const { cloudConnector, esClient, secretHashes = {} } = opts;
  const secretPaths = getCloudConnectorSecretPaths(
    cloudConnector.cloudProvider,
    cloudConnector
  ).filter((path) => typeof path.value === 'string');

  const secretRes = await extractAndWriteSOSecrets<CreateCloudConnectorRequestWithSecrets>({
    soObject: cloudConnector,
    secretPaths,
    esClient,
    secretHashes,
  });

  // Type assertion is safe here: extractAndWriteSOSecrets transforms the object at runtime,
  // replacing string secret values with CloudConnectorSecretReference objects.
  // CreateCloudConnectorWithProcessedSecrets accurately represents this transformed state.
  return {
    cloudConnector:
      secretRes.soObjectWithSecrets as unknown as CreateCloudConnectorWithProcessedSecrets,
    secretReferences: secretRes.secretReferences,
  };
}

/**
 * Updates secrets for an existing cloud connector
 * Returns the updated cloud connector with secret references and secrets to delete
 */
export async function extractAndUpdateCloudConnectorSecrets(opts: {
  oldCloudConnector: CloudConnector;
  cloudConnectorUpdate: Partial<UpdateCloudConnectorRequest>;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{
  cloudConnectorUpdate: Partial<UpdateCloudConnectorRequest>;
  secretReferences: SecretReference[];
  secretsToDelete: SecretReference[];
}> {
  const { oldCloudConnector, cloudConnectorUpdate, esClient, secretHashes } = opts;
  const cloudProvider = cloudConnectorUpdate.cloudProvider || oldCloudConnector.cloudProvider;
  const oldSecretPaths = getCloudConnectorSecretPaths(
    oldCloudConnector.cloudProvider,
    oldCloudConnector
  );
  const updatedSecretPaths = getCloudConnectorSecretPaths(cloudProvider, cloudConnectorUpdate);

  const secretRes = await extractAndUpdateSOSecrets<UpdateCloudConnectorRequest>({
    updatedSoObject: cloudConnectorUpdate,
    oldSecretPaths,
    updatedSecretPaths,
    esClient,
    secretHashes: cloudConnectorUpdate.vars ? secretHashes : undefined,
  });

  return {
    cloudConnectorUpdate: secretRes.updatedSoObject,
    secretReferences: secretRes.secretReferences,
    secretsToDelete: secretRes.secretsToDelete,
  };
}

/**
 * Deletes all secrets associated with a cloud connector
 */
export async function deleteCloudConnectorSecrets(opts: {
  cloudConnector: CloudConnector;
  esClient: ElasticsearchClient;
}): Promise<void> {
  const { cloudConnector, esClient } = opts;
  const cloudConnectorSecretPaths = getCloudConnectorSecretPaths(
    cloudConnector.cloudProvider,
    cloudConnector
  );

  await deleteSOSecrets(esClient, cloudConnectorSecretPaths);
}

/**
 * Extracts secret reference IDs from a cloud connector
 * Used for tracking which secrets are associated with a connector
 */
export function getCloudConnectorSecretReferences(
  cloudConnector: CloudConnector
): SecretReference[] {
  const secretReferences: SecretReference[] = [];

  if (cloudConnector.cloudProvider === 'aws') {
    const awsVars = cloudConnector.vars as AwsCloudConnectorVars;
    if (typeof awsVars.external_id?.value === 'object' && 'id' in awsVars.external_id.value) {
      secretReferences.push({
        id: awsVars.external_id.value.id,
      });
    }
  }

  if (cloudConnector.cloudProvider === 'azure') {
    const azureVars = cloudConnector.vars as AzureCloudConnectorVars;
    if (typeof azureVars.tenant_id?.value === 'object' && 'id' in azureVars.tenant_id.value) {
      secretReferences.push({
        id: azureVars.tenant_id.value.id,
      });
    }
    if (typeof azureVars.client_id?.value === 'object' && 'id' in azureVars.client_id.value) {
      secretReferences.push({
        id: azureVars.client_id.value.id,
      });
    }
  }

  return secretReferences;
}

/**
 * Returns the secret paths for a cloud connector based on its provider
 * This is the core function that defines which fields contain secrets for each provider
 */
function getCloudConnectorSecretPaths(
  cloudProvider: CloudProvider,
  cloudConnector:
    | CreateCloudConnectorRequest
    | CreateCloudConnectorRequestWithSecrets
    | Partial<UpdateCloudConnectorRequest>
    | CloudConnector
): SOSecretPath[] {
  const secretPaths: SOSecretPath[] = [];

  if (!cloudConnector.vars) {
    return secretPaths;
  }

  switch (cloudProvider) {
    case 'aws':
      return getAwsSecretPaths(cloudConnector.vars as AwsCloudConnectorVars);
    case 'azure':
      return getAzureSecretPaths(cloudConnector.vars as AzureCloudConnectorVars);
    default:
      return secretPaths;
  }
}

/**
 * AWS secret paths
 * AWS cloud connectors store the external_id as a secret
 */
function getAwsSecretPaths(vars: AwsCloudConnectorVars): SOSecretPath[] {
  const secretPaths: SOSecretPath[] = [];

  if (vars.external_id?.value) {
    secretPaths.push({
      path: 'vars.external_id.value',
      value: vars.external_id.value,
    });
  }

  return secretPaths;
}

/**
 * Azure secret paths
 * Azure cloud connectors store the tenant_id and client_id as secrets
 */
function getAzureSecretPaths(vars: AzureCloudConnectorVars): SOSecretPath[] {
  const secretPaths: SOSecretPath[] = [];

  if (vars.tenant_id?.value) {
    secretPaths.push({
      path: 'vars.tenant_id.value',
      value: vars.tenant_id.value,
    });
  }

  if (vars.client_id?.value) {
    secretPaths.push({
      path: 'vars.client_id.value',
      value: vars.client_id.value,
    });
  }

  return secretPaths;
}
