/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthOption } from '../service_registry';
import { authOptionStrings } from './auth_options_i18n';
import type { DataSourceType } from '../../common/datasource_types';

export function federatedIdentitySourceType(dataSourceType: DataSourceType): AuthOption {
  return {
    value: 'federated_identity',
    text: authOptionStrings.federatedIdentityLabel,
    description: authOptionStrings.federatedIdentityDescription[dataSourceType],
    recommended: true,
  };
}

export function accessAndSecretKeysSourceType(dataSourceType: DataSourceType): AuthOption {
  return {
    value: 'access_and_secret_keys',
    text: authOptionStrings.accessAndSecretKeysLabel,
    description: authOptionStrings.storedCredentialsDescription[dataSourceType],
  };
}

export function anonymousSourceType(dataSourceType: DataSourceType): AuthOption {
  return {
    value: 'anonymous',
    text: authOptionStrings.anonymousLabel,
    description: authOptionStrings.anonymousDescription[dataSourceType],
  };
}

export const azureCredentialsSourceType: AuthOption = {
  value: 'credentials',
  text: authOptionStrings.azureCredentialsLabel,
  description: authOptionStrings.storedCredentialsDescription.azure,
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
