/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Backward compatibility for CSPM and Asset Discovery
export const AWS_ROLE_ARN_VAR_NAME = 'aws.role_arn';
export const AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME = 'aws.credentials.external_id';

export const ROLE_ARN_VAR_NAME = 'role_arn';
export const EXTERNAL_ID_VAR_NAME = 'external_id';

// Azure Cloud Connector constants
export const AZURE_TENANT_ID_VAR_NAME = 'azure.credentials.tenant_id';
export const AZURE_CLIENT_ID_VAR_NAME = 'azure.credentials.client_id';
export const AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME =
  'azure.credentials.azure_credentials_cloud_connector_id';

export const TENANT_ID_VAR_NAME = 'tenant_id';
export const CLIENT_ID_VAR_NAME = 'client_id';
export const AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID = 'azure_credentials_cloud_connector_id';

// Account type variable names for different cloud providers
export const AWS_ACCOUNT_TYPE_VAR_NAME = 'aws.account_type';
export const AZURE_ACCOUNT_TYPE_VAR_NAME = 'azure.account_type';
export const GCP_ACCOUNT_TYPE_VAR_NAME = 'gcp.account_type';

// Account type values used across all cloud providers
// These values are used both in package policy vars and in the Cloud Connector API
export const SINGLE_ACCOUNT = 'single-account';
export const ORGANIZATION_ACCOUNT = 'organization-account';

export const SUPPORTED_CLOUD_CONNECTOR_VARS = [
  AWS_ROLE_ARN_VAR_NAME,
  AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME,
  ROLE_ARN_VAR_NAME,
  EXTERNAL_ID_VAR_NAME,
  AZURE_TENANT_ID_VAR_NAME,
  AZURE_CLIENT_ID_VAR_NAME,
  AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME,
  TENANT_ID_VAR_NAME,
  CLIENT_ID_VAR_NAME,
  AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID,
];
