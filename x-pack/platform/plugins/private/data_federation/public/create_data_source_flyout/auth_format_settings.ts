/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { S3DataSourceWithSecrets } from "@kbn/data-federation-plugin/common/datasource_types";
import { S3AuthenticationMode } from "./create_data_source_flyout_authentication";

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

export const authFormatSettingsByDataSourceType = {
  s3: s3AuthFormatSettings,
  /*
  gcs: {
    'static_credentials': gcsAccessAndSecretKeysFormatSettings,
    'federated_identity': gcsFederatedIdentityFormatSettings,
    'anonymous': gcsAnonymousFormatSettings,
  },
  azure: {
    'static_credentials': azureAccessAndSecretKeysFormatSettings,
    'federated_identity': azureFederatedIdentityFormatSettings,
    'anonymous': azureAnonymousFormatSettings,
  },
  */
};

