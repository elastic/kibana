/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { readRulesRoute } from './read_rules_route';
import {
  getFindResult,
  getReadRequest,
  getFindResultWithSingleHit,
  getFindResultStatus,
} from '../__mocks__/request_responses';
import { requestMock, requestContextMock, serverMock } from '../__mocks__';

describe('read_signals', () => {
  let { getRoute, router, response } = serverMock.create();
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    ({ router, getRoute, response } = serverMock.create());
    ({ clients, context } = requestContextMock.createTools());

    readRulesRoute(router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when reading a single rule with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { handler } = getRoute();
      await handler(context, getReadRequest(), response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const { handler } = getRoute();
      await handler(context, getReadRequest(), response);

      expect(response.notFound).toHaveBeenCalled();
    });
  });

  describe('data validation', () => {
    test('returns 404 if given a non-existent id', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_URL,
        query: { rule_id: 'DNE_RULE' },
      });
      const { handler } = getRoute();
      await handler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'rule_id: "DNE_RULE" not found',
          statusCode: 404,
        })
      );
    });
  });
});
