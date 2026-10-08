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
export type GcsAuthenticationMode = 'anonymous' | 'access_and_secret_keys';

/** Azure authentication modes (UI-only). */
export type AzureAuthenticationMode = 'anonymous' | 'credentials';

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
  const authSettings = mode === 'anonymous' ? { auth: 'anonymous' } : {};

  switch (data.type) {
    case 's3': {
      // Unregistering the last settings field (anonymous S3 has none left) can remove the
      // settings object from the submitted form values.
      const settings = authFormatSettingsByDataSourceType['s3'][mode as S3AuthenticationMode](data);

      return { ...data, settings};
    }
    case 'gcs': {
      const settings = data.settings ?? {};
      const {
        credentials: _credentials,
        jwt_audience: _jwtAudience,
        sts_audience: _stsAudience,
        service_account_impersonation_url: _serviceAccountImpersonationUrl,
        auth: _auth,
        ...rest
      } = settings;
      const credentialsText = settings.credentials?.trim();

      let applied: Record<string, unknown> = {};
      if (mode === 'access_and_secret_keys' && credentialsText) {
        applied = { credentials: credentialsText, auth: 'static_credentials' };
      } else if (mode === 'federated_identity') {
        applied = {
          jwt_audience: settings.jwt_audience,
          sts_audience: settings.sts_audience,
          service_account_impersonation_url: settings.service_account_impersonation_url,
          auth: 'federated_identity',
        };
      }
      return {
        ...data,
        settings: {
          ...rest,
          ...authSettings,
          ...applied,
        },
      };
    }
    case 'azure': {
      const settings = data.settings ?? {};
      const {
        account: _account,
        key: _key,
        tenant_id: _tenantId,
        client_id: _clientId,
        jwt_audience: _jwtAudience,
        auth: _auth,
        ...rest
      } = settings;

      const base = { ...rest };

      if (mode === 'credentials') {
        return {
          ...data,
          settings: {
            ...base,
            account: settings.account,
            key: settings.key,
            auth: 'static_credentials',
          },
        };
      }
      if (mode === 'federated_identity') {
        return {
          ...data,
          settings: {
            ...base,
            tenant_id: settings.tenant_id,
            client_id: settings.client_id,
            jwt_audience: settings.jwt_audience,
            auth: 'federated_identity',
          },
        };
      }
      return {
        ...data,
        settings: {
          ...base,
          ...authSettings,
        },
      };
    }
    default:
      return data;
  }
};
