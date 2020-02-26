/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { patchRulesRoute } from './patch_rules_route';

import {
  getEmptyFindResult,
  getFindResultStatus,
  getResult,
  getPatchRequest,
  typicalPayload,
  getFindResultWithSingleHit,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, responseMock } from '../__mocks__';

describe('patch_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.alertsClient.update.mockResolvedValue(getResult());
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());

    patchRulesRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getPatchRequest(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 when updating a single rule that does not exist', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getPatchRequest(), context);
      expect(response.customError).toHaveBeenCalledWith({
        body: 'rule_id: "rule-1" not found',
        statusCode: 404,
      });
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(getPatchRequest(), context);
      expect(response.notFound).toHaveBeenCalled();
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const response = responseMock.create();
      const { rule_id, ...body } = typicalPayload();
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.badRequest).toHaveBeenCalled();
    });

    test('allows query rule type', async () => {
      const response = responseMock.create();
      const body = { ...typicalPayload(), type: 'query' };
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const response = responseMock.create();
      const body = { ...typicalPayload(), type: 'oh hi' };
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
