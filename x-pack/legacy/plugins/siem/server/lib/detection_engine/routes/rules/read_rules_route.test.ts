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

import { readRulesRoute } from './read_rules_route';
import { ServerInjectOptions } from 'hapi';

import {
  getFindResult,
  getResult,
  getReadRequest,
  getFindResultWithSingleHit,
  getFindResultStatus,
} from '../__mocks__/request_responses';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

describe('read_signals', () => {
  let { server, alertsClient, savedObjectsClient } = createMockServer();

  beforeEach(() => {
    ({ server, alertsClient, savedObjectsClient } = createMockServer());
    readRulesRoute(server);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when reading a single rule with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { statusCode } = await server.inject(getReadRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      readRulesRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(getReadRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      readRulesRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(getReadRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      readRulesRoute(serverWithoutActionOrAlertClient);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(getReadRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 400 if given a non-existent id', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const request: ServerInjectOptions = {
        method: 'GET',
        url: DETECTION_ENGINE_RULES_URL,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
