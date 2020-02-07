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
import { createMockServer } from '../__mocks__/_mock_server';
import { createMockConfig } from '../__mocks__/_mock_config';
import { createMockClients } from '../__mocks__/_mock_clients';

describe('create_rules', () => {
  let { route, inject } = createMockServer();
  let mockConfig = createMockConfig();
  let { getClients, clients } = createMockClients();

  beforeEach(() => {
    jest.resetAllMocks();

    ({ route, inject } = createMockServer());
    mockConfig = createMockConfig();
    ({ getClients, clients } = createMockClients());

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex());
    createRulesRoute(route, mockConfig, getClients);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a single rule with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { statusCode } = await inject(getCreateRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      getClients.mockResolvedValue(omit('alertsClient', clients));
      const newServer = createMockServer();
      createRulesRoute(newServer.route, mockConfig, getClients);
      const { statusCode } = await newServer.inject(getCreateRequest());
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
      const { payload } = await inject(getCreateRequest());
      expect(JSON.parse(payload)).toEqual({
        error: 'Bad Request',
        message: 'To create a rule, the index must exist first. Index .siem-signals does not exist',
        statusCode: 400,
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
      const { statusCode } = await inject(request);
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
      const { statusCode } = await inject(request);
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
      const { statusCode } = await inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
