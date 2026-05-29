/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import type {
  RoleApiCredentials,
  RoleSessionCredentials,
  RequestAuthFixture,
  SamlAuth,
} from '@kbn/scout';
import { ML_USERS } from './constants';
import { CUSTOM_ROLES } from './custom_roles';

export interface MlSamlAuthFixture extends SamlAuth {
  asMlPoweruser: () => Promise<RoleSessionCredentials>;
  asMlViewer: () => Promise<RoleSessionCredentials>;
  asMlUnauthorized: () => Promise<RoleSessionCredentials>;
}

export interface MlRequestAuthFixture extends RequestAuthFixture {
  getApiKeyForMlGlobalAll: () => Promise<RoleApiCredentials>;
  getApiKeyForMlRead: () => Promise<RoleApiCredentials>;
  getApiKeyForMlNone: () => Promise<RoleApiCredentials>;
}

export const mlApiTest = apiTest.extend<{
  samlAuth: MlSamlAuthFixture;
  requestAuth: MlRequestAuthFixture;
}>({
  samlAuth: async ({ samlAuth }, use) => {
    const extendedSamlAuth: MlSamlAuthFixture = {
      ...samlAuth,
      asMlPoweruser: () => samlAuth.asInteractiveUser(ML_USERS.mlPoweruser),
      asMlViewer: () => samlAuth.asInteractiveUser(ML_USERS.mlViewer),
      asMlUnauthorized: () => samlAuth.asInteractiveUser(ML_USERS.mlUnauthorized),
    };
    await use(extendedSamlAuth);
  },
  requestAuth: async ({ requestAuth }, use) => {
    const extendedRequestAuth: MlRequestAuthFixture = {
      ...requestAuth,
      getApiKeyForMlGlobalAll: () => requestAuth.getApiKeyForCustomRole(CUSTOM_ROLES.global_all),
      getApiKeyForMlRead: () => requestAuth.getApiKeyForCustomRole(CUSTOM_ROLES.ml_read),
      getApiKeyForMlNone: () => requestAuth.getApiKeyForCustomRole(CUSTOM_ROLES.ml_none),
    };
    await use(extendedRequestAuth);
  },
});

export { ML_USERS, COMMON_HEADERS, INTERNAL_API_HEADERS, PUBLIC_API_HEADERS } from './constants';
export { CUSTOM_ROLES } from './custom_roles';
