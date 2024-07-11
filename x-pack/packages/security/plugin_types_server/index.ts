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
  APIKeys,
  AuthenticationServiceStart,
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
  UpdateCrossClusterAPIKeyParams,
  UpdateRestAPIKeyParams,
  UpdateRestAPIKeyWithKibanaPrivilegesParams,
} from './src/authentication';
export type {
  PrivilegeDeprecationsService,
  PrivilegeDeprecationsRolesByFeatureIdResponse,
  PrivilegeDeprecationsRolesByFeatureIdRequest,
  CheckPrivilegesResponse,
  CheckPrivilegesWithRequest,
  CheckSavedObjectsPrivilegesWithRequest,
  CheckPrivilegesDynamicallyWithRequest,
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
  getUpdateRestApiKeyWithKibanaPrivilegesSchema,
  updateRestApiKeySchema,
  updateCrossClusterApiKeySchema,
} from './src/authentication';

export type {
  ElasticsearchPrivilegesType,
  KibanaPrivilegesType,
  APIKeysService,
  CreateAPIKeyParams,
  CreateAPIKeyResult,
  InvalidateAPIKeyResult,
  InvalidateAPIKeysParams,
  ValidateAPIKeyParams,
  CreateRestAPIKeyParams,
  CreateRestAPIKeyWithKibanaPrivilegesParams,
  CreateCrossClusterAPIKeyParams,
  GrantAPIKeyResult,
} from '@kbn/core-security-server';
export { isCreateRestAPIKeyParams } from '@kbn/core-security-server';

export {
  restApiKeySchema,
  crossClusterApiKeySchema,
  getRestApiKeyWithKibanaPrivilegesSchema,
} from './src/authentication';
export { getKibanaRoleSchema, elasticsearchRoleSchema, GLOBAL_RESOURCE } from './src/authorization';
