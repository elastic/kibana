/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateRulesRoute } from './update_rules_route';
import {
  getEmptyFindResult,
  getResult,
  getUpdateRequest,
  typicalPayload,
  getFindResultWithSingleHit,
  getFindResultStatusEmpty,
  nonRuleFindResult,
} from '../__mocks__/request_responses';
import { requestContextMock, responseMock, serverMock } from '../__mocks__';

describe('update_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit()); // rule exists
    clients.alertsClient.update.mockResolvedValue(getResult()); // successful update
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatusEmpty()); // successful transform

    updateRulesRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getUpdateRequest(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 when updating a single rule that does not exist', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getUpdateRequest(), context);

      expect(response.customError).toHaveBeenCalledWith({
        body: expect.stringMatching(/rule_id.*not found/),
        statusCode: 404,
      });
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(getUpdateRequest(), context);

      expect(response.notFound).toHaveBeenCalled();
    });

    test('returns error when updating non-rule', async () => {
      clients.alertsClient.find.mockResolvedValue(nonRuleFindResult());
      const response = await server.inject(getUpdateRequest(), context);

      expect(response.customError).toHaveBeenCalledWith({
        body: expect.stringMatching(/rule_id.*not found/),
        statusCode: 404,
      });
    });

    test('catches error if search throws error', async () => {
      clients.alertsClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getUpdateRequest(), context);
      expect(response.customError).toHaveBeenCalledWith({
        body: 'Test error',
        statusCode: 500,
      });
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const response = responseMock.create();
      const body = { ...typicalPayload(), rule_id: undefined };
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
