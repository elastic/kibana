/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { CloudProvider, CloudConnectorVars, NewPackagePolicy } from '../../types';
import { CloudConnectorInvalidVarsError } from '../../errors';

import { createSecrets } from './common';

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

  if (packagePolicy.supports_cloud_connector && cloudProvider === 'aws') {
    return await extractAwsCloudConnectorSecrets(packagePolicy, esClient, logger);
  }

  if (packagePolicy.supports_cloud_connector && cloudProvider === 'azure') {
    return await extractAzureCloudConnectorSecrets(packagePolicy, esClient, logger);
  }
}

/**
 * Extracts AWS cloud connector variables and creates secrets
 */
async function extractAwsCloudConnectorSecrets(
  packagePolicy: NewPackagePolicy,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudConnectorVars | undefined> {
  const vars = packagePolicy.inputs.find((input) => input.enabled)?.streams[0]?.vars;

  if (!vars) {
    logger.error('Package policy must contain vars for AWS cloud connector');
    throw new CloudConnectorInvalidVarsError('Package policy must contain vars');
  }

  // Look for role_arn and external_id in the vars
  const roleArn: string = vars.role_arn?.value || vars['aws.role_arn']?.value;
  const externalIdVar = vars.external_id || vars['aws.credentials.external_id'];

  if (roleArn && externalIdVar) {
    let externalIdWithSecretRef = externalIdVar;

    // If external_id is not already a secret reference, create a secret for it
    if (externalIdVar.value && !externalIdVar.value.isSecretRef) {
      logger.debug('Creating secret for AWS external_id');
      const secrets = await createSecrets({
        esClient,
        values: [externalIdVar.value],
      });

      externalIdWithSecretRef = {
        ...externalIdVar,
        value: {
          id: secrets[0].id,
          isSecretRef: true,
        },
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

  logger.debug('AWS cloud connector vars not found or incomplete');
  return undefined;
}

/**
 * Extracts Azure cloud connector variables and creates secrets
 */
async function extractAzureCloudConnectorSecrets(
  packagePolicy: NewPackagePolicy,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudConnectorVars | undefined> {
  const vars = packagePolicy.inputs.find((input) => input.enabled)?.streams[0]?.vars;

  if (!vars) {
    logger.error('Package policy must contain vars for Azure cloud connector');
    throw new CloudConnectorInvalidVarsError('Package policy must contain vars');
  }

  const tenantIdVar = vars.tenant_id || vars['azure.tenant_id'];
  const clientIdVar = vars.client_id || vars['azure.client_id'];
  const azureCredentials =
    vars.azure_credentials_cloud_connector_id || vars['azure.credentials.cloud_connector_id'];

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
        tenantIdWithSecretRef = {
          ...tenantIdVar,
          value: {
            id: secrets[secretIndex].id,
            isSecretRef: true,
          },
        };
        secretIndex++;
      }
      if (clientIdVar.value && !clientIdVar.value.isSecretRef) {
        clientIdWithSecretRef = {
          ...clientIdVar,
          value: {
            id: secrets[secretIndex].id,
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
      `Extracted Azure cloud connector vars: tenant_id=${!!tenantIdWithSecretRef}, client_id=${!!clientIdWithSecretRef}, azure_credentials=${!!azureCredentials}`
    );

    return azureCloudConnectorVars;
  }

  logger.error(
    `Missing required Azure vars: tenant_id=${!!tenantIdVar}, client_id=${!!clientIdVar}, azure_credentials=${!!azureCredentials}`
  );
  return undefined;
}
