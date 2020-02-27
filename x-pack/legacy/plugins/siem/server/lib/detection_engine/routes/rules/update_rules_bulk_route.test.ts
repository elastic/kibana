/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getEmptyFindResult,
  getResult,
  typicalPayload,
  getFindResultWithSingleHit,
  getUpdateBulkRequest,
  getFindResultStatus,
} from '../__mocks__/request_responses';
import { serverMock, requestContextMock, responseMock } from '../__mocks__';
import { updateRulesBulkRoute } from './update_rules_bulk_route';
import { BulkError } from '../utils';

describe('update_rules_bulk', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.alertsClient.update.mockResolvedValue(getResult());
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());

    updateRulesBulkRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getUpdateBulkRequest(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 200 as a response when updating a single rule that does not exist', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const expected: BulkError[] = [
        {
          error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
          rule_id: 'rule-1',
        },
      ];
      const response = await server.inject(getUpdateBulkRequest(), context);

      expect(response.ok).toHaveBeenCalledWith({
        body: expected,
      });
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(getUpdateBulkRequest(), context);
      expect(response.notFound).toHaveBeenCalled();
    });

    test('returns an error if update throws', async () => {
      clients.alertsClient.update.mockImplementation(() => {
        throw new Error('Test error');
      });

      const expected: BulkError[] = [
        {
          error: { message: 'Test error', status_code: 500 },
          rule_id: 'rule-1',
        },
      ];
      const response = await server.inject(getUpdateBulkRequest(), context);
      expect(response.ok).toHaveBeenCalledWith({ body: expected });
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const response = responseMock.create();
      const { rule_id, ...body } = typicalPayload();
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body([body], response);

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
