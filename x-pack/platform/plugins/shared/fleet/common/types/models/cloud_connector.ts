/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export type CloudProvider = 'aws' | 'azure' | 'gcp';

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
}

export interface CloudConnectorListOptions {
  page?: number;
  perPage?: number;
  kuery?: string;
  fields?: string[];
}
