/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ROLE_ARN_VAR_NAME,
  EXTERNAL_ID_VAR_NAME,
  AWS_ROLE_ARN_VAR_NAME,
  AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME,
  TENANT_ID_VAR_NAME,
  CLIENT_ID_VAR_NAME,
  AZURE_TENANT_ID_VAR_NAME,
  AZURE_CLIENT_ID_VAR_NAME,
  AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID,
  AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME,
} from '../../constants/cloud_connector';

import type { CloudProvider } from '../../types/models/cloud_connector';

import type { CloudConnectorCredentialSchema, CloudConnectorVarKeyMapping } from './types';

/**
 * AWS cloud connector credential schema
 * Maps logical field names to their actual var key names used in package policies
 */
export const AWS_CREDENTIAL_SCHEMA: CloudConnectorCredentialSchema = {
  provider: 'aws',
  fields: {
    roleArn: {
      primary: ROLE_ARN_VAR_NAME, // 'role_arn'
      aliases: [AWS_ROLE_ARN_VAR_NAME], // 'aws.role_arn'
      isSecret: false,
    },
    externalId: {
      primary: EXTERNAL_ID_VAR_NAME, // 'external_id'
      aliases: [AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME], // 'aws.credentials.external_id'
      isSecret: true,
    },
  },
};

/**
 * Azure cloud connector credential schema
 * Maps logical field names to their actual var key names used in package policies
 */
export const AZURE_CREDENTIAL_SCHEMA: CloudConnectorCredentialSchema = {
  provider: 'azure',
  fields: {
    tenantId: {
      primary: TENANT_ID_VAR_NAME, // 'tenant_id'
      aliases: [AZURE_TENANT_ID_VAR_NAME], // 'azure.credentials.tenant_id'
      isSecret: true,
    },
    clientId: {
      primary: CLIENT_ID_VAR_NAME, // 'client_id'
      aliases: [AZURE_CLIENT_ID_VAR_NAME], // 'azure.credentials.client_id'
      isSecret: true,
    },
    azureCredentialsCloudConnectorId: {
      primary: AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID, // 'azure_credentials_cloud_connector_id'
      aliases: [AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME], // 'azure.credentials.azure_credentials_cloud_connector_id'
      isSecret: false,
    },
  },
};

/**
 * GCP cloud connector credential schema (stub for future implementation)
 */
export const GCP_CREDENTIAL_SCHEMA: CloudConnectorCredentialSchema = {
  provider: 'gcp',
  fields: {
    projectId: {
      primary: 'project_id',
      aliases: ['gcp.project_id'],
      isSecret: false,
    },
    serviceAccountKey: {
      primary: 'service_account_key',
      aliases: ['gcp.credentials.service_account_key'],
      isSecret: true,
    },
  },
};

/**
 * Map of provider to credential schema
 */
export const CREDENTIAL_SCHEMAS: Record<CloudProvider, CloudConnectorCredentialSchema> = {
  aws: AWS_CREDENTIAL_SCHEMA,
  azure: AZURE_CREDENTIAL_SCHEMA,
  gcp: GCP_CREDENTIAL_SCHEMA,
};

/**
 * Get the credential schema for a given cloud provider
 * @param provider - The cloud provider
 * @returns The credential schema for the provider
 */
export function getCredentialSchema(provider: CloudProvider): CloudConnectorCredentialSchema {
  const schema = CREDENTIAL_SCHEMAS[provider];
  if (!schema) {
    throw new Error(`Unknown cloud provider: ${provider}`);
  }
  return schema;
}

/**
 * Get all var keys (primary + aliases) for a given field mapping
 * @param mapping - The var key mapping
 * @returns Array of all possible var key names
 */
export function getAllVarKeys(mapping: CloudConnectorVarKeyMapping): string[] {
  return [mapping.primary, ...mapping.aliases];
}

/**
 * Get all supported cloud connector var names across all providers
 * Used for detecting storage mode based on package info vars
 */
export function getAllSupportedVarNames(): string[] {
  const allVarNames: string[] = [];

  for (const schema of Object.values(CREDENTIAL_SCHEMAS)) {
    for (const fieldMapping of Object.values(schema.fields)) {
      allVarNames.push(fieldMapping.primary, ...fieldMapping.aliases);
    }
  }

  return allVarNames;
}
