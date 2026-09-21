/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getCredentialId,
  registerServiceAccountCredentialSavedObjectType,
  SERVICE_ACCOUNT_CREDENTIAL_TYPE,
} from './credential_saved_object';
export type {
  ServiceAccountCredentialAttributes,
  ServiceAccountCredentialCreator,
} from './credential_saved_object';
export { ServiceAccountCredentialStore } from './credential_store';
export type { ServiceAccountCredentialStoreOptions } from './credential_store';
export type { ServiceAccountCredentialMetadata } from './credential_saved_object';
