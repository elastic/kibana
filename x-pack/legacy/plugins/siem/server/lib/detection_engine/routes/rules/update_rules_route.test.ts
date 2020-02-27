/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerInjectOptions } from 'hapi';
import { omit } from 'lodash/fp';

import * as utils from './utils';
import * as updateRules from '../../rules/update_rules';

import { updateRulesRoute } from './update_rules_route';
import {
  getFindResult,
  getFindResultStatus,
  getResult,
  updateActionResult,
  getUpdateRequest,
  typicalPayload,
  getFindResultWithSingleHit,
} from '../__mocks__/request_responses';
import { createMockServer, createMockConfig, clientsServiceMock } from '../__mocks__';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

describe('update_rules', () => {
  let server = createMockServer();
  let config = createMockConfig();
  let getClients = clientsServiceMock.createGetScoped();
  let clients = clientsServiceMock.createClients();

  beforeEach(() => {
    // jest carries state between mocked implementations when using
    // spyOn. So now we're doing all three of these.
    // https://github.com/facebook/jest/issues/7136#issuecomment-565976599
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();

    server = createMockServer();
    config = createMockConfig();
    getClients = clientsServiceMock.createGetScoped();
    clients = clientsServiceMock.createClients();

    getClients.mockResolvedValue(clients);
    updateRulesRoute(server.route, config, getClients);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { statusCode } = await server.inject(getUpdateRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 when updating a single rule that does not exist', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { statusCode } = await server.inject(getUpdateRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      getClients.mockResolvedValue(omit('alertsClient', clients));
      const { route, inject } = createMockServer();
      updateRulesRoute(route, config, getClients);
      const { statusCode } = await inject(getUpdateRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 500 when transform fails', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      jest.spyOn(utils, 'transform').mockReturnValue(null);
      const { payload, statusCode } = await server.inject(getUpdateRequest());
      expect(JSON.parse(payload).message).toBe('Internal error transforming');
      expect(statusCode).toBe(500);
    });

    test('catches error if readRules throws error', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      jest.spyOn(updateRules, 'updateRules').mockImplementation(async () => {
        throw new Error('Test error');
      });
      const { payload, statusCode } = await server.inject(getUpdateRequest());
      expect(JSON.parse(payload).message).toBe('Test error');
      expect(statusCode).toBe(500);
    });
  });

  describe('validation', () => {
    test('returns 400 if id is not given in either the body or the url', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
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
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const request: ServerInjectOptions = {
        method: 'PUT',
        url: DETECTION_ENGINE_RULES_URL,
        payload: typicalPayload(),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(404);
    });

    test('returns 200 if type is query', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const request: ServerInjectOptions = {
        method: 'PUT',
        url: DETECTION_ENGINE_RULES_URL,
        payload: typicalPayload(),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if type is not filter or kql', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.update.mockResolvedValue(updateActionResult());
      clients.alertsClient.update.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
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
