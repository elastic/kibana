/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudProvider } from '../../types/models/cloud_connector';

import type { CloudConnectorCredentialSchema, CloudConnectorCredentialVarKey } from './types';
import { CloudConnectorVarAccessorError, CloudConnectorVarAccessorErrorCode } from './types';

/**
 * AWS Cloud Connector credential var keys.
 * Supports both package-level and stream-level var naming conventions.
 */
export const AWS_CREDENTIAL_VAR_KEYS: CloudConnectorCredentialVarKey[] = [
  {
    logicalName: 'role_arn',
    varKey: 'role_arn',
    alternativeKeys: ['aws.role_arn'],
    isSecret: false,
    varType: 'text',
  },
  {
    logicalName: 'external_id',
    varKey: 'external_id',
    alternativeKeys: ['aws.credentials.external_id'],
    isSecret: true,
    varType: 'password',
  },
];

/**
 * Azure Cloud Connector credential var keys.
 * Supports both package-level and stream-level var naming conventions.
 */
export const AZURE_CREDENTIAL_VAR_KEYS: CloudConnectorCredentialVarKey[] = [
  {
    logicalName: 'tenant_id',
    varKey: 'tenant_id',
    alternativeKeys: ['azure.credentials.tenant_id'],
    isSecret: true,
    varType: 'password',
  },
  {
    logicalName: 'client_id',
    varKey: 'client_id',
    alternativeKeys: ['azure.credentials.client_id'],
    isSecret: true,
    varType: 'password',
  },
  {
    logicalName: 'azure_credentials_cloud_connector_id',
    varKey: 'azure_credentials_cloud_connector_id',
    alternativeKeys: [
      'azure.credentials.cloud_connector_id',
      'azure.credentials.azure_credentials_cloud_connector_id',
    ],
    isSecret: false,
    varType: 'text',
  },
];

/**
 * GCP Cloud Connector credential var keys.
 * Placeholder for future GCP support.
 *
 * Expected credential fields for GCP:
 * - project_id: The GCP project ID (text)
 * - credentials_json: Service account credentials JSON (secret)
 * - service_account_email: Service account email address (text or secret)
 *
 * The exact var key names will be determined when GCP support is implemented.
 * This may include alternative keys for backward compatibility, similar to AWS/Azure.
 */
export const GCP_CREDENTIAL_VAR_KEYS: CloudConnectorCredentialVarKey[] = [
  // Uncomment and populate when GCP Cloud Connector support is added:
  // {
  //   logicalName: 'project_id',
  //   varKey: 'project_id',
  //   alternativeKeys: ['gcp.project_id', 'gcp.credentials.project_id'],
  //   isSecret: false,
  //   varType: 'text',
  // },
  // {
  //   logicalName: 'credentials_json',
  //   varKey: 'credentials_json',
  //   alternativeKeys: ['gcp.credentials.json', 'gcp.credentials.credentials_json'],
  //   isSecret: true,
  //   varType: 'password',
  // },
  // {
  //   logicalName: 'service_account_email',
  //   varKey: 'service_account_email',
  //   alternativeKeys: ['gcp.service_account_email'],
  //   isSecret: false,
  //   varType: 'text',
  // },
];

/**
 * Get the credential schema for a specific cloud provider.
 *
 * @param provider - The cloud provider (aws, azure, gcp)
 * @returns The credential schema for the provider
 * @throws CloudConnectorVarAccessorError if provider is not supported
 */
export function getCredentialSchema(provider: CloudProvider): CloudConnectorCredentialSchema {
  switch (provider) {
    case 'aws':
      return {
        provider: 'aws',
        varKeys: AWS_CREDENTIAL_VAR_KEYS,
      };
    case 'azure':
      return {
        provider: 'azure',
        varKeys: AZURE_CREDENTIAL_VAR_KEYS,
      };
    case 'gcp':
      // GCP is a known provider but not yet fully supported
      return {
        provider: 'gcp',
        varKeys: GCP_CREDENTIAL_VAR_KEYS,
      };
    default:
      throw new CloudConnectorVarAccessorError(
        `Unsupported cloud provider: ${provider}`,
        CloudConnectorVarAccessorErrorCode.UNSUPPORTED_PROVIDER
      );
  }
}

/**
 * Get the secret-bearing var keys for a specific cloud provider.
 * These are the vars that contain sensitive data and need secret storage.
 *
 * @param provider - The cloud provider (aws, azure, gcp)
 * @returns Array of var keys that contain secrets
 */
export function getSecretVarKeys(provider: CloudProvider): string[] {
  const schema = getCredentialSchema(provider);
  return schema.varKeys.filter((key) => key.isSecret).map((key) => key.varKey);
}

/**
 * Check if a var key is a secret-bearing key for a specific provider.
 *
 * @param provider - The cloud provider
 * @param varKey - The var key to check
 * @returns True if the var key contains a secret
 */
export function isSecretVarKey(provider: CloudProvider, varKey: string): boolean {
  const schema = getCredentialSchema(provider);
  return schema.varKeys.some(
    (key) =>
      key.isSecret &&
      (key.varKey === varKey || (key.alternativeKeys && key.alternativeKeys.includes(varKey)))
  );
}
