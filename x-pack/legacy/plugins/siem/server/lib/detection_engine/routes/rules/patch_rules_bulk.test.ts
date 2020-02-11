/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createMockServer,
  createMockServerWithoutAlertClientDecoration,
} from '../__mocks__/_mock_server';

import { patchRulesRoute } from './patch_rules_route';
import { ServerInjectOptions } from 'hapi';

import {
  getFindResult,
  getResult,
  updateActionResult,
  typicalPayload,
  getFindResultWithSingleHit,
  getPatchBulkRequest,
} from '../__mocks__/request_responses';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { patchRulesBulkRoute } from './patch_rules_bulk_route';
import { BulkError } from '../utils';

describe('patch_rules_bulk', () => {
  let { server, alertsClient, actionsClient } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    ({ server, alertsClient, actionsClient } = createMockServer());
    patchRulesBulkRoute(server);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      const { statusCode } = await server.inject(getPatchBulkRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 200 as a response when updating a single rule that does not exist', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      const { statusCode } = await server.inject(getPatchBulkRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 within the payload when updating a single rule that does not exist', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      const { payload } = await server.inject(getPatchBulkRequest());
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
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      patchRulesRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(getPatchBulkRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 400 if id is not given in either the body or the url', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      const { rule_id, ...noId } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'PATCH',
        url: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        payload: [noId],
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns errors as 200 to just indicate ok something happened', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      const request: ServerInjectOptions = {
        method: 'PATCH',
        url: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        payload: [typicalPayload()],
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toEqual(200);
    });

    test('returns 404 in the payload if the record does not exist yet', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      const request: ServerInjectOptions = {
        method: 'PATCH',
        url: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        payload: [typicalPayload()],
      };
      const { payload } = await server.inject(request);
      const parsed: BulkError[] = JSON.parse(payload);
      const expected: BulkError[] = [
        {
          error: { message: 'rule_id: "rule-1" not found', status_code: 404 },
          rule_id: 'rule-1',
        },
      ];
      expect(parsed).toEqual(expected);
    });

    test('returns 200 if type is query', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      const request: ServerInjectOptions = {
        method: 'PATCH',
        url: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        payload: [typicalPayload()],
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if type is not filter or kql', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'PATCH',
        url: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        payload: [
          {
            ...noType,
            type: 'something-made-up',
          },
        ],
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
