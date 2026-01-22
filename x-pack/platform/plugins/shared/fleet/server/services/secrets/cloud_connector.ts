/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { CloudProvider, CloudConnectorVars } from '../../../common/types';
import type { PackagePolicyConfigRecordEntry } from '../../../common/types/models/package_policy';
import {
  extractRawCredentialVars,
  getCredentialSchema,
  getSecretVarKeys,
} from '../../../common/services/cloud_connectors';
import type { NewPackagePolicy } from '../../types';
import { CloudConnectorInvalidVarsError } from '../../errors';

import { createSecrets } from './common';

/**
 * Finds a var value from a vars container, checking primary key and alternative keys.
 */
function findVarByKeys(
  vars: Record<string, PackagePolicyConfigRecordEntry> | undefined,
  primaryKey: string,
  alternativeKeys?: string[]
): PackagePolicyConfigRecordEntry | undefined {
  if (!vars) {
    return undefined;
  }

  // Check primary key first
  if (vars[primaryKey]) {
    return vars[primaryKey];
  }

  // Check alternative keys
  if (alternativeKeys) {
    for (const altKey of alternativeKeys) {
      if (vars[altKey]) {
        return vars[altKey];
      }
    }
  }

  return undefined;
}

/**
 * Extracts cloud connector variables from a package policy's inputs and creates secrets for non-secret-ref values
 * This function handles cloud connector secret creation separately from package policy secrets,
 * decoupling cloud connector secret handling from extractAndWriteSecrets.
 *
 * @param cloudProvider - The cloud provider (aws, azure, gcp)
 * @param packagePolicy - The package policy containing cloud connector vars
 * @param esClient - Elasticsearch client for creating secrets
 * @param logger - Logger instance
 * @returns CloudConnectorVars with secret references populated
 */
export async function extractAndCreateCloudConnectorSecrets(
  cloudProvider: CloudProvider,
  packagePolicy: NewPackagePolicy,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudConnectorVars | undefined> {
  logger.debug('Extracting package policy vars for cloud connector and creating secrets');

  if (!packagePolicy.supports_cloud_connector) {
    return undefined;
  }

  if (cloudProvider === 'aws') {
    return await extractAwsCloudConnectorSecrets(packagePolicy, esClient, logger);
  }

  if (cloudProvider === 'azure') {
    return await extractAzureCloudConnectorSecrets(packagePolicy, esClient, logger);
  }

  // GCP not yet supported
  return undefined;
}

/**
 * Extracts AWS cloud connector variables and creates secrets using the var accessor schema.
 */
async function extractAwsCloudConnectorSecrets(
  packagePolicy: NewPackagePolicy,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudConnectorVars | undefined> {
  const schema = getCredentialSchema('aws');
  const vars = extractRawCredentialVars(packagePolicy, 'aws');

  if (!vars) {
    logger.error('Package policy must contain vars for AWS cloud connector');
    throw new CloudConnectorInvalidVarsError('Package policy must contain vars');
  }

  // Extract vars using schema keys (with alternative key support)
  const roleArnConfig = schema.varKeys.find((k) => k.logicalName === 'role_arn');
  const externalIdConfig = schema.varKeys.find((k) => k.logicalName === 'external_id');

  const roleArnVar = roleArnConfig
    ? findVarByKeys(vars, roleArnConfig.varKey, roleArnConfig.alternativeKeys)
    : undefined;
  const externalIdVar = externalIdConfig
    ? findVarByKeys(vars, externalIdConfig.varKey, externalIdConfig.alternativeKeys)
    : undefined;

  const roleArn = roleArnVar?.value;

  if (roleArn && externalIdVar) {
    let externalIdWithSecretRef: { type: 'password'; value: any };

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
 * Extracts Azure cloud connector variables and creates secrets using the var accessor schema.
 */
async function extractAzureCloudConnectorSecrets(
  packagePolicy: NewPackagePolicy,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudConnectorVars | undefined> {
  const schema = getCredentialSchema('azure');
  const vars = extractRawCredentialVars(packagePolicy, 'azure');

  if (!vars) {
    logger.error('Package policy must contain vars for Azure cloud connector');
    throw new CloudConnectorInvalidVarsError('Package policy must contain vars');
  }

  // Extract vars using schema keys (with alternative key support)
  const tenantIdConfig = schema.varKeys.find((k) => k.logicalName === 'tenant_id');
  const clientIdConfig = schema.varKeys.find((k) => k.logicalName === 'client_id');
  const credIdConfig = schema.varKeys.find(
    (k) => k.logicalName === 'azure_credentials_cloud_connector_id'
  );

  const tenantIdVar = tenantIdConfig
    ? findVarByKeys(vars, tenantIdConfig.varKey, tenantIdConfig.alternativeKeys)
    : undefined;
  const clientIdVar = clientIdConfig
    ? findVarByKeys(vars, clientIdConfig.varKey, clientIdConfig.alternativeKeys)
    : undefined;
  const azureCredentials = credIdConfig
    ? findVarByKeys(vars, credIdConfig.varKey, credIdConfig.alternativeKeys)
    : undefined;

  if (tenantIdVar && clientIdVar && azureCredentials) {
    let tenantIdWithSecretRef = tenantIdVar;
    let clientIdWithSecretRef = clientIdVar;

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
          ...tenantIdVar,
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
          ...clientIdVar,
          value: {
            id: clientSecret.id,
            isSecretRef: true,
          },
        };
      }
    }

    const azureCloudConnectorVars = {
      tenant_id: tenantIdWithSecretRef as any,
      client_id: clientIdWithSecretRef as any,
      azure_credentials_cloud_connector_id: azureCredentials as any,
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
 * Extracts secret IDs from cloud connector variables for cleanup during deletion.
 * Uses the schema to determine which vars contain secrets.
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
  const secretVarKeys = getSecretVarKeys(cloudProvider);
  const schema = getCredentialSchema(cloudProvider);

  // Map logical names to actual vars
  const varsAsRecord = cloudConnectorVars as Record<string, any>;

  for (const varKeyConfig of schema.varKeys) {
    if (!secretVarKeys.includes(varKeyConfig.varKey)) {
      continue;
    }

    const varEntry = varsAsRecord[varKeyConfig.logicalName];
    if (
      varEntry?.value &&
      typeof varEntry.value === 'object' &&
      varEntry.value.isSecretRef &&
      varEntry.value.id
    ) {
      secretIds.push(varEntry.value.id);
    }
  }

  return secretIds;
}
