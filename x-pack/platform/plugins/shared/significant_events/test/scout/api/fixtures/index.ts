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
import { getStreamsUsers } from './constants';

export interface StreamsSamlAuthFixture extends SamlAuth {
  asStreamsAdmin: () => Promise<RoleSessionCredentials>;
  asStreamsReadOnly: () => Promise<RoleSessionCredentials>;
  asStreamsUnauthorized: () => Promise<RoleSessionCredentials>;
}

export interface StreamsRequestAuthFixture extends RequestAuthFixture {
  loginAsStreamsAdmin: () => Promise<RoleApiCredentials>;
  loginAsStreamsReadOnly: () => Promise<RoleApiCredentials>;
}

export interface SignificantEventsApiServicesFixture extends ApiServicesFixture {
  significantEventsTest: SignificantEventsTestApiService;
}

export const significantEventsApiTest = apiTest.extend<{
  requestAuth: StreamsRequestAuthFixture;
  samlAuth: StreamsSamlAuthFixture;
  apiServices: SignificantEventsApiServicesFixture;
}>({
  requestAuth: async ({ requestAuth, config }, use) => {
    const streamsUsers = getStreamsUsers(config);

    const loginAsStreamsAdmin = async () =>
      requestAuth.getApiKeyForCustomRole(streamsUsers.streamsAdmin);

    const loginAsStreamsReadOnly = async () =>
      requestAuth.getApiKeyForCustomRole(streamsUsers.streamsReadOnly);

    const extendedRequestAuth: StreamsRequestAuthFixture = {
      ...requestAuth,
      loginAsStreamsAdmin,
      loginAsStreamsReadOnly,
    };
    await use(extendedRequestAuth);
  },

  samlAuth: async ({ samlAuth, config }, use) => {
    const streamsUsers = getStreamsUsers(config);

    const asStreamsAdmin = async () => samlAuth.asInteractiveUser(streamsUsers.streamsAdmin);

    const asStreamsReadOnly = async () => samlAuth.asInteractiveUser(streamsUsers.streamsReadOnly);

    const asStreamsUnauthorized = async () =>
      samlAuth.asInteractiveUser(streamsUsers.streamsUnauthorized);

    const extendedSamlAuth: StreamsSamlAuthFixture = {
      ...samlAuth,
      asStreamsAdmin,
      asStreamsReadOnly,
      asStreamsUnauthorized,
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

export { getStreamsUsers } from './constants';
export { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from './constants';
