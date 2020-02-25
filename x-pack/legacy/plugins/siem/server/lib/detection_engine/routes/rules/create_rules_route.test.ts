/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRulesRoute } from './create_rules_route';

import {
  getFindResult,
  getResult,
  getCreateRequest,
  typicalPayload,
  getFindResultStatus,
  getNonEmptyIndex,
  getEmptyIndex,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock } from '../__mocks__';

describe('create_rules', () => {
  let { getRoute, router, response } = serverMock.create();
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    ({ router, getRoute, response } = serverMock.create());
    ({ clients, context } = requestContextMock.createTools());

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex());
    clients.alertsClient.find.mockResolvedValue(getFindResult());
    clients.alertsClient.create.mockResolvedValue(getResult());
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());

    createRulesRoute(router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a single rule with a valid actionClient and alertClient', async () => {
      const { handler } = getRoute();
      await handler(context, getCreateRequest(), response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const { handler } = getRoute();
      await handler(context, getCreateRequest(), response);

      expect(response.notFound).toHaveBeenCalled();
    });

    test('it returns a 400 if the index does not exist', async () => {
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptyIndex());
      const { handler } = getRoute();
      await handler(context, getCreateRequest(), response);

      expect(response.badRequest).toHaveBeenCalledWith({
        body: 'To create a rule, the index must exist first. Index .siem-signals does not exist',
      });
    });
  });

  describe('request validation', () => {
    test('allows rule type of query', async () => {
      const body = { ...typicalPayload(), type: 'query' };
      // @ts-ignore ambiguous validation types
      getRoute().config.validate.body(body, response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('disallows unknown rule type', async () => {
      const body = { ...typicalPayload(), type: 'unexpected_type' };
      // @ts-ignore ambiguous validation types
      getRoute().config.validate.body(body, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
