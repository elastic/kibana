/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateDataSourceAuthenticationMode } from './create_data_source_flyout_authentication';
import { authenticationStrings } from './create_data_source_flyout_authentication_i18n';
import type { DataSourceType } from '../../common/datasource_types';

export interface AuthOption {
  value: CreateDataSourceAuthenticationMode;
  text: string;
  description: string;
  recommended?: boolean;
}

export function federatedIdentitySourceType(dataSourceType: DataSourceType): AuthOption {
  return {
    value: 'federated_identity',
    text: authenticationStrings.federatedIdentityLabel,
    description: authenticationStrings.federatedIdentityDescription[dataSourceType],
    recommended: true,
  };
}

export function accessAndSecretKeysSourceType(dataSourceType: DataSourceType): AuthOption {
  return {
    value: 'access_and_secret_keys',
    text: authenticationStrings.accessAndSecretKeysLabel,
    description: authenticationStrings.storedCredentialsDescription[dataSourceType],
  };
}

export function anonymousSourceType(dataSourceType: DataSourceType): AuthOption {
  return {
    value: 'anonymous',
    text: authenticationStrings.anonymousLabel,
    description: authenticationStrings.anonymousDescription[dataSourceType],
  };
}

export const azureCredentialsSourceType: AuthOption = {
  value: 'credentials',
  text: authenticationStrings.azureCredentialsLabel,
  description: authenticationStrings.storedCredentialsDescription.azure,
};

export const azureAuthOptions: AuthOption[] = [
  azureCredentialsSourceType,
  anonymousSourceType('azure'),
];

export const s3AuthOptions: AuthOption[] = [
  accessAndSecretKeysSourceType('s3'),
  anonymousSourceType('s3'),
];

export const gcsAuthOptions: AuthOption[] = [
  accessAndSecretKeysSourceType('gcs'),
  anonymousSourceType('gcs'),
];
