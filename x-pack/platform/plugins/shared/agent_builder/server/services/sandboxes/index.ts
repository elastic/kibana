/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  sandboxProfileSavedObjectType,
  SANDBOX_PROFILE_SO_TYPE,
  SANDBOX_PROFILE_ATTRIBUTES_IN_AAD,
  SANDBOX_PROFILE_ATTRIBUTES_TO_ENCRYPT,
  type SandboxProfileAttributes,
} from './saved_object';
export { SandboxProfileClient } from './profile_client';
export {
  initSandboxProfileProvider,
  canEncryptSandboxProfiles,
  getSandboxProfileClient,
  resolveProfileWithSecrets,
} from './profile_provider';
