/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deleteRulesRoute } from './delete_rules_route';

import {
  getFindResult,
  getResult,
  getDeleteRequest,
  getFindResultWithSingleHit,
  getDeleteRequestById,
  getFindResultStatus,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock } from '../__mocks__';

describe('delete_rules', () => {
  let { getRoute, router, response } = serverMock.create();
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    ({ router, getRoute, response } = serverMock.create());
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());

    deleteRulesRoute(router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId', async () => {
      await getRoute().handler(context, getDeleteRequest(), response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id', async () => {
      clients.alertsClient.get.mockResolvedValue(getResult());
      await getRoute().handler(context, getDeleteRequestById(), response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      await getRoute().handler(context, getDeleteRequest(), response);

      expect(response.customError).toHaveBeenCalledWith({
        body: 'rule_id: "rule-1" not found',
        statusCode: 404,
      });
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      await getRoute().handler(context, getDeleteRequest(), response);

      expect(response.notFound).toHaveBeenCalled();
    });
  });

  describe('request validation', () => {
    test('rejects a request with no id', async () => {
      const query = {};
      // @ts-ignore ambiguous validation types
      getRoute().config.validate.query(query, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
