/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { requestContextMock, serverMock } from '../__mocks__';

import { findRulesRoute } from './find_rules_route';

import {
  getResult,
  getFindRequest,
  getFindResultWithSingleHit,
  getFindResultStatus,
} from '../__mocks__/request_responses';

describe('find_rules', () => {
  let { getRoute, router, response } = serverMock.create();
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    ({ getRoute, router, response } = serverMock.create());
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.alertsClient.get.mockResolvedValue(getResult());
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());

    findRulesRoute(router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when finding a single rule with a valid actionClient and alertClient', async () => {
      await getRoute().handler(context, getFindRequest(), response);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      await getRoute().handler(context, getFindRequest(), response);
      expect(response.notFound).toHaveBeenCalled();
    });
  });

  describe('request validation', () => {
    test('allows optional query params', async () => {
      const query = {
        page: 2,
        per_page: 20,
        sort_field: 'timestamp',
        fields: ['field1', 'field2'],
      };
      // @ts-ignore ambiguous validation types
      getRoute().config.validate.query(query, response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('disallows unknown query params', async () => {
      const query = { invalid_value: 500 };
      // @ts-ignore ambiguous validation types
      getRoute().config.validate.query(query, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
