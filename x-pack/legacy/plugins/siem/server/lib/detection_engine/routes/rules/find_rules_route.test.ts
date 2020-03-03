/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';

import {
  getFindResult,
  getResult,
  getFindResultWithSingleHit,
  getFindResultStatus,
  getFindRequest,
} from '../__mocks__/request_responses';
import { createMockServer } from '../__mocks__';
import { clientsServiceMock } from '../__mocks__/clients_service_mock';

import * as utils from './utils';
import * as findRules from '../../rules/find_rules';

import { findRulesRoute } from './find_rules_route';
import { ServerInjectOptions } from 'hapi';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

describe('find_rules', () => {
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

    findRulesRoute(server.route, getClients);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when finding a single rule with a valid alertsClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
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

    test('catches error when transformation fails', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      jest.spyOn(utils, 'transformFindAlerts').mockReturnValue(null);
      const { payload, statusCode } = await server.inject(getFindRequest());
      expect(statusCode).toBe(500);
      expect(JSON.parse(payload).message).toBe('Internal error transforming');
    });

    test('catch error when findRules function throws error', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      jest.spyOn(findRules, 'findRules').mockImplementation(async () => {
        throw new Error('Test error');
      });
      const { payload, statusCode } = await server.inject(getFindRequest());
      expect(JSON.parse(payload).message).toBe('Test error');
      expect(statusCode).toBe(500);
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
