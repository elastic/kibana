/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createMockServer,
  createMockServerWithoutActionClientDecoration,
  createMockServerWithoutAlertClientDecoration,
  createMockServerWithoutActionOrAlertClientDecoration,
} from '../__mocks__/_mock_server';

import { findRulesRoute } from './find_rules_route';
import { ServerInjectOptions } from 'hapi';
import { getFindResult, getResult, getFindRequest } from '../__mocks__/request_responses';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

describe('find_rules', () => {
  let { server, alertsClient, actionsClient } = createMockServer();

  beforeEach(() => {
    ({ server, alertsClient, actionsClient } = createMockServer());
    findRulesRoute(server);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when finding a single rule with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      actionsClient.find.mockResolvedValue({
        page: 1,
        perPage: 1,
        total: 0,
        data: [],
      });
      alertsClient.get.mockResolvedValue(getResult());
      const { statusCode } = await server.inject(getFindRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      findRulesRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(getFindRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      findRulesRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(getFindRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      findRulesRoute(serverWithoutActionOrAlertClient);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(getFindRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 400 if a bad query parameter is given', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      const request: ServerInjectOptions = {
        method: 'GET',
        url: `${DETECTION_ENGINE_RULES_URL}/_find?invalid_value=500`,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 200 if the set of optional query parameters are given', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      const request: ServerInjectOptions = {
        method: 'GET',
        url: `${DETECTION_ENGINE_RULES_URL}/_find?page=2&per_page=20&sort_field=timestamp&fields=["field-1","field-2","field-3]`,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });
  });
});
