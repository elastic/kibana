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

import { deleteRulesRoute } from './delete_rules_route';
import { ServerInjectOptions } from 'hapi';
import {
  getFindResult,
  getResult,
  getDeleteRequest,
  getFindResultWithSingleHit,
  getDeleteRequestById,
} from '../__mocks__/request_responses';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

describe('delete_rules', () => {
  let { server, alertsClient } = createMockServer();

  beforeEach(() => {
    ({ server, alertsClient } = createMockServer());
    deleteRulesRoute(server);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by alertId', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const { statusCode } = await server.inject(getDeleteRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 200 when deleting a single rule with a valid actionClient and alertClient by id', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const { statusCode } = await server.inject(getDeleteRequestById());
      expect(statusCode).toBe(200);
    });

    test('returns 404 when deleting a single rule that does not exist with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const { statusCode } = await server.inject(getDeleteRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      deleteRulesRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(getDeleteRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      deleteRulesRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(getDeleteRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      deleteRulesRoute(serverWithoutActionOrAlertClient);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(getDeleteRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 400 if given a non-existent id', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const request: ServerInjectOptions = {
        method: 'DELETE',
        url: DETECTION_ENGINE_RULES_URL,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
