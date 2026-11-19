/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  SECRET_DESCRIPTION_MAX_LENGTH,
  SECRET_NAME_MAX_LENGTH,
  SECRET_PROVIDER_TYPE,
  SECRET_REFERENCE_MAX_LENGTH,
  SECRET_VALUE_MAX_LENGTH,
  SECRET_VALUE_MIN_LENGTH,
} from './src/constants';
export {
  SecretAlreadyExistsError,
  SecretNotFoundError,
  SecretsUnavailableError,
  SecretValidationError,
} from './src/errors';
export { createKibanaSecretProvider } from './src/providers/kibana_secret_provider';
export { isValidSecretName, normalizeSecretName } from './src/secret_name';
export { createSecretsClient } from './src/secrets_client';
export type { CreateSecretsClientParams } from './src/secrets_client';
export type { SecretsStorage } from './src/storage';
export type {
  ConnectorSecretEntry,
  ConnectorSecretSource,
  DeleteSecretParams,
  GetSecretsClientParams,
  KibanaSecretEntry,
  KibanaSecretSource,
  ResolvedSecrets,
  ResolveSecretsParams,
  SecretDetails,
  SecretEntry,
  SecretMetadata,
  SecretProvider,
  SecretProviders,
  SecretProviderType,
  SecretResolutionFailure,
  SecretsClient,
  SecretSource,
  WriteSecretParams,
} from './src/types';
