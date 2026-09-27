/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  registerWorkloadBindingSavedObjectType,
  SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
} from './bindings';
export type { ServiceAccountWorkloadBindingsApi } from './bindings';
export {
  registerServiceAccountCredentialSavedObjectType,
  SERVICE_ACCOUNT_CREDENTIAL_TYPE,
  ServiceAccountCredentialStore,
} from './credentials';
export type { ServiceAccountCredentialAttributes } from './credentials';
export { ServiceAccountsService } from './service_accounts_service';
export type { ServiceAccountsServiceStartParams } from './service_accounts_service';
export type {
  CloudProjectContext,
  ListServiceAccountsParams,
  ServiceAccountsBackend,
  ServiceAccountsServiceStart,
} from './types';
export { buildAssumableBy } from './assumable_by';
export { buildRoleAssignments } from './role_assignments';
export { EsServiceAccounts } from './es_service_accounts';
export {
  ES_SERVICE_ACCOUNT_MAX_ROLES,
  ES_SERVICE_ACCOUNT_ROLE_LIMITS,
  ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH,
} from './es_role_limits';
export { UiamServiceAccounts } from './uiam_service_accounts';
export {
  UIAM_SERVICE_ACCOUNT_MAX_ROLES,
  UIAM_SERVICE_ACCOUNT_ROLE_LIMITS,
  UIAM_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH,
} from './uiam_role_limits';
export { ServiceAccountFakeRequests } from './fake_requests';
export type {
  CreateServiceAccountFakeRequestParams,
  ServiceAccountMintInterceptor,
} from './fake_requests';
