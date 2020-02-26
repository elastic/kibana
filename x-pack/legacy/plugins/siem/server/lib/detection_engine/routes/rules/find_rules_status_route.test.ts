/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFindResultStatus, ruleStatusRequest } from '../__mocks__/request_responses';
import { serverMock, requestContextMock, responseMock } from '../__mocks__';
import { findRulesStatusesRoute } from './find_rules_status_route';

describe('find_statuses', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus()); // successful status search

    findRulesStatusesRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when finding a single rule status with a valid alertsClient', async () => {
      const response = await server.inject(ruleStatusRequest(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(ruleStatusRequest(), context);
      expect(response.notFound).toHaveBeenCalled();
    });

    test('catch error when status search throws error', async () => {
      clients.savedObjectsClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(ruleStatusRequest(), context);
      expect(response.customError).toHaveBeenCalledWith({
        body: 'Test error',
        statusCode: 500,
      });
    });
  });

  describe('request validation', () => {
    test('disallows id query param', async () => {
      const response = responseMock.create();
      const query = { id: ['someId'] };
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.query(query, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
