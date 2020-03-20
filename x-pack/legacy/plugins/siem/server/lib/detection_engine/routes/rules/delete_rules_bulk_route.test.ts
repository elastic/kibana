/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getDeleteBulkRequest,
  getDeleteBulkRequestById,
  getDeleteAsPostBulkRequest,
  getDeleteAsPostBulkRequestById,
  getFindResultStatusEmpty,
  getFindResultStatus,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { deleteRulesBulkRoute } from './delete_rules_bulk_route';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../feature_flags';

describe('delete_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit()); // rule exists
    clients.alertsClient.delete.mockResolvedValue({}); // successful deletion
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatusEmpty()); // rule status request

    deleteRulesBulkRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId', async () => {
      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('resturns 200 when deleting a single rule and related rule status', async () => {
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId using POST', async () => {
      const response = await server.inject(getDeleteAsPostBulkRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id', async () => {
      const response = await server.inject(getDeleteBulkRequestById(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id using POST', async () => {
      const response = await server.inject(getDeleteAsPostBulkRequestById(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 200 because the error is in the payload when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 in the payload when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());

      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(
        expect.arrayContaining([
          {
            error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
            rule_id: 'rule-1',
          },
        ])
      );
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting!.getAlertsClient = jest.fn();
      const response = await server.inject(getDeleteBulkRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });
  });

  describe('request validation', () => {
    test('rejects requests without IDs', async () => {
      const request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
        body: [{}],
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        '"value" at position 0 fails because ["value" must contain at least one of [id, rule_id]]'
      );
    });
  });
});
