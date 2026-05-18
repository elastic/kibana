/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { DataSourceType, DataSourceWithSecrets } from '../../common/datasource_types';

/** S3 / GCS authentication modes (UI-only; maps to `settings.auth` on save). */
export type S3GcsAuthenticationMode =
  | 'access_and_secret_keys'
  | 'default_credential_chain'
  | 'anonymous';

/** Azure Blob authentication modes (UI-only; maps to `settings.auth` on save). */
export type AzureBlobAuthenticationMode =
  | 'credentials'
  | 'connection_string'
  | 'sas_token'
  | 'default_credential_chain';

export type CreateDataSourceAuthenticationMode =
  | S3GcsAuthenticationMode
  | AzureBlobAuthenticationMode;

export const DATA_SOURCE_TYPES_WITH_AUTHENTICATION: ReadonlySet<DataSourceType> = new Set([
  's3',
  'gcs',
  'azure_blob',
]);

export const getDefaultAuthenticationMode = (
  dataSourceType: DataSourceType
): CreateDataSourceAuthenticationMode => {
  if (dataSourceType === 'azure_blob') {
    return 'credentials';
  }
  return 'access_and_secret_keys';
};

export const getCreateDataSourceAuthenticationOptions = (
  dataSourceType: DataSourceType
): Array<{
  value: CreateDataSourceAuthenticationMode;
  text: string;
}> => {
  if (dataSourceType === 'azure_blob') {
    return [
      {
        value: 'credentials',
        text: i18n.translate('dataSets.createFlyout.authentication.azure.credentials', {
          defaultMessage: 'Credentials',
        }),
      },
      {
        value: 'connection_string',
        text: i18n.translate('dataSets.createFlyout.authentication.azure.connectionString', {
          defaultMessage: 'Connection String',
        }),
      },
      {
        value: 'sas_token',
        text: i18n.translate('dataSets.createFlyout.authentication.azure.sasToken', {
          defaultMessage: 'SAS Token',
        }),
      },
      {
        value: 'default_credential_chain',
        text: i18n.translate('dataSets.createFlyout.authentication.azure.defaultCredentialChain', {
          defaultMessage: 'Default Credential Chain',
        }),
      },
    ];
  }

  return [
    {
      value: 'access_and_secret_keys',
      text: i18n.translate('dataSets.createFlyout.authentication.accessAndSecretKeys', {
        defaultMessage: 'Access and Secret keys',
      }),
    },
    {
      value: 'default_credential_chain',
      text: i18n.translate('dataSets.createFlyout.authentication.defaultCredentialChain', {
        defaultMessage: 'default credential chain',
      }),
    },
    {
      value: 'anonymous',
      text: i18n.translate('dataSets.createFlyout.authentication.anonymous', {
        defaultMessage: 'anonymous',
      }),
    },
  ];
};

export const showsAuthenticationCredentialFields = (
  mode: CreateDataSourceAuthenticationMode,
  dataSourceType: DataSourceType
): boolean => {
  if (dataSourceType === 'azure_blob') {
    return mode === 'credentials' || mode === 'connection_string' || mode === 'sas_token';
  }
  return mode === 'access_and_secret_keys';
};

export const createDataSourceFlyoutAuthenticationLabel = (): string =>
  i18n.translate('dataSets.createFlyout.authentication.label', {
    defaultMessage: 'Authentication',
  });

/** Applies UI authentication mode to the payload submitted to the API. */
export const applyAuthenticationModeToDataSource = (
  data: DataSourceWithSecrets,
  mode: CreateDataSourceAuthenticationMode
): DataSourceWithSecrets => {
  const auth = mode;

  switch (data.type) {
    case 's3': {
      const { access_key: _accessKey, secret_key: _secretKey, ...rest } = data.settings;
      return {
        ...data,
        settings: {
          ...rest,
          auth,
          ...(mode === 'access_and_secret_keys'
            ? { access_key: data.settings.access_key, secret_key: data.settings.secret_key }
            : {}),
        },
      };
    }
    case 'gcs': {
      const { credentials: _credentials, ...rest } = data.settings;
      const credentialsText = data.settings.credentials?.trim();
      return {
        ...data,
        settings: {
          ...rest,
          auth,
          ...(mode === 'access_and_secret_keys' && credentialsText
            ? { credentials: credentialsText }
            : {}),
        },
      };
    }
    case 'azure_blob': {
      const {
        account: _account,
        connection_string: _connectionString,
        key: _key,
        sas_token: _sasToken,
        ...rest
      } = data.settings;

      const base = { ...rest, auth };

      if (mode === 'credentials') {
        return {
          ...data,
          settings: {
            ...base,
            account: data.settings.account,
            key: data.settings.key,
          },
        };
      }
      if (mode === 'connection_string') {
        return {
          ...data,
          settings: {
            ...base,
            connection_string: data.settings.connection_string,
          },
        };
      }
      if (mode === 'sas_token') {
        return {
          ...data,
          settings: {
            ...base,
            sas_token: data.settings.sas_token,
          },
        };
      }
      return {
        ...data,
        settings: base,
      };
    }
    default:
      return data;
  }
};
