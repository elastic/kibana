/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { findRulesRoute } from './find_rules_route';

import {
  getResult,
  getFindRequest,
  getFindResultWithSingleHit,
  getFindResultStatus,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, responseMock } from '../__mocks__';

describe('find_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.alertsClient.get.mockResolvedValue(getResult());
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());

    findRulesRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when finding a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getFindRequest(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(getFindRequest(), context);
      expect(response.notFound).toHaveBeenCalled();
    });

    test.skip('catches error if transformation fails', async () => {
      // @ts-ignore
      clients.alertsClient.create.mockResolvedValue(null);
      const response = await server.inject(getFindRequest(), context);
      expect(response.internalError).toHaveBeenCalledWith({
        body: 'Internal error transforming rules',
      });
    });

    test('catches error if search throws error', async () => {
      clients.alertsClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getFindRequest(), context);
      expect(response.customError).toHaveBeenCalledWith({
        body: 'Test error',
        statusCode: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows optional query params', async () => {
      const response = responseMock.create();
      const query = {
        page: 2,
        per_page: 20,
        sort_field: 'timestamp',
        fields: ['field1', 'field2'],
      };
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.query(query, response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('disallows unknown query params', async () => {
      const response = responseMock.create();
      const query = { invalid_value: 500 };
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.query(query, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
