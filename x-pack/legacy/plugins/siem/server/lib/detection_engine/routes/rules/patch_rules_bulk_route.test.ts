/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getEmptyFindResult,
  typicalPayload,
  getFindResultWithSingleHit,
  getPatchBulkRequest,
  getResult,
} from '../__mocks__/request_responses';
import { serverMock, requestContextMock, responseMock } from '../__mocks__';
import { patchRulesBulkRoute } from './patch_rules_bulk_route';

describe('patch_rules_bulk', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit()); // rule exists
    clients.alertsClient.update.mockResolvedValue(getResult()); // update succeeds

    patchRulesBulkRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getPatchBulkRequest(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns an error in the response when updating a single rule that does not exist', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getPatchBulkRequest(), context);
      expect(response.ok).toHaveBeenCalledWith({
        body: [
          {
            error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
            rule_id: 'rule-1',
          },
        ],
      });
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(getPatchBulkRequest(), context);
      expect(response.notFound).toHaveBeenCalled();
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const response = responseMock.create();
      const body = [{ ...typicalPayload(), rule_id: undefined }];
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.badRequest).toHaveBeenCalled();
    });

    test('allows query rule type', async () => {
      const response = responseMock.create();
      const body = [{ ...typicalPayload(), type: 'query' }];
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const response = responseMock.create();
      const body = [{ ...typicalPayload(), type: 'oh hi' }];
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
