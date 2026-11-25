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
  SECRET_VALUE_MAX_LENGTH,
  SECRET_VALUE_MIN_LENGTH,
} from './src/constants';
export {
  SecretAlreadyExistsError,
  SecretConflictError,
  SecretNotFoundError,
  SecretsUnavailableError,
  SecretValidationError,
} from './src/errors';
export { isValidSecretName } from './src/secret_name';
export { createSecretsClient } from './src/secrets_client';
export type { CreateSecretsClientParams } from './src/secrets_client';
export type { SecretsStorage, StoredSecret } from './src/storage';
export { createUnavailableSecretsClient } from './src/unavailable_secrets_client';
export type { CreateUnavailableSecretsClientParams } from './src/unavailable_secrets_client';
export type {
  CreateSecretParams,
  DeleteSecretParams,
  KibanaSecretEntry,
  KibanaSecretMetadata,
  KibanaSecretSource,
  SecretDetails,
  SecretEntry,
  SecretMetadata,
  SecretProviderType,
  SecretsClient,
  SecretSource,
  UpdateSecretParams,
} from './src/types';
