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
import type { StreamsTestApiService } from '../services/streams_api_service';
import { getStreamsTestApiService } from '../services/streams_api_service';
import { STREAMS_USERS } from './constants';

export interface StreamsSamlAuthFixture extends SamlAuth {
  asStreamsAdmin: () => Promise<RoleSessionCredentials>;
  asStreamsReadOnly: () => Promise<RoleSessionCredentials>;
  asStreamsUnauthorized: () => Promise<RoleSessionCredentials>;
}

export interface StreamsRequestAuthFixture extends RequestAuthFixture {
  loginAsStreamsAdmin: () => Promise<RoleApiCredentials>;
  loginAsStreamsReadOnly: () => Promise<RoleApiCredentials>;
}

export interface StreamsApiServicesFixture extends ApiServicesFixture {
  streamsTest: StreamsTestApiService;
}

export const streamsApiTest = apiTest.extend<{
  requestAuth: StreamsRequestAuthFixture;
  samlAuth: StreamsSamlAuthFixture;
  apiServices: StreamsApiServicesFixture;
}>({
  requestAuth: async ({ requestAuth }, use) => {
    const loginAsStreamsAdmin = async () =>
      requestAuth.getApiKeyForCustomRole(STREAMS_USERS.streamsAdmin);

    const loginAsStreamsReadOnly = async () =>
      requestAuth.getApiKeyForCustomRole(STREAMS_USERS.streamsReadOnly);

    const extendedRequestAuth: StreamsRequestAuthFixture = {
      ...requestAuth,
      loginAsStreamsAdmin,
      loginAsStreamsReadOnly,
    };
    await use(extendedRequestAuth);
  },

  samlAuth: async ({ samlAuth }, use) => {
    const asStreamsAdmin = async () => samlAuth.asInteractiveUser(STREAMS_USERS.streamsAdmin);

    const asStreamsReadOnly = async () => samlAuth.asInteractiveUser(STREAMS_USERS.streamsReadOnly);

    const asStreamsUnauthorized = async () =>
      samlAuth.asInteractiveUser(STREAMS_USERS.streamsUnauthorized);

    const extendedSamlAuth: StreamsSamlAuthFixture = {
      ...samlAuth,
      asStreamsAdmin,
      asStreamsReadOnly,
      asStreamsUnauthorized,
    };

    await use(extendedSamlAuth);
  },

  apiServices: async ({ apiServices, kbnClient, log }, use) => {
    const extendedApiServices = apiServices as StreamsApiServicesFixture;
    extendedApiServices.streamsTest = getStreamsTestApiService({ kbnClient, log });
    await use(extendedApiServices);
  },
});

export { STREAMS_USERS } from './constants';
export { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from './constants';
