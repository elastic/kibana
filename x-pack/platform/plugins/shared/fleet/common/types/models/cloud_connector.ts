/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export type CloudProvider = 'aws' | 'azure' | 'gcp';

const CLOUD_PROVIDERS: readonly CloudProvider[] = ['aws', 'azure', 'gcp'];

/**
 * Type guard to check if a value is a valid CloudProvider.
 */
export const isCloudProvider = (value: unknown): value is CloudProvider =>
  typeof value === 'string' && CLOUD_PROVIDERS.includes(value as CloudProvider);

export type AccountType = 'single-account' | 'organization-account';

export interface CloudConnectorSecretReference {
  isSecretRef: boolean;
  id: string;
}

export interface CloudConnectorVar {
  type?: 'text';
  value: string;
}

export interface CloudConnectorSecretVar {
  // Password is a special type that indicates showing a secret reference on Fleet UI.
  // Secret references are stored in the .fleet-secrets index but Cloud Connector stores the secret reference instead of the secret data.
  type?: 'password';
  value: CloudConnectorSecretReference;
  frozen?: boolean;
}

export interface AwsCloudConnectorVars {
  role_arn: CloudConnectorVar;
  external_id: CloudConnectorSecretVar;
}

export interface AzureCloudConnectorVars {
  tenant_id: CloudConnectorSecretVar;
  client_id: CloudConnectorSecretVar;
  azure_credentials_cloud_connector_id: CloudConnectorVar;
}

export type CloudConnectorVars = AwsCloudConnectorVars | AzureCloudConnectorVars;

export type VerificationStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'timeout';

export type PermissionStatus = 'granted' | 'denied' | 'error';

export interface VerificationPermissionResult {
  action: string;
  category: string;
  status: PermissionStatus;
  required: boolean;
  error_code?: string;
  error_message?: string;
}

export interface VerificationResultDocument {
  '@timestamp': string;
  cloud_connector_id: string;
  policy: {
    id: string;
    name: string;
  };
  policy_template: string;
  package: {
    name: string;
    title: string;
    version: string;
  };
  package_policy: {
    id: string;
  };
  namespace: string;
  provider: {
    type: string;
    account: string;
    region: string;
  };
  account_type: string;
  permission: VerificationPermissionResult;
  verification: {
    method: string;
    endpoint: string;
    duration_ms: number;
    verified_at: string;
  };
}

export interface CloudConnector {
  id: string;
  name: string;
  cloudProvider: CloudProvider;
  accountType?: AccountType;
  vars: CloudConnectorVars;
  packagePolicyCount?: number;
  created_at: string;
  updated_at: string;
  namespace?: string;
  verification_id?: string;
  verification_status?: VerificationStatus;
  verification_timestamp?: string;
  verification_started_at?: string;
  verification_failed_at?: string;
  verification_permissions?: VerificationPermissionResult[];
}

export interface CloudConnectorListOptions {
  page?: number;
  perPage?: number;
  kuery?: string;
  fields?: string[];
}
