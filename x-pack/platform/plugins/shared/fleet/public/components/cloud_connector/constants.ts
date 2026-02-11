/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR = 'ACCOUNT_TYPE';
export const TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR = 'RESOURCE_ID';
export const CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS =
  'cloud_formation_cloud_connectors_template';
export const ARM_TEMPLATE_URL_CLOUD_CONNECTORS = 'arm_template_cloud_connectors_url';

export const AWS_PROVIDER = 'aws';
export const GCP_PROVIDER = 'gcp';
export const AZURE_PROVIDER = 'azure';

export {
  SINGLE_ACCOUNT,
  ORGANIZATION_ACCOUNT,
  AWS_ACCOUNT_TYPE_VAR_NAME as AWS_ACCOUNT_TYPE_INPUT_VAR_NAME,
  AZURE_ACCOUNT_TYPE_VAR_NAME as AZURE_ACCOUNT_TYPE_INPUT_VAR_NAME,
} from '../../../common';

export const TABS = {
  NEW_CONNECTION: 'new-connection',
  EXISTING_CONNECTION: 'existing-connection',
} as const;

export const CLOUD_FORMATION_EXTERNAL_DOC_URL =
  'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html';

export const AWS_CLOUD_CONNECTOR_FIELD_NAMES = {
  ROLE_ARN: 'role_arn',
  EXTERNAL_ID: 'external_id',
  AWS_ROLE_ARN: 'aws.role_arn',
  AWS_EXTERNAL_ID: 'aws.credentials.external_id',
} as const;

export const AZURE_CLOUD_CONNECTOR_FIELD_NAMES = {
  TENANT_ID: 'tenant_id',
  CLIENT_ID: 'client_id',
  AZURE_TENANT_ID: 'azure.credentials.tenant_id',
  AZURE_CLIENT_ID: 'azure.credentials.client_id',
  AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID: 'azure_credentials_cloud_connector_id',
} as const;

// Minimum version required for AWS cloud connector reusability feature
export const CLOUD_CONNECTOR_AWS_CSPM_REUSABLE_MIN_VERSION = '3.1.0-preview06';
export const CLOUD_CONNECTOR_AWS_ASSET_INVENTORY_REUSABLE_MIN_VERSION = '1.1.5';

// Minimum version required for Azure cloud connector reusability feature
export const CLOUD_CONNECTOR_AZURE_CSPM_REUSABLE_MIN_VERSION = '3.1.0';
export const CLOUD_CONNECTOR_AZURE_ASSET_INVENTORY_REUSABLE_MIN_VERSION = '1.2.2';
