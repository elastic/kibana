/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';

import { getFindResultStatus } from '../__mocks__/request_responses';
import { createMockServer } from '../__mocks__';
import { clientsServiceMock } from '../__mocks__/clients_service_mock';

import { findRulesStatusesRoute } from './find_rules_status_route';
import { ServerInjectOptions } from 'hapi';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

describe('find_statuses', () => {
  let server = createMockServer();
  let getClients = clientsServiceMock.createGetScoped();
  let clients = clientsServiceMock.createClients();

  beforeEach(() => {
    // jest carries state between mocked implementations when using
    // spyOn. So now we're doing all three of these.
    // https://github.com/facebook/jest/issues/7136#issuecomment-565976599
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();

    server = createMockServer();
    getClients = clientsServiceMock.createGetScoped();
    clients = clientsServiceMock.createClients();

    getClients.mockResolvedValue(clients);

    findRulesStatusesRoute(server.route, getClients);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when finding a single rule status with a valid alertsClient', async () => {
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const request: ServerInjectOptions = {
        method: 'GET',
        url: `${DETECTION_ENGINE_RULES_URL}/_find_statuses?ids=["someid"]`,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      getClients.mockResolvedValue(omit('alertsClient', clients));
      const request: ServerInjectOptions = {
        method: 'GET',
        url: `${DETECTION_ENGINE_RULES_URL}/_find_statuses?ids=["someid"]`,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(404);
    });

    test('catch error when savedObjectsClient find function throws error', async () => {
      clients.savedObjectsClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const request: ServerInjectOptions = {
        method: 'GET',
        url: `${DETECTION_ENGINE_RULES_URL}/_find_statuses?ids=["someid"]`,
      };
      const { payload, statusCode } = await server.inject(request);
      expect(JSON.parse(payload).message).toBe('Test error');
      expect(statusCode).toBe(500);
    });
  });

  describe('validation', () => {
    test('returns 400 if id is given instead of ids', async () => {
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const request: ServerInjectOptions = {
        method: 'GET',
        url: `${DETECTION_ENGINE_RULES_URL}/_find_statuses?id=["someid"]`,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 200 if the set of optional query parameters are given', async () => {
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const request: ServerInjectOptions = {
        method: 'GET',
        url: `${DETECTION_ENGINE_RULES_URL}/_find_statuses?ids=["someid"]`,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });
  });
});
