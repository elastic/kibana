/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export type CloudProvider = 'aws' | 'azure' | 'gcp';

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

// Azure credentials can be either a secret reference (new connector) or a cloud connector ID (reuse)
export interface AzureCredentialsVar {
  type?: 'password';
  // TODO: refactor this to remove the string type when the connector name is implemented https://github.com/elastic/security-team/issues/14283
  // this interface may not be needed
  value: CloudConnectorSecretReference | string;
  frozen?: boolean;
}

export interface AwsCloudConnectorVars {
  role_arn: CloudConnectorVar;
  external_id: CloudConnectorSecretVar;
}

export interface AzureCloudConnectorVars {
  tenant_id: CloudConnectorSecretVar;
  client_id: CloudConnectorSecretVar;
  azure_credentials_cloud_connector_id: AzureCredentialsVar;
}

export type CloudConnectorVars = AwsCloudConnectorVars | AzureCloudConnectorVars;

export interface CloudConnector {
  id: string;
  name: string;
  cloudProvider: CloudProvider;
  vars: CloudConnectorVars;
  packagePolicyCount: number;
  created_at: string;
  updated_at: string;
  namespace?: string;
}

export interface CloudConnectorListOptions {
  page?: number;
  perPage?: number;
}
