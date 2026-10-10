/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AzureDataSourceWithSecrets, GCSDataSourceWithSecrets, S3DataSourceWithSecrets } from "@kbn/data-federation-plugin/common/datasource_types";
import { AzureAuthenticationMode, GcsAuthenticationMode, S3AuthenticationMode } from "./create_data_source_flyout_authentication";

const s3AccessAndSecretKeysFormatSettings = (dataSourceWithSecrets: S3DataSourceWithSecrets) => {
  const { access_key, secret_key, region, endpoint } = dataSourceWithSecrets.settings || {};
  return {
    region,
    endpoint,
    access_key,
    secret_key,
    auth: 'static_credentials',
  };
};

const s3FederatedIdentityFormatSettings = (dataSourceWithSecrets: S3DataSourceWithSecrets) => {
  const { role_arn, jwt_audience, role_session_name, sts_endpoint, sts_region, region, endpoint } = dataSourceWithSecrets.settings || {};
  return {
    region,
    endpoint,
    role_arn,
    jwt_audience,
    role_session_name,
    sts_endpoint,
    sts_region,
    auth: 'federated_identity',
  };
};

const s3AnonymousFormatSettings = (dataSourceWithSecrets: S3DataSourceWithSecrets) => {
  const { region, endpoint } = dataSourceWithSecrets.settings || {};
  return {
    region,
    endpoint,
    auth: 'anonymous',
  };
};

const s3AuthFormatSettings: Record<S3AuthenticationMode, (dataSourceWithSecrets: S3DataSourceWithSecrets) => Record<string, unknown>> = {
  'access_and_secret_keys': s3AccessAndSecretKeysFormatSettings,
  'federated_identity': s3FederatedIdentityFormatSettings,
  'anonymous': s3AnonymousFormatSettings,
}

const gcsAccessAndSecretKeysFormatSettings = (dataSourceWithSecrets: GCSDataSourceWithSecrets) => {
  const { credentials, project_id, endpoint, token_uri } = dataSourceWithSecrets.settings || {};
  return {
    project_id,
    endpoint,
    token_uri,
    // An empty value must be omitted rather than sent, or it would clear the stored secret.
    credentials: credentials?.trim() || undefined,
    auth: 'static_credentials',
  };
};

const gcsFederatedIdentityFormatSettings = (dataSourceWithSecrets: GCSDataSourceWithSecrets) => {
  const { jwt_audience, sts_audience, service_account_impersonation_url, project_id, endpoint, token_uri } = dataSourceWithSecrets.settings || {};
  return {
    project_id,
    endpoint,
    token_uri,
    jwt_audience,
    sts_audience,
    service_account_impersonation_url,
    auth: 'federated_identity',
  };
};

const gcsAnonymousFormatSettings = (dataSourceWithSecrets: GCSDataSourceWithSecrets) => {
  const { project_id, endpoint, token_uri } = dataSourceWithSecrets.settings || {};
  return {
    project_id,
    endpoint,
    token_uri,
    auth: 'anonymous',
  };
};

const gcsAuthFormatSettings: Record<GcsAuthenticationMode, (dataSourceWithSecrets: GCSDataSourceWithSecrets) => Record<string, unknown>> = {
  'access_and_secret_keys': gcsAccessAndSecretKeysFormatSettings,
  'federated_identity': gcsFederatedIdentityFormatSettings,
  'anonymous': gcsAnonymousFormatSettings,
}

const azureCredentialsFormatSettings = (dataSourceWithSecrets: AzureDataSourceWithSecrets) => {
  const { account, key, endpoint } = dataSourceWithSecrets.settings || {};
  return {
    endpoint,
    account,
    key,
    auth: 'static_credentials',
  };
};

const azureFederatedIdentityFormatSettings = (dataSourceWithSecrets: AzureDataSourceWithSecrets) => {
  const { tenant_id, client_id, jwt_audience, endpoint } = dataSourceWithSecrets.settings || {};
  return {
    endpoint,
    tenant_id,
    client_id,
    jwt_audience,
    auth: 'federated_identity',
  };
};

const azureAnonymousFormatSettings = (dataSourceWithSecrets: AzureDataSourceWithSecrets) => {
  const { endpoint } = dataSourceWithSecrets.settings || {};
  return {
    endpoint,
    auth: 'anonymous',
  };
};

const azureAuthFormatSettings: Record<AzureAuthenticationMode, (dataSourceWithSecrets: AzureDataSourceWithSecrets) => Record<string, unknown>> = {
  'credentials': azureCredentialsFormatSettings,
  'federated_identity': azureFederatedIdentityFormatSettings,
  'anonymous': azureAnonymousFormatSettings,
}

export const authFormatSettingsByDataSourceType = {
  s3: s3AuthFormatSettings,
  gcs: gcsAuthFormatSettings,
  azure: azureAuthFormatSettings,
};

