/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deleteRulesRoute } from './delete_rules_route';

import {
  getEmptyFindResult,
  getResult,
  getDeleteRequest,
  getFindResultWithSingleHit,
  getDeleteRequestById,
  getFindResultStatus,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, responseMock } from '../__mocks__';

describe('delete_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());

    deleteRulesRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId', async () => {
      const response = await server.inject(getDeleteRequest(), context);

      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id', async () => {
      clients.alertsClient.get.mockResolvedValue(getResult());
      const response = await server.inject(getDeleteRequestById(), context);

      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getDeleteRequest(), context);

      expect(response.customError).toHaveBeenCalledWith({
        body: 'rule_id: "rule-1" not found',
        statusCode: 404,
      });
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(getDeleteRequest(), context);

      expect(response.notFound).toHaveBeenCalled();
    });
  });

  describe('request validation', () => {
    test('rejects a request with no id', async () => {
      const query = {};
      const response = responseMock.create();
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.query(query, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
