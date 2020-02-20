/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerInjectOptions } from 'hapi';
import { omit } from 'lodash/fp';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { createRulesRoute } from './create_rules_route';

import {
  getFindResult,
  getResult,
  createActionResult,
  getCreateRequest,
  typicalPayload,
  getFindResultStatus,
  getNonEmptyIndex,
  getEmptyIndex,
} from '../__mocks__/request_responses';
import { createMockServer, createMockConfig, clientsServiceMock } from '../__mocks__';

describe('create_rules', () => {
  let server = createMockServer();
  let config = createMockConfig();
  let getClients = clientsServiceMock.createGetScoped();
  let clients = clientsServiceMock.createClients();

  beforeEach(() => {
    jest.resetAllMocks();

    server = createMockServer();
    config = createMockConfig();
    getClients = clientsServiceMock.createGetScoped();
    clients = clientsServiceMock.createClients();

    getClients.mockResolvedValue(clients);
    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex());

    createRulesRoute(server.route, config, getClients);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a single rule with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { statusCode } = await server.inject(getCreateRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      getClients.mockResolvedValue(omit('alertsClient', clients));
      const { route, inject } = createMockServer();
      createRulesRoute(route, config, getClients);
      const { statusCode } = await inject(getCreateRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('it returns a 400 if the index does not exist', async () => {
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptyIndex());
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      const { payload } = await server.inject(getCreateRequest());
      expect(JSON.parse(payload)).toEqual({
        message: 'To create a rule, the index must exist first. Index .siem-signals does not exist',
        status_code: 400,
      });
    });

    test('returns 200 if rule_id is not given as the id is auto generated from the alert framework', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      // missing rule_id should return 200 as it will be auto generated if not given
      const { rule_id, ...noRuleId } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_RULES_URL,
        payload: noRuleId,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 200 if type is query', async () => {
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_RULES_URL,
        payload: {
          ...noType,
          type: 'query',
        },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if type is not filter or kql', async () => {
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
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
