/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRulesRoute } from './create_rules_route';

import {
  getEmptyFindResult,
  getResult,
  getCreateRequest,
  typicalPayload,
  getFindResultStatus,
  getNonEmptyIndex,
  getEmptyIndex,
  getFindResultWithSingleHit,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, responseMock } from '../__mocks__';

describe('create_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex()); // index exists
    clients.alertsClient.find.mockResolvedValue(getEmptyFindResult()); // no current rules
    clients.alertsClient.create.mockResolvedValue(getResult()); // creation succeeds
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus()); // needed to transform

    createRulesRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getCreateRequest(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(getCreateRequest(), context);
      expect(response.notFound).toHaveBeenCalled();
    });
  });

  describe('unhappy paths', () => {
    test('it returns a 400 if the index does not exist', async () => {
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptyIndex());
      const response = await server.inject(getCreateRequest(), context);

      expect(response.badRequest).toHaveBeenCalledWith({
        body: 'To create a rule, the index must exist first. Index .siem-signals does not exist',
      });
    });

    test('returns a duplicate error if rule_id already exists', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const response = await server.inject(getCreateRequest(), context);
      expect(response.conflict).toHaveBeenCalledWith({
        body: expect.stringContaining('already exists'),
      });
    });

    test('catches error if creation throws', async () => {
      clients.alertsClient.create.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getCreateRequest(), context);
      expect(response.customError).toHaveBeenCalledWith({
        body: 'Test error',
        statusCode: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows rule type of query', async () => {
      const body = { ...typicalPayload(), type: 'query' };
      const response = responseMock.create();
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('disallows unknown rule type', async () => {
      const body = { ...typicalPayload(), type: 'unexpected_type' };
      const response = responseMock.create();
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
