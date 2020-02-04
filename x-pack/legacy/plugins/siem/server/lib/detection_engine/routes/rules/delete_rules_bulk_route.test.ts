/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from '../__mocks__/_mock_server';

import { ServerInjectOptions } from 'hapi';
import {
  getFindResult,
  getResult,
  getFindResultWithSingleHit,
  getDeleteBulkRequest,
  getDeleteBulkRequestById,
  getDeleteAsPostBulkRequest,
  getDeleteAsPostBulkRequestById,
  getFindResultStatus,
} from '../__mocks__/request_responses';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

import { deleteRulesBulkRoute } from './delete_rules_bulk_route';
import { BulkError } from '../utils';

describe('delete_rules', () => {
  let { services, inject, alertsClient, savedObjectsClient } = createMockServer();

  beforeEach(() => {
    ({ services, inject, alertsClient, savedObjectsClient } = createMockServer());
    deleteRulesBulkRoute(services);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const { statusCode } = await inject(getDeleteBulkRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId using POST', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const { statusCode } = await inject(getDeleteAsPostBulkRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const { statusCode } = await inject(getDeleteBulkRequestById());
      expect(statusCode).toBe(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id using POST', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const { statusCode } = await inject(getDeleteAsPostBulkRequestById());
      expect(statusCode).toBe(200);
    });

    test('returns 200 because the error is in the payload when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const { statusCode } = await inject(getDeleteBulkRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 in the payload when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      savedObjectsClient.delete.mockResolvedValue({});
      const { payload } = await inject(getDeleteBulkRequest());
      const parsed: BulkError[] = JSON.parse(payload);
      const expected: BulkError[] = [
        {
          error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
          rule_id: 'rule-1',
        },
      ];
      expect(parsed).toEqual(expected);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { services: _services, inject: _inject } = createMockServer(false);
      deleteRulesBulkRoute(_services);
      const { statusCode } = await _inject(getDeleteBulkRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 400 if given a non-existent id in the payload', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const request: ServerInjectOptions = {
        method: 'DELETE',
        url: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
      };
      const { statusCode } = await inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
