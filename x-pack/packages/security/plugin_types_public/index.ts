/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { AuthenticationServiceStart, AuthenticationServiceSetup } from './src/authentication';
export type { AuthorizationServiceStart, AuthorizationServiceSetup } from './src/authorization';
export type { UserMenuLink, SecurityNavControlServiceStart } from './src/nav_control';
export type { SecurityPluginSetup, SecurityPluginStart } from './src/plugin';
export type {
  GetUserProfileResponse,
  UserProfileGetCurrentParams,
  UserProfileBulkGetParams,
  UserProfileSuggestParams,
  UserProfileAPIClient,
} from './src/user_profile';
export type {
  BulkUpdatePayload,
  BulkUpdateRoleResponse,
  RolePutPayload,
  RolesAPIClient,
} from './src/roles';
export { PrivilegesAPIClientPublicContract } from './src/privileges';
export type { PrivilegesAPIClientGetAllArgs } from './src/privileges';
export type { SecurityLicense } from './src/license';
