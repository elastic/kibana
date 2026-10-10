/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksStart } from '@kbn/core-doc-links-browser';

import type { DataSourceType, DataSourceWithSecrets } from '../../common/datasource_types';
import { authFormatSettingsByDataSourceType } from './auth_format_settings';

/** S3 authentication modes (UI-only). */
export type S3AuthenticationMode = 'anonymous' | 'access_and_secret_keys' | 'federated_identity';

/** GCS authentication modes (UI-only). */
export type GcsAuthenticationMode = 'anonymous' | 'access_and_secret_keys' | 'federated_identity';

/** Azure authentication modes (UI-only). */
export type AzureAuthenticationMode = 'anonymous' | 'credentials' | 'federated_identity';

export type CreateDataSourceAuthenticationMode =
  | S3AuthenticationMode
  | GcsAuthenticationMode
  | AzureAuthenticationMode;

export const DATA_SOURCE_TYPES_WITH_AUTHENTICATION: ReadonlySet<DataSourceType> = new Set([
  's3',
  'gcs',
  'azure',
]);

export const getDefaultAuthenticationMode = (
  dataSourceType: DataSourceType,
  { enableFederatedIdentity }: { enableFederatedIdentity?: boolean } = {}
): CreateDataSourceAuthenticationMode => {
  if (enableFederatedIdentity) return 'federated_identity';
  if (dataSourceType === 'azure') return 'credentials';
  return 'access_and_secret_keys';
};

/**
 * Documentation page for each authentication method, as a key into
 * `docLinks.links.dataFederation`. The pages describe the method itself, so they are the
 * same regardless of data source type.
 */
export const AUTHENTICATION_DOC_LINK_KEYS = {
  federated_identity: 'federatedIdentity',
  access_and_secret_keys: 'staticCredentials',
  credentials: 'staticCredentials',
  anonymous: 'quickstart',
} as const satisfies Record<
  CreateDataSourceAuthenticationMode,
  keyof DocLinksStart['links']['dataFederation']
>;

export const showsAuthenticationCredentialFields = (
  mode: CreateDataSourceAuthenticationMode,
  dataSourceType: DataSourceType
): boolean => {
  if (dataSourceType === 'azure') {
    return mode === 'credentials' || mode === 'federated_identity';
  }
  if (dataSourceType === 's3') {
    return mode === 'access_and_secret_keys' || mode === 'federated_identity';
  }
  if (dataSourceType === 'gcs') {
    return mode === 'access_and_secret_keys' || mode === 'federated_identity';
  }
  return mode === 'access_and_secret_keys';
};

/** Applies UI authentication mode to the payload submitted to the API. */
export const applyAuthenticationModeToDataSource = (
  data: DataSourceWithSecrets,
  mode: CreateDataSourceAuthenticationMode
): DataSourceWithSecrets => {
  switch (data.type) {
    case 's3': {
      const settings = authFormatSettingsByDataSourceType['s3'][mode as S3AuthenticationMode](data);

      return { ...data, settings };
    }
    case 'gcs': {
      const settings =
        authFormatSettingsByDataSourceType['gcs'][mode as GcsAuthenticationMode](data);

      return { ...data, settings };
    }
    case 'azure': {
      const settings =
        authFormatSettingsByDataSourceType['azure'][mode as AzureAuthenticationMode](data);

      return { ...data, settings };
    }
    default:
      return data;
  }
};
