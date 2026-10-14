/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Compatibility shim: preserves the existing public API while code moves to core/ and providers/aws/.
export { INGEST_HUB_ENABLED_FLAG, INGEST_HUB_ONBOARDING_ENABLED_FLAG } from './core';

export {
  AWS_ONBOARDING_TITLE,
  AWS_ONBOARDING_DESCRIPTION,
  ALL_INTEGRATIONS_SID,
  getIntegrationSid,
  buildIamPolicyDocument,
  formatIamPolicyDocument,
  AWS_SERVICE_PROVIDER_PERMISSIONS,
  IAM_PERMISSIONS_API_PATH,
} from './providers/aws';
export type {
  IamPolicyDocument,
  ProviderPermissions,
  GetIamPermissionsResponse,
  ServiceIamPermissions,
} from './providers/aws';
