/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type {
  CloudProvider,
  CloudConnectorVars,
  PackageInfo,
  CloudConnectorSecretReference,
  CloudConnectorSecretVar,
  AwsCloudConnectorVars,
  AzureCloudConnectorVars,
} from '../../../common/types';
import {
  extractRawCredentialVars,
  getCredentialSchema,
  getAllVarKeys,
  findFirstVarEntry,
} from '../../../common/services/cloud_connectors';
import type { NewPackagePolicy } from '../../types';
import { CloudConnectorInvalidVarsError } from '../../errors';

import { createSecrets } from './common';

/**
 * Extracts cloud connector variables from a package policy's inputs and creates secrets for non-secret-ref values
 * This function handles cloud connector secret creation separately from package policy secrets,
 * decoupling cloud connector secret handling from extractAndWriteSecrets.
 *
 * @param cloudProvider - The cloud provider (aws, azure, gcp)
 * @param packagePolicy - The package policy containing cloud connector vars
 * @param packageInfo - The package info for storage mode detection
 * @param esClient - Elasticsearch client for creating secrets
 * @param logger - Logger instance
 * @returns CloudConnectorVars with secret references populated
 */
export async function extractAndCreateCloudConnectorSecrets(
  cloudProvider: CloudProvider,
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudConnectorVars | undefined> {
  logger.debug('Extracting package policy vars for cloud connector and creating secrets');

  if (packagePolicy.supports_cloud_connector && cloudProvider === 'aws') {
    return await extractAwsCloudConnectorSecrets(packagePolicy, packageInfo, esClient, logger);
  }

  if (packagePolicy.supports_cloud_connector && cloudProvider === 'azure') {
    return await extractAzureCloudConnectorSecrets(packagePolicy, packageInfo, esClient, logger);
  }
}

/**
 * Extracts AWS cloud connector variables and creates secrets
 */
async function extractAwsCloudConnectorSecrets(
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudConnectorVars | undefined> {
  // Use accessor to get vars from the correct location (package-level or input-level)
  const vars = extractRawCredentialVars(packagePolicy, packageInfo);

  if (!vars) {
    logger.error('Package policy must contain vars for AWS cloud connector');
    throw new CloudConnectorInvalidVarsError('Package policy must contain vars');
  }

  // Use schema to get all possible var keys for role_arn and external_id
  const schema = getCredentialSchema('aws');
  const roleArnKeys = getAllVarKeys(schema.fields.roleArn);
  const externalIdKeys = getAllVarKeys(schema.fields.externalId);

  // Look for role_arn using schema-defined keys
  const roleArnVar = findFirstVarEntry(vars, roleArnKeys);
  const roleArn = roleArnVar?.value as string | undefined;

  // Look for external_id using schema-defined keys
  const externalIdVar = findFirstVarEntry(vars, externalIdKeys);

  if (roleArn && externalIdVar) {
    let externalIdWithSecretRef: { type: 'password'; value: CloudConnectorSecretReference };

    // If external_id is not already a secret reference, create a secret for it
    if (externalIdVar.value && !externalIdVar.value.isSecretRef) {
      logger.debug('Creating secret for AWS external_id');
      const secrets = await createSecrets({
        esClient,
        values: [externalIdVar.value],
      });

      const firstSecret = secrets[0];
      if (Array.isArray(firstSecret)) {
        throw new CloudConnectorInvalidVarsError('Unexpected array of secrets for external_id');
      }

      externalIdWithSecretRef = {
        type: 'password' as const,
        value: {
          id: firstSecret.id,
          isSecretRef: true,
        },
      };
    } else {
      // Already a secret reference, ensure it has the correct type
      externalIdWithSecretRef = {
        type: 'password' as const,
        value: externalIdVar.value,
      };
    }

    const awsCloudConnectorVars = {
      role_arn: { type: 'text' as const, value: roleArn },
      external_id: externalIdWithSecretRef,
    };

    logger.debug(
      `Extracted AWS cloud connector vars: role_arn=${!!roleArn}, external_id=${!!externalIdWithSecretRef}`
    );
    return awsCloudConnectorVars;
  }

  logger.error('AWS cloud connector vars not found or incomplete');
  throw new CloudConnectorInvalidVarsError(
    'Missing required AWS cloud connector variables: role_arn and external_id'
  );
}

/**
 * Extracts Azure cloud connector variables and creates secrets
 */
async function extractAzureCloudConnectorSecrets(
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudConnectorVars | undefined> {
  // Use accessor to get vars from the correct location (package-level or input-level)
  const vars = extractRawCredentialVars(packagePolicy, packageInfo);

  if (!vars) {
    logger.error('Package policy must contain vars for Azure cloud connector');
    throw new CloudConnectorInvalidVarsError('Package policy must contain vars');
  }

  // Use schema to get all possible var keys for Azure credentials
  const schema = getCredentialSchema('azure');
  const tenantIdKeys = getAllVarKeys(schema.fields.tenantId);
  const clientIdKeys = getAllVarKeys(schema.fields.clientId);
  const connectorIdKeys = getAllVarKeys(schema.fields.azureCredentialsCloudConnectorId);

  // Look for Azure vars using schema-defined keys
  const tenantIdVar = findFirstVarEntry(vars, tenantIdKeys);
  const clientIdVar = findFirstVarEntry(vars, clientIdKeys);
  const azureCredentials = findFirstVarEntry(vars, connectorIdKeys);

  if (tenantIdVar && clientIdVar && azureCredentials) {
    let tenantIdWithSecretRef: CloudConnectorSecretVar = {
      type: 'password',
      value: tenantIdVar.value as CloudConnectorSecretReference,
    };
    let clientIdWithSecretRef: CloudConnectorSecretVar = {
      type: 'password',
      value: clientIdVar.value as CloudConnectorSecretReference,
    };

    // Create secrets for tenant_id and client_id if they're not already secret references
    const secretsToCreate: string[] = [];
    if (tenantIdVar.value && !tenantIdVar.value.isSecretRef) {
      secretsToCreate.push(tenantIdVar.value);
    }
    if (clientIdVar.value && !clientIdVar.value.isSecretRef) {
      secretsToCreate.push(clientIdVar.value);
    }

    if (secretsToCreate.length > 0) {
      logger.debug(`Creating ${secretsToCreate.length} secrets for Azure cloud connector`);
      const secrets = await createSecrets({
        esClient,
        values: secretsToCreate,
      });

      let secretIndex = 0;
      if (tenantIdVar.value && !tenantIdVar.value.isSecretRef) {
        const tenantSecret = secrets[secretIndex];
        if (Array.isArray(tenantSecret)) {
          throw new CloudConnectorInvalidVarsError('Unexpected array of secrets for tenant_id');
        }
        tenantIdWithSecretRef = {
          type: 'password',
          value: {
            id: tenantSecret.id,
            isSecretRef: true,
          },
        };
        secretIndex++;
      }
      if (clientIdVar.value && !clientIdVar.value.isSecretRef) {
        const clientSecret = secrets[secretIndex];
        if (Array.isArray(clientSecret)) {
          throw new CloudConnectorInvalidVarsError('Unexpected array of secrets for client_id');
        }
        clientIdWithSecretRef = {
          type: 'password',
          value: {
            id: clientSecret.id,
            isSecretRef: true,
          },
        };
      }
    }

    const azureCloudConnectorVars: AzureCloudConnectorVars = {
      tenant_id: tenantIdWithSecretRef,
      client_id: clientIdWithSecretRef,
      azure_credentials_cloud_connector_id: {
        type: 'text',
        value: azureCredentials.value as string,
      },
    };

    logger.debug(
      `Extracted Azure cloud connector vars: tenant_id=${!!tenantIdWithSecretRef}, client_id=${!!clientIdWithSecretRef}, azure_credentials=[REDACTED]`
    );

    return azureCloudConnectorVars;
  }

  logger.error(
    `Missing required Azure vars: tenant_id=${!!tenantIdVar}, client_id=${!!clientIdVar}, azure_credentials=[REDACTED]`
  );
  throw new CloudConnectorInvalidVarsError(
    'Missing required Azure cloud connector variables: ' +
      `tenant_id=${!!tenantIdVar}, client_id=${!!clientIdVar}, azure_credentials=[REDACTED]`
  );
}

/**
 * Extracts secret IDs from cloud connector variables for cleanup during deletion
 * This function handles extracting secret references from both AWS and Azure cloud connectors.
 *
 * @param cloudProvider - The cloud provider (aws, azure, gcp)
 * @param cloudConnectorVars - The cloud connector variables containing secret references
 * @returns Array of secret IDs to delete
 */
export function extractSecretIdsFromCloudConnectorVars(
  cloudProvider: CloudProvider,
  cloudConnectorVars: CloudConnectorVars
): string[] {
  const secretIds: string[] = [];

  if (cloudProvider === 'aws') {
    const awsVars = cloudConnectorVars as AwsCloudConnectorVars;
    // AWS has external_id as a secret
    if (awsVars.external_id?.value?.isSecretRef && awsVars.external_id.value.id) {
      secretIds.push(awsVars.external_id.value.id);
    }
  } else if (cloudProvider === 'azure') {
    const azureVars = cloudConnectorVars as AzureCloudConnectorVars;
    // Azure has tenant_id and client_id as secrets
    if (azureVars.tenant_id?.value?.isSecretRef && azureVars.tenant_id.value.id) {
      secretIds.push(azureVars.tenant_id.value.id);
    }
    if (azureVars.client_id?.value?.isSecretRef && azureVars.client_id.value.id) {
      secretIds.push(azureVars.client_id.value.id);
    }
  }

  return secretIds;
}
