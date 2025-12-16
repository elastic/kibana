/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import type {
  RoleApiCredentials,
  ApiServicesFixture,
  RequestAuthFixture,
  SamlAuth,
} from '@kbn/scout';
import type { TransformApiService } from '../services/transform_api_service';
import { getTransformApiService } from '../services/transform_api_service';
import { TRANSFORM_USERS } from './constants';

export interface TransformSamlAuthFixture extends SamlAuth {
  getInteractiveUserSessionCookieForTransformPowerUser: () => Promise<string>;
  getInteractiveUserSessionCookieForTransformViewerUser: () => Promise<string>;
  getInteractiveUserSessionCookieForTransformUnauthorizedUser: () => Promise<string>;
}

export interface TransformRequestAuthFixture extends RequestAuthFixture {
  loginAsTransformPowerUser: () => Promise<RoleApiCredentials>;
  loginAsTransformViewerUser: () => Promise<RoleApiCredentials>;
  loginAsTransformUnauthorizedUser: () => Promise<RoleApiCredentials>;
}

export interface TransformApiServicesFixture extends ApiServicesFixture {
  transform: TransformApiService;
}

export const transformApiTest = apiTest.extend<{
  requestAuth: TransformRequestAuthFixture;
  samlAuth: TransformSamlAuthFixture;
  apiServices: TransformApiServicesFixture;
}>({
  requestAuth: async ({ requestAuth }, use) => {
    const loginAsTransformPowerUser = async () =>
      requestAuth.getApiKeyForCustomRole(TRANSFORM_USERS.transformPowerUser);

    const loginAsTransformViewerUser = async () =>
      requestAuth.getApiKeyForCustomRole(TRANSFORM_USERS.transformViewerUser);

    const loginAsTransformUnauthorizedUser = async () =>
      requestAuth.getApiKeyForCustomRole(TRANSFORM_USERS.transformUnauthorizedUser);

    const extendedRequestAuth: TransformRequestAuthFixture = {
      ...requestAuth,
      loginAsTransformPowerUser,
      loginAsTransformViewerUser,
      loginAsTransformUnauthorizedUser,
    };
    await use(extendedRequestAuth);
  },

  samlAuth: async ({ samlAuth }, use) => {
    const getInteractiveUserSessionCookieForTransformPowerUser = async () => {
      await samlAuth.setCustomRole(TRANSFORM_USERS.transformPowerUser);
      return `sid=${await samlAuth.session.getInteractiveUserSessionCookieWithRoleScope(
        samlAuth.customRoleName
      )}`;
    };

    const getInteractiveUserSessionCookieForTransformViewerUser = async () => {
      await samlAuth.setCustomRole(TRANSFORM_USERS.transformViewerUser);
      return `sid=${await samlAuth.session.getInteractiveUserSessionCookieWithRoleScope(
        samlAuth.customRoleName
      )}`;
    };

    const getInteractiveUserSessionCookieForTransformUnauthorizedUser = async () => {
      await samlAuth.setCustomRole(TRANSFORM_USERS.transformUnauthorizedUser);
      return `sid=${await samlAuth.session.getInteractiveUserSessionCookieWithRoleScope(
        samlAuth.customRoleName
      )}`;
    };

    const extendedSamlAuth: TransformSamlAuthFixture = {
      ...samlAuth,
      getInteractiveUserSessionCookieForTransformPowerUser,
      getInteractiveUserSessionCookieForTransformViewerUser,
      getInteractiveUserSessionCookieForTransformUnauthorizedUser,
    };

    await use(extendedSamlAuth);
  },

  apiServices: async ({ apiServices, esClient }, use) => {
    const extendedApiServices = apiServices as TransformApiServicesFixture;
    extendedApiServices.transform = getTransformApiService(esClient);
    await use(extendedApiServices);
  },
});

export { TRANSFORM_USERS } from './constants';
export { COMMON_API_HEADERS } from './constants';
