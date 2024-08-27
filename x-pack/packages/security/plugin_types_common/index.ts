/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  AuthenticatedUser,
  UserRealm,
  User,
  AuthenticationProvider,
} from './src/authentication';
export type {
  Role,
  RoleIndexPrivilege,
  RoleKibanaPrivilege,
  RoleRemoteIndexPrivilege,
  RoleRemoteClusterPrivilege,
  FeaturesPrivileges,
} from './src/authorization';
export type { SecurityLicense, SecurityLicenseFeatures, LoginLayout } from './src/licensing';
export type {
  UserProfileUserInfo,
  UserProfileData,
  UserProfileLabels,
  UserProfile,
  UserProfileWithSecurity,
  UserProfileUserInfoWithSecurity,
} from './src/user_profile';

export type {
  ApiKey,
  RestApiKey,
  CrossClusterApiKey,
  BaseApiKey,
  CrossClusterApiKeyAccess,
  ManagedApiKey,
  ApiKeyRoleDescriptors,
  ApiKeyToInvalidate,
  QueryApiKeyResult,
  CategorizedApiKey,
  ApiKeyAggregations,
} from './src/api_keys/api_key';
