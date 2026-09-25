/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksStart } from '@kbn/core-doc-links-browser';

import type { DataSourceType, DataSourceWithSecrets } from '../../common/datasource_types';
import { authenticationStrings } from './create_data_source_flyout_authentication_i18n';

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

interface AuthOption {
  value: CreateDataSourceAuthenticationMode;
  text: string;
  description: string;
  recommended?: boolean;
}

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

export const getCreateDataSourceAuthenticationOptions = (
  dataSourceType: DataSourceType,
  { enableFederatedIdentity }: { enableFederatedIdentity?: boolean } = {}
): AuthOption[] => {
  const federatedIdentity: AuthOption = {
    value: 'federated_identity',
    text: authenticationStrings.federatedIdentityLabel,
    description: authenticationStrings.federatedIdentityDescription[dataSourceType],
    recommended: true,
  };

  // Azure names its stored-credentials method differently, but it plays the same role.
  const storedCredentials: AuthOption =
    dataSourceType === 'azure'
      ? {
          value: 'credentials',
          text: authenticationStrings.azureCredentialsLabel,
          description: authenticationStrings.storedCredentialsDescription.azure,
        }
      : {
          value: 'access_and_secret_keys',
          text: authenticationStrings.accessAndSecretKeysLabel,
          description: authenticationStrings.storedCredentialsDescription[dataSourceType],
        };

  const anonymous: AuthOption = {
    value: 'anonymous',
    text: authenticationStrings.anonymousLabel,
    description: authenticationStrings.anonymousDescription[dataSourceType],
  };

  return enableFederatedIdentity
    ? [federatedIdentity, storedCredentials, anonymous]
    : [storedCredentials, anonymous];
};

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
      const settings = data.settings ?? {};
      const {
        access_key: _accessKey,
        secret_key: _secretKey,
        role_arn: _roleArn,
        jwt_audience: _jwtAudience,
        role_session_name: _roleSessionName,
        sts_endpoint: _stsEndpoint,
        sts_region: _stsRegion,
        auth: _auth,
        ...rest
      } = settings;

      let applied: Record<string, unknown> = {};
      if (mode === 'access_and_secret_keys') {
        applied = {
          access_key: settings.access_key,
          secret_key: settings.secret_key,
          auth: 'static_credentials',
        };
      } else if (mode === 'federated_identity') {
        applied = {
          role_arn: settings.role_arn,
          jwt_audience: settings.jwt_audience,
          role_session_name: settings.role_session_name,
          sts_endpoint: settings.sts_endpoint,
          sts_region: settings.sts_region,
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
