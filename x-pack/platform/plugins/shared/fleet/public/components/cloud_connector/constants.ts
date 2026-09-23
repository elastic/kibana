/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR = 'ACCOUNT_TYPE';
export const TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR = 'RESOURCE_ID';
export const TEMPLATE_URL_ELASTIC_RESOURCE_TYPE_ENV_VAR = 'RESOURCE_TYPE';
export const TEMPLATE_URL_ELASTIC_ORGANIZATION_ID_ENV_VAR = 'ORGANIZATION_ID';
export const TEMPLATE_URL_CLOUD_PROVIDER_ENV_VAR = 'CLOUD_PROVIDER';
export const TEMPLATE_URL_CLOUD_REGION_ENV_VAR = 'CLOUD_REGION';
export const TEMPLATE_URL_CLOUD_ENVIRONMENT_ENV_VAR = 'CLOUD_ENVIRONMENT';

export const TEMPLATE_URL_TOKENS = [
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR,
  TEMPLATE_URL_ELASTIC_RESOURCE_TYPE_ENV_VAR,
  TEMPLATE_URL_ELASTIC_ORGANIZATION_ID_ENV_VAR,
  TEMPLATE_URL_CLOUD_PROVIDER_ENV_VAR,
  TEMPLATE_URL_CLOUD_REGION_ENV_VAR,
  TEMPLATE_URL_CLOUD_ENVIRONMENT_ENV_VAR,
] as const;
export type TemplateUrlToken = (typeof TEMPLATE_URL_TOKENS)[number];

export const ELASTIC_RESOURCE_TYPE_DEPLOYMENT = 'deployment';
export const ELASTIC_RESOURCE_TYPE_PROJECT = 'project';
export type ElasticResourceType =
  | typeof ELASTIC_RESOURCE_TYPE_DEPLOYMENT
  | typeof ELASTIC_RESOURCE_TYPE_PROJECT;

export const ELASTIC_CLOUD_ENVIRONMENT_PRODUCTION = 'production';
export const ELASTIC_CLOUD_ENVIRONMENT_STAGING = 'staging';
export const ELASTIC_CLOUD_ENVIRONMENT_QA = 'qa';
export type ElasticCloudEnvironment =
  | typeof ELASTIC_CLOUD_ENVIRONMENT_PRODUCTION
  | typeof ELASTIC_CLOUD_ENVIRONMENT_STAGING
  | typeof ELASTIC_CLOUD_ENVIRONMENT_QA;

/**
 * Quick-create URL of the Elastic Workload Identity (WII) CloudFormation template for the aws
 * packages' Identity Federation option (elastic/integrations#21331). Used in place of the
 * package's `iac_template_url` while `fleet.awsIdentityFederationEnabled` is on; the
 * tokens are filled by `getCloudConnectorRemoteRoleTemplate` like any package-provided URL.
 */
export const AWS_WORKLOAD_IDENTITY_CLOUD_FORMATION_TEMPLATE_URL =
  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-federated-identity-wii-aws-9.6.0.yml&param_ElasticOrganizationId=ORGANIZATION_ID&param_ElasticCloudProvider=CLOUD_PROVIDER&param_ElasticCloudRegion=CLOUD_REGION&param_ElasticCloudEnvironment=CLOUD_ENVIRONMENT&param_ElasticResourceType=RESOURCE_TYPE&param_ElasticResourceId=RESOURCE_ID';

/**
 * Packages whose Identity Federation option launches the WII template. Any installed version
 * qualifies: the template is a property of Kibana and the agentless runtime, not of the package.
 */
export const AWS_WORKLOAD_IDENTITY_TEMPLATE_PACKAGES: readonly string[] = [
  'aws',
  'aws_bedrock',
  'aws_logs',
  'aws_mq',
  'aws_securityhub',
  'aws_bedrock_agentcore',
];

export const CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS =
  'cloud_formation_cloud_connectors_template';
export const ARM_TEMPLATE_URL_CLOUD_CONNECTORS = 'arm_template_cloud_connectors_url';
export const CLOUD_SHELL_URL_CLOUD_CONNECTORS = 'cloud_shell_url_cloud_connectors';

export const AWS_PROVIDER = 'aws';
export const GCP_PROVIDER = 'gcp';
export const AZURE_PROVIDER = 'azure';

export {
  SINGLE_ACCOUNT,
  ORGANIZATION_ACCOUNT,
  AWS_ACCOUNT_TYPE_VAR_NAME as AWS_ACCOUNT_TYPE_INPUT_VAR_NAME,
  AZURE_ACCOUNT_TYPE_VAR_NAME as AZURE_ACCOUNT_TYPE_INPUT_VAR_NAME,
  GCP_ACCOUNT_TYPE_VAR_NAME as GCP_ACCOUNT_TYPE_INPUT_VAR_NAME,
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

export const SUPPORTS_CLOUD_CONNECTORS_VAR_NAME = 'supports_cloud_connectors';
// Renamed from supports_cloud_connectors in newer integrations (e.g. elastic/integrations#19828)
export const SUPPORTS_IDENTITY_FEDERATION_VAR_NAME = 'supports_identity_federation';

export const AZURE_CLOUD_CONNECTOR_FIELD_NAMES = {
  TENANT_ID: 'tenant_id',
  CLIENT_ID: 'client_id',
  AZURE_TENANT_ID: 'azure.credentials.tenant_id',
  AZURE_CLIENT_ID: 'azure.credentials.client_id',
  AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID: 'azure_credentials_cloud_connector_id',
} as const;

export const GCP_CLOUD_CONNECTOR_FIELD_NAMES = {
  SERVICE_ACCOUNT: 'service_account',
  AUDIENCE: 'audience',
  GCP_SERVICE_ACCOUNT: 'gcp.credentials.service_account_email',
  GCP_AUDIENCE: 'gcp.credentials.audience',
  GCP_CREDENTIALS_CLOUD_CONNECTOR_ID: 'gcp_credentials_cloud_connector_id',
} as const;

// Minimum version required for AWS cloud connector reusability feature
export const CLOUD_CONNECTOR_AWS_CSPM_REUSABLE_MIN_VERSION = '3.1.0-preview06';
export const CLOUD_CONNECTOR_AWS_ASSET_INVENTORY_REUSABLE_MIN_VERSION = '1.1.5';

// Minimum version required for Azure cloud connector reusability feature
export const CLOUD_CONNECTOR_AZURE_CSPM_REUSABLE_MIN_VERSION = '3.1.0';
export const CLOUD_CONNECTOR_AZURE_ASSET_INVENTORY_REUSABLE_MIN_VERSION = '1.2.2';
//
export const CLOUD_CONNECTOR_GCP_CSPM_REUSABLE_MIN_VERSION = '3.3.0-preview06';
export const CLOUD_CONNECTOR_GCP_ASSET_INVENTORY_REUSABLE_MIN_VERSION = '1.5.0-preview04';

/**
 * Warning toast for a failed template-details write after a successful policy save. The
 * pending payload lives in memory only, so the retry happens on a later save in this same tab.
 */
export const IAC_TEMPLATE_WRITE_FAILED_TOAST = {
  title: i18n.translate('xpack.fleet.cloudConnector.iacTemplateWriteFailed.title', {
    defaultMessage: 'Template details were not saved on the identity',
  }),
  text: i18n.translate('xpack.fleet.cloudConnector.iacTemplateWriteFailed.text', {
    defaultMessage:
      'The integration was saved, but Kibana could not record which CloudFormation template this identity uses, so it may be reported as needing an update. Kibana will retry if you edit and save this integration again.',
  }),
};
