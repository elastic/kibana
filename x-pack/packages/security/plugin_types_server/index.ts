/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  AuditEvent,
  AuditHttp,
  AuditKibana,
  AuditRequest,
  AuditServiceSetup,
  AuditLogger,
} from './src/audit';
export type {
  CreateAPIKeyParams,
  CreateAPIKeyResult,
  CreateRestAPIKeyParams,
  GrantAPIKeyResult,
  InvalidateAPIKeysParams,
  ValidateAPIKeyParams,
  CreateRestAPIKeyWithKibanaPrivilegesParams,
  CreateCrossClusterAPIKeyParams,
  InvalidateAPIKeyResult,
  APIKeys,
  AuthenticationServiceStart,
} from './src/authentication';
export type {
  PrivilegeDeprecationsService,
  PrivilegeDeprecationsRolesByFeatureIdResponse,
  PrivilegeDeprecationsRolesByFeatureIdRequest,
  CheckPrivilegesResponse,
  CheckPrivilegesWithRequest,
  CheckSavedObjectsPrivilegesWithRequest,
  CheckPrivilegesDynamicallyWithRequest,
  KibanaPrivilegesType,
  SavedObjectActions,
  UIActions,
  CheckPrivilegesPayload,
  CheckSavedObjectsPrivileges,
  HasPrivilegesResponse,
  HasPrivilegesResponseApplication,
  SpaceActions,
  Actions,
  CheckPrivilegesOptions,
  CheckUserProfilesPrivilegesPayload,
  CheckUserProfilesPrivilegesResponse,
  ElasticsearchPrivilegesType,
  CasesActions,
  CheckPrivileges,
  AlertingActions,
  AppActions,
  ApiActions,
  CheckPrivilegesDynamically,
  CheckUserProfilesPrivileges,
  AuthorizationMode,
  AuthorizationServiceSetup,
} from './src/authorization';
export type { SecurityPluginSetup, SecurityPluginStart } from './src/plugin';
export type {
  UserProfileServiceStart,
  UserProfileSuggestParams,
  UserProfileGetCurrentParams,
  UserProfileBulkGetParams,
  UserProfileRequiredPrivileges,
} from './src/user_profile';

export {
  restApiKeySchema,
  getRestApiKeyWithKibanaPrivilegesSchema,
  crossClusterApiKeySchema,
} from './src/authentication';
export { GLOBAL_RESOURCE, elasticsearchRoleSchema, getKibanaRoleSchema } from './src/authorization';
