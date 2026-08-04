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
import type { StreamsTestApiService } from '../../../../../streams/test/scout/api/services/streams_api_service';
import { getStreamsTestApiService } from '../../../../../streams/test/scout/api/services/streams_api_service';
import { getStreamsUsers } from '../../../../../streams/test/scout/api/fixtures/constants';
import {
  getSignificantEventsTestApiService,
  type SignificantEventsTestApiService,
} from '../../../scout/api/services/significant_events_api_service';

export interface StreamsSamlAuthFixture extends SamlAuth {
  asStreamsAdmin: () => Promise<RoleSessionCredentials>;
  asStreamsReadOnly: () => Promise<RoleSessionCredentials>;
}

export interface StreamsRequestAuthFixture extends RequestAuthFixture {
  loginAsStreamsAdmin: () => Promise<RoleApiCredentials>;
  loginAsStreamsReadOnly: () => Promise<RoleApiCredentials>;
}

export interface SignificantEventsCpsApiServicesFixture extends ApiServicesFixture {
  streamsTest: StreamsTestApiService;
  significantEventsTest: SignificantEventsTestApiService;
}

export const significantEventsCpsApiTest = apiTest.extend<{
  requestAuth: StreamsRequestAuthFixture;
  samlAuth: StreamsSamlAuthFixture;
  apiServices: SignificantEventsCpsApiServicesFixture;
}>({
  requestAuth: async ({ requestAuth, config }, use) => {
    const streamsUsers = getStreamsUsers(config);

    const extendedRequestAuth: StreamsRequestAuthFixture = {
      ...requestAuth,
      loginAsStreamsAdmin: async () =>
        requestAuth.getApiKeyForCustomRole(streamsUsers.streamsAdmin),
      loginAsStreamsReadOnly: async () =>
        requestAuth.getApiKeyForCustomRole(streamsUsers.streamsReadOnly),
    };
    await use(extendedRequestAuth);
  },

  samlAuth: async ({ samlAuth, config }, use) => {
    const streamsUsers = getStreamsUsers(config);

    const extendedSamlAuth: StreamsSamlAuthFixture = {
      ...samlAuth,
      asStreamsAdmin: async () => samlAuth.asInteractiveUser(streamsUsers.streamsAdmin),
      asStreamsReadOnly: async () => samlAuth.asInteractiveUser(streamsUsers.streamsReadOnly),
    };

    await use(extendedSamlAuth);
  },

  apiServices: async ({ apiServices, kbnClient, esClient, log }, use) => {
    const extendedApiServices = apiServices as SignificantEventsCpsApiServicesFixture;
    extendedApiServices.streamsTest = getStreamsTestApiService({ kbnClient, esClient, log });
    extendedApiServices.significantEventsTest = getSignificantEventsTestApiService({
      kbnClient,
      log,
    });
    await use(extendedApiServices);
  },
});

export { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from '../../../scout/api/fixtures/constants';
