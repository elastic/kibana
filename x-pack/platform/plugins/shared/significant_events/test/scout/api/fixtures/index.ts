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
import {
  getSignificantEventsTestApiService,
  type SignificantEventsTestApiService,
} from '../services/significant_events_api_service';
import { getSignificantEventsUsers } from './constants';

export interface SignificantEventsSamlAuthFixture extends SamlAuth {
  asSignificantEventsAdmin: () => Promise<RoleSessionCredentials>;
  asSignificantEventsReadOnly: () => Promise<RoleSessionCredentials>;
  asUnauthorized: () => Promise<RoleSessionCredentials>;
}

export interface SignificantEventsRequestAuthFixture extends RequestAuthFixture {
  loginAsSignificantEventsAdmin: () => Promise<RoleApiCredentials>;
  loginAsSignificantEventsReadOnly: () => Promise<RoleApiCredentials>;
}

export interface SignificantEventsApiServicesFixture extends ApiServicesFixture {
  significantEventsTest: SignificantEventsTestApiService;
}

export const significantEventsApiTest = apiTest.extend<{
  requestAuth: SignificantEventsRequestAuthFixture;
  samlAuth: SignificantEventsSamlAuthFixture;
  apiServices: SignificantEventsApiServicesFixture;
}>({
  requestAuth: async ({ requestAuth, config }, use) => {
    const users = getSignificantEventsUsers(config);

    const loginAsSignificantEventsAdmin = async () =>
      requestAuth.getApiKeyForCustomRole(users.significantEventsAdmin);

    const loginAsSignificantEventsReadOnly = async () =>
      requestAuth.getApiKeyForCustomRole(users.significantEventsReadOnly);

    const extendedRequestAuth: SignificantEventsRequestAuthFixture = {
      ...requestAuth,
      loginAsSignificantEventsAdmin,
      loginAsSignificantEventsReadOnly,
    };
    await use(extendedRequestAuth);
  },

  samlAuth: async ({ samlAuth, config }, use) => {
    const users = getSignificantEventsUsers(config);

    const asSignificantEventsAdmin = async () =>
      samlAuth.asInteractiveUser(users.significantEventsAdmin);

    const asSignificantEventsReadOnly = async () =>
      samlAuth.asInteractiveUser(users.significantEventsReadOnly);

    const asUnauthorized = async () => samlAuth.asInteractiveUser(users.unauthorized);

    const extendedSamlAuth: SignificantEventsSamlAuthFixture = {
      ...samlAuth,
      asSignificantEventsAdmin,
      asSignificantEventsReadOnly,
      asUnauthorized,
    };

    await use(extendedSamlAuth);
  },

  apiServices: async ({ apiServices, kbnClient, log }, use) => {
    const extendedApiServices = apiServices as SignificantEventsApiServicesFixture;
    extendedApiServices.significantEventsTest = getSignificantEventsTestApiService({
      kbnClient,
      log,
    });
    await use(extendedApiServices);
  },
});

export { getSignificantEventsUsers } from './constants';
export { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from './constants';
