/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerInjectOptions } from 'hapi';
import { patchRulesRoute } from './patch_rules_route';
import { omit } from 'lodash/fp';

import {
  getFindResult,
  getResult,
  updateActionResult,
  typicalPayload,
  getFindResultWithSingleHit,
  getPatchBulkRequest,
} from '../__mocks__/request_responses';
import { createMockServer, clientsServiceMock } from '../__mocks__';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { patchRulesBulkRoute } from './patch_rules_bulk_route';
import { BulkError } from '../utils';

describe('patch_rules_bulk', () => {
  let server = createMockServer();
  let getClients = clientsServiceMock.createGetScoped();
  let clients = clientsServiceMock.createClients();

  beforeEach(() => {
    jest.resetAllMocks();

    server = createMockServer();
    getClients = clientsServiceMock.createGetScoped();
    clients = clientsServiceMock.createClients();

    getClients.mockResolvedValue(clients);
    patchRulesBulkRoute(server.route, getClients);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
      const { statusCode } = await server.inject(getPatchBulkRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 200 as a response when updating a single rule that does not exist', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
      const { statusCode } = await server.inject(getPatchBulkRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 within the payload when updating a single rule that does not exist', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
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
      getClients.mockResolvedValue(omit('alertsClient', clients));
      const { route, inject } = createMockServer();
      patchRulesRoute(route, getClients);
      const { statusCode } = await inject(getPatchBulkRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 400 if id is not given in either the body or the url', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
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
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
      const request: ServerInjectOptions = {
        method: 'PATCH',
        url: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        payload: [typicalPayload()],
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toEqual(200);
    });

    test('returns 404 in the payload if the record does not exist yet', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
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
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
      const request: ServerInjectOptions = {
        method: 'PATCH',
        url: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
        payload: [typicalPayload()],
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if type is not filter or kql', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
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
