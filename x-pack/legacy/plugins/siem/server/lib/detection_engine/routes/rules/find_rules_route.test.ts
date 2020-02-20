/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';

import { createMockServer } from '../__mocks__';
import { clientsServiceMock } from '../__mocks__/clients_service_mock';

import { findRulesRoute } from './find_rules_route';
import { ServerInjectOptions } from 'hapi';

import { getFindResult, getResult, getFindRequest } from '../__mocks__/request_responses';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

describe('find_rules', () => {
  let server = createMockServer();
  let getClients = clientsServiceMock.createGetScoped();
  let clients = clientsServiceMock.createClients();

  beforeEach(() => {
    jest.resetAllMocks();

    server = createMockServer();
    getClients = clientsServiceMock.createGetScoped();
    clients = clientsServiceMock.createClients();

    getClients.mockResolvedValue(clients);

    findRulesRoute(server.route, getClients);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when finding a single rule with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.actionsClient.find.mockResolvedValue({
        page: 1,
        perPage: 1,
        total: 0,
        data: [],
      });
      clients.alertsClient.get.mockResolvedValue(getResult());
      const { statusCode } = await server.inject(getFindRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { route, inject } = createMockServer();
      getClients.mockResolvedValue(omit('alertsClient', clients));
      findRulesRoute(route, getClients);
      const { statusCode } = await inject(getFindRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 400 if a bad query parameter is given', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      const request: ServerInjectOptions = {
        method: 'GET',
        url: `${DETECTION_ENGINE_RULES_URL}/_find?invalid_value=500`,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 200 if the set of optional query parameters are given', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      const request: ServerInjectOptions = {
        method: 'GET',
        url: `${DETECTION_ENGINE_RULES_URL}/_find?page=2&per_page=20&sort_field=timestamp&fields=["field-1","field-2","field-3]`,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });
  });
});
