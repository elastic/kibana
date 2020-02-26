/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getDeleteBulkRequest,
  getDeleteBulkRequestById,
  getDeleteAsPostBulkRequest,
  getDeleteAsPostBulkRequestById,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, responseMock } from '../__mocks__';

import { deleteRulesBulkRoute } from './delete_rules_bulk_route';

describe('delete_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

    deleteRulesBulkRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId', async () => {
      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('resturns 200 when deleting a single rule and related rule status', async () => {
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      clients.savedObjectsClient.delete.mockResolvedValue(true);
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.alertsClient.delete.mockResolvedValue({});
      const { statusCode } = await server.inject(getDeleteBulkRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId using POST', async () => {
      const response = await server.inject(getDeleteAsPostBulkRequest(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id', async () => {
      const response = await server.inject(getDeleteBulkRequestById(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id using POST', async () => {
      const response = await server.inject(getDeleteAsPostBulkRequestById(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 200 because the error is in the payload when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 in the payload when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());

      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.ok).toHaveBeenCalledWith({
        body: expect.arrayContaining([
          {
            error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
            rule_id: 'rule-1',
          },
        ]),
      });
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.notFound).toHaveBeenCalled();
    });
  });

  describe('request validation', () => {
    test('rejects requests without IDs', async () => {
      const body = [{}];
      const response = responseMock.create();
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
