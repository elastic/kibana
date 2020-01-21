/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createMockServer,
  createMockServerWithoutActionClientDecoration,
  createMockServerWithoutAlertClientDecoration,
  createMockServerWithoutActionOrAlertClientDecoration,
} from '../__mocks__/_mock_server';

import { updateRulesRoute } from './update_rules_route';
import { ServerInjectOptions } from 'hapi';

import {
  getFindResult,
  getFindResultStatus,
  getResult,
  updateActionResult,
  getUpdateRequest,
  typicalPayload,
  getFindResultWithSingleHit,
} from '../__mocks__/request_responses';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

describe('update_rules', () => {
  let { server, alertsClient, actionsClient, savedObjectsClient } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    ({ server, alertsClient, actionsClient, savedObjectsClient } = createMockServer());
    updateRulesRoute(server);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { statusCode } = await server.inject(getUpdateRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 when updating a single rule that does not exist', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { statusCode } = await server.inject(getUpdateRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      updateRulesRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(getUpdateRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      updateRulesRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(getUpdateRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      updateRulesRoute(serverWithoutActionOrAlertClient);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(getUpdateRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 400 if id is not given in either the body or the url', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { rule_id, ...noId } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'PUT',
        url: DETECTION_ENGINE_RULES_URL,
        payload: {
          payload: noId,
        },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 404 if the record does not exist yet', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const request: ServerInjectOptions = {
        method: 'PUT',
        url: DETECTION_ENGINE_RULES_URL,
        payload: typicalPayload(),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(404);
    });

    test('returns 200 if type is query', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const request: ServerInjectOptions = {
        method: 'PUT',
        url: DETECTION_ENGINE_RULES_URL,
        payload: typicalPayload(),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if type is not filter or kql', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'PUT',
        url: DETECTION_ENGINE_RULES_URL,
        payload: {
          ...noType,
          type: 'something-made-up',
        },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
