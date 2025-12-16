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
  ApiServicesFixture,
  RequestAuthFixture,
  SamlAuth,
} from '@kbn/scout';
import type { TransformApiService } from '../services/transform_api_service';
import { getTransformApiService } from '../services/transform_api_service';
import { TRANSFORM_USERS } from './constants';

export interface TransformSamlAuthFixture extends SamlAuth {
  asTransformPowerUser: () => Promise<RoleSessionCredentials>;
  asTransformViewer: () => Promise<RoleSessionCredentials>;
  asTransformUnauthorizedUser: () => Promise<RoleSessionCredentials>;
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
    const asTransformPowerUser = async () =>
      samlAuth.asInteractiveUserWithCustomRole(TRANSFORM_USERS.transformPowerUser);

    const asTransformViewer = async () =>
      samlAuth.asInteractiveUserWithCustomRole(TRANSFORM_USERS.transformViewerUser);

    const asTransformUnauthorizedUser = async () =>
      samlAuth.asInteractiveUserWithCustomRole(TRANSFORM_USERS.transformUnauthorizedUser);

    const extendedSamlAuth: TransformSamlAuthFixture = {
      ...samlAuth,
      asTransformPowerUser,
      asTransformViewer,
      asTransformUnauthorizedUser,
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
