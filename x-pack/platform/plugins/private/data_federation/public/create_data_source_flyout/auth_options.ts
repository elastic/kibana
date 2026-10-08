/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateDataSourceAuthenticationMode } from './create_data_source_flyout_authentication';
import { authenticationStrings } from './create_data_source_flyout_authentication_i18n';
import type { DataSourceType } from '../../common/datasource_types';


interface AuthOption {
  value: CreateDataSourceAuthenticationMode;
  text: string;
  description: string;
  recommended?: boolean;
  hasAuthFields: boolean;
}

export function federatedIdentitySourceType(dataSourceType: DataSourceType): AuthOption {
  return {
    value: 'federated_identity',
    text: authenticationStrings.federatedIdentityLabel,
    description: authenticationStrings.federatedIdentityDescription[dataSourceType],
    recommended: true,
    hasAuthFields: true,
  }
};

export function accessAndSecretKeysSourceType(dataSourceType: DataSourceType): AuthOption {
  return {
    value: 'access_and_secret_keys',
    text: authenticationStrings.accessAndSecretKeysLabel,
    description: authenticationStrings.storedCredentialsDescription[dataSourceType],
    hasAuthFields: true,
  };
};

export function anonymousSourceType(dataSourceType: DataSourceType): AuthOption {
  return {
    value: 'anonymous',
    text: authenticationStrings.anonymousLabel,
    description: authenticationStrings.anonymousDescription[dataSourceType],
    hasAuthFields: false,
  }
};

export const azureCredentialsSourceType: AuthOption = {
  value: 'credentials',
  text: authenticationStrings.azureCredentialsLabel,
  description: authenticationStrings.storedCredentialsDescription.azure,
  hasAuthFields: true,
};

const azureAuthOptions: AuthOption[] = [
  azureCredentialsSourceType,
  anonymousSourceType('azure')
];

const s3AuthOptions: AuthOption[] = [
  accessAndSecretKeysSourceType('s3'),
  anonymousSourceType('s3')
];

const gcsAuthOptions: AuthOption[] = [
  accessAndSecretKeysSourceType('gcs'),
  anonymousSourceType('gcs')
];

export function authOptionsByDataSourceType(federatedIdentity: boolean): Record<DataSourceType, AuthOption[]> {
  const s3Options = federatedIdentity ? [federatedIdentitySourceType('s3'), ...s3AuthOptions] : s3AuthOptions;
  const gcsOptions = federatedIdentity ? [federatedIdentitySourceType('gcs'), ...gcsAuthOptions] : gcsAuthOptions;
  const azureOptions = federatedIdentity ? [federatedIdentitySourceType('azure'), ...azureAuthOptions] : azureAuthOptions;

 return {
  azure: azureOptions,
  s3: s3Options,
  gcs: gcsOptions,
 };
};
