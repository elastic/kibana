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
  CloudConnectorVarKeyMapping,
  CloudConnectorCredentialSchema,
  ResolvedVarTarget,
  NormalizedAwsCredentials,
  NormalizedAzureCredentials,
  NormalizedGcpCredentials,
  NormalizedCloudConnectorCredentials,
} from './types';

// Constants
export { INVALID_INDEX } from './constants';

// Schemas
export {
  AWS_CREDENTIAL_SCHEMA,
  AZURE_CREDENTIAL_SCHEMA,
  GCP_CREDENTIAL_SCHEMA,
  CREDENTIAL_SCHEMAS,
  getCredentialSchema,
  getAllVarKeys,
  getAllSupportedVarNames,
} from './schemas';

// Accessor functions
export {
  getCredentialStorageScope,
  resolveVarTarget,
  applyVarsAtTarget,
  extractRawCredentialVars,
  readCredentials,
  writeCredentials,
  getVarTarget,
  findFirstVarEntry,
} from './var_accessor';
