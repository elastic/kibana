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
import { serverMock, requestContextMock, requestMock } from '../__mocks__';
import { updateRulesBulkRoute } from './update_rules_bulk_route';
import { BulkError } from '../utils';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

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
      expect(response.status).toEqual(200);
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

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expected);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(getUpdateBulkRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
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
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expected);
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const request = requestMock.create({
        method: 'put',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...typicalPayload(), rule_id: undefined }],
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        '"value" at position 0 fails because ["value" must contain at least one of [id, rule_id]]'
      );
    });

    test('allows query rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...typicalPayload(), type: 'query' }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        body: [{ ...typicalPayload(), type: 'unknown_type' }],
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        '"value" at position 0 fails because [child "type" fails because ["type" must be one of [query, saved_query]]]'
      );
    });
  });
});
