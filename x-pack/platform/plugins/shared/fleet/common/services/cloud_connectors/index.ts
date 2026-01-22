/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Types
export type {
  CloudConnectorVarStorageMode,
  CloudConnectorVarTarget,
  CloudConnectorVarTargetResult,
  CloudConnectorCredentialVarKey,
  CloudConnectorCredentialSchema,
  CloudConnectorCredentialsReadResult,
  CloudConnectorVarAccessorOptions,
} from './types';

export { CloudConnectorVarAccessorError, CloudConnectorVarAccessorErrorCode } from './types';

// Schemas
export {
  AWS_CREDENTIAL_VAR_KEYS,
  AZURE_CREDENTIAL_VAR_KEYS,
  GCP_CREDENTIAL_VAR_KEYS,
  getCredentialSchema,
  getSecretVarKeys,
  isSecretVarKey,
} from './schemas';

// Var Accessor
export {
  detectStorageMode,
  resolveVarTarget,
  readCredentials,
  writeCredentials,
  createCloudConnectorVarAccessor,
  extractRawCredentialVars,
} from './var_accessor';
