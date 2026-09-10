/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { DataSourceType, DataSourceWithSecrets } from '../../common/datasource_types';

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
  dataSourceType: DataSourceType
): CreateDataSourceAuthenticationMode => {
  const [firstOption] = getCreateDataSourceAuthenticationOptions(dataSourceType);
  return firstOption?.value ?? 'access_and_secret_keys';
};

const getFederatedIdentityAuthenticationDescription = (dataSourceType: DataSourceType): string => {
  switch (dataSourceType) {
    case 'gcs':
      return i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.federatedIdentityDescription.gcs',
        {
          defaultMessage:
            'Elastic impersonates a service account you grant read access. No keys are stored.',
        }
      );
    case 'azure':
      return i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.federatedIdentityDescription.azure',
        {
          defaultMessage:
            'Elastic signs in through an app registration you grant read access. No keys are stored.',
        }
      );
    default:
      return i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.federatedIdentityDescription.s3',
        {
          defaultMessage:
            'No credentials are stored. AWS trusts the identity Elastic issues for your project or deployment.',
        }
      );
  }
};

const S3_AUTHENTICATION_METHOD_DOCS_URLS: Partial<
  Record<CreateDataSourceAuthenticationMode, string>
> = {
  federated_identity:
    'https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation-federated-identity',
  access_and_secret_keys:
    'https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation-static-credentials',
  anonymous:
    'https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation-quickstart#quickstart',
};

/** Documentation URL for the selected authentication method (S3 only for now). */
export const getAuthenticationMethodDocumentationUrl = (
  dataSourceType: DataSourceType,
  mode: CreateDataSourceAuthenticationMode
): string | undefined => {
  if (dataSourceType !== 's3') {
    return undefined;
  }
  return S3_AUTHENTICATION_METHOD_DOCS_URLS[mode];
};

export const getAuthenticationMethodDescription = (
  dataSourceType: DataSourceType,
  mode: CreateDataSourceAuthenticationMode
): string => {
  const option = getCreateDataSourceAuthenticationOptions(dataSourceType).find(
    (entry) => entry.value === mode
  );
  return option?.description ?? '';
};

const getStoredCredentialsAuthenticationDescription = (dataSourceType: DataSourceType): string => {
  switch (dataSourceType) {
    case 'gcs':
      return i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.storedCredentialsDescription.gcs',
        {
          defaultMessage: 'Elastic stores a service account key that can read your bucket.',
        }
      );
    case 'azure':
      return i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.storedCredentialsDescription.azure',
        {
          defaultMessage:
            'Elastic stores your storage account name and access key. Rotating the key breaks the connection until you update it.',
        }
      );
    default:
      return i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.storedCredentialsDescription.s3',
        {
          defaultMessage:
            'Elastic stores an access key and secret key. Rotating them breaks the connection until you update it.',
        }
      );
  }
};

export const getCreateDataSourceAuthenticationOptions = (
  dataSourceType: DataSourceType
): Array<{
  value: CreateDataSourceAuthenticationMode;
  text: string;
  description: string;
  isRecommended?: boolean;
}> => {
  const federatedIdentityOption = {
    value: 'federated_identity' as const,
    text: i18n.translate('xpack.dataFederation.createFlyout.authentication.federatedIdentity', {
      defaultMessage: 'Federated Identity',
    }),
    description: getFederatedIdentityAuthenticationDescription(dataSourceType),
    isRecommended: true,
  };

  const storedCredentialsOption =
    dataSourceType === 'azure'
      ? {
          value: 'credentials' as const,
          text: i18n.translate(
            'xpack.dataFederation.createFlyout.authentication.azure.credentials',
            {
              defaultMessage: 'Credentials',
            }
          ),
          description: getStoredCredentialsAuthenticationDescription(dataSourceType),
        }
      : {
          value: 'access_and_secret_keys' as const,
          text: i18n.translate(
            'xpack.dataFederation.createFlyout.authentication.accessAndSecretKeys',
            {
              defaultMessage: 'Access and Secret Keys',
            }
          ),
          description: getStoredCredentialsAuthenticationDescription(dataSourceType),
        };

  const anonymousOption = {
    value: 'anonymous' as const,
    text: i18n.translate('xpack.dataFederation.createFlyout.authentication.anonymous', {
      defaultMessage: 'Anonymous',
    }),
    description: getAnonymousAuthenticationDescription(dataSourceType),
  };

  if (!DATA_SOURCE_TYPES_WITH_AUTHENTICATION.has(dataSourceType)) {
    return [storedCredentialsOption, anonymousOption];
  }

  return [federatedIdentityOption, storedCredentialsOption, anonymousOption];
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

export const createDataSourceFlyoutAuthenticationLabel = (): string =>
  i18n.translate('xpack.dataFederation.createFlyout.authentication.label', {
    defaultMessage: 'Preferred method',
  });

export const createDataSourceFlyoutAuthenticationRecommendedBadge = (): string =>
  i18n.translate('xpack.dataFederation.createFlyout.authentication.recommendedBadge', {
    defaultMessage: 'Recommended',
  });

export const createDataSourceFlyoutAuthenticationTitle = (): string =>
  i18n.translate('xpack.dataFederation.createFlyout.authentication.title', {
    defaultMessage: 'Authentication',
  });

export const getAnonymousAuthenticationDescription = (dataSourceType: DataSourceType): string => {
  switch (dataSourceType) {
    case 's3':
      return i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.anonymousDescription.s3',
        {
          defaultMessage:
            'No credentials are stored. Your S3 bucket must allow anonymous public read access.',
        }
      );
    case 'gcs':
      return i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.anonymousDescription.gcs',
        {
          defaultMessage:
            'No credentials are stored. Your GCS bucket must allow anonymous public read access.',
        }
      );
    case 'azure':
      return i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.anonymousDescription.azure',
        {
          defaultMessage:
            'No credentials are stored. Your storage account must allow anonymous public blob read access.',
        }
      );
    default:
      return i18n.translate(
        'xpack.dataFederation.createFlyout.authentication.anonymousDescription.default',
        {
          defaultMessage:
            'No credentials are stored. The storage location must allow anonymous public read access.',
        }
      );
  }
};

const optionalNonEmptyStringFields = (
  fields: Record<string, string | undefined>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(fields).flatMap(([key, value]) => {
      const trimmed = value?.trim();
      return trimmed ? [[key, trimmed]] : [];
    })
  );

/** React Hook Form may omit `settings` when no nested fields are registered (e.g. S3 anonymous). */
const normalizeDataSourceSettings = (data: DataSourceWithSecrets): DataSourceWithSecrets => ({
  ...data,
  settings: (data.settings ?? {}) as DataSourceWithSecrets['settings'],
});

/** Applies UI authentication mode to the payload submitted to the API. */
export const applyAuthenticationModeToDataSource = (
  data: DataSourceWithSecrets,
  mode: CreateDataSourceAuthenticationMode
): DataSourceWithSecrets => {
  const source = normalizeDataSourceSettings(data);
  const authSettings = mode === 'anonymous' ? { auth: 'anonymous' } : {};

  switch (source.type) {
    case 's3': {
      const {
        access_key: _accessKey,
        secret_key: _secretKey,
        role_arn: _roleArn,
        jwt_audience: _jwtAudience,
        role_session_name: _roleSessionName,
        sts_endpoint: _stsEndpoint,
        sts_region: _stsRegion,
        region: _region,
        auth: _auth,
        ...rest
      } = source.settings;

      let applied: Record<string, unknown> = {};
      if (mode === 'access_and_secret_keys') {
        applied = {
          access_key: source.settings.access_key,
          secret_key: source.settings.secret_key,
          auth: 'static_credentials',
        };
      } else if (mode === 'federated_identity') {
        applied = {
          role_arn: source.settings.role_arn,
          auth: 'federated_identity',
          ...optionalNonEmptyStringFields({
            jwt_audience: source.settings.jwt_audience,
            role_session_name: source.settings.role_session_name,
            sts_endpoint: source.settings.sts_endpoint,
            sts_region: source.settings.sts_region,
          }),
        };
      }

      return {
        ...source,
        settings: {
          ...rest,
          ...authSettings,
          ...applied,
        },
      };
    }
    case 'gcs': {
      const {
        credentials: _credentials,
        jwt_audience: _jwtAudience,
        sts_audience: _stsAudience,
        service_account_impersonation_url: _serviceAccountImpersonationUrl,
        auth: _auth,
        ...rest
      } = source.settings;
      const credentialsText = source.settings.credentials?.trim();

      let applied: Record<string, unknown> = {};
      if (mode === 'access_and_secret_keys' && credentialsText) {
        applied = { credentials: credentialsText, auth: 'static_credentials' };
      } else if (mode === 'federated_identity') {
        applied = {
          sts_audience: source.settings.sts_audience,
          auth: 'federated_identity',
          ...optionalNonEmptyStringFields({
            jwt_audience: source.settings.jwt_audience,
            service_account_impersonation_url: source.settings.service_account_impersonation_url,
          }),
        };
      }
      return {
        ...source,
        settings: {
          ...rest,
          ...authSettings,
          ...applied,
        },
      };
    }
    case 'azure': {
      const {
        account: _account,
        key: _key,
        tenant_id: _tenantId,
        client_id: _clientId,
        jwt_audience: _jwtAudience,
        auth: _auth,
        ...rest
      } = source.settings;

      const base = { ...rest };

      if (mode === 'credentials') {
        return {
          ...source,
          settings: {
            ...base,
            account: source.settings.account,
            key: source.settings.key,
            auth: 'static_credentials',
          },
        };
      }
      if (mode === 'federated_identity') {
        return {
          ...source,
          settings: {
            ...base,
            tenant_id: source.settings.tenant_id,
            client_id: source.settings.client_id,
            auth: 'federated_identity',
            ...optionalNonEmptyStringFields({
              jwt_audience: source.settings.jwt_audience,
            }),
          },
        };
      }
      return {
        ...source,
        settings: {
          ...base,
          ...authSettings,
        },
      };
    }
    default:
      return source;
  }
};
