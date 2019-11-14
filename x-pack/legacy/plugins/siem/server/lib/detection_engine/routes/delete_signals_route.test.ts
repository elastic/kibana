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
} from './__mocks__/_mock_server';

import { deleteSignalsRoute } from './delete_signals_route';
import { ServerInjectOptions } from 'hapi';
import { getFindResult, getResult, getDeleteRequest } from './__mocks__/request_responses';

describe('delete_signals', () => {
  let { server, alertsClient } = createMockServer();

  beforeEach(() => {
    ({ server, alertsClient } = createMockServer());
    deleteSignalsRoute(server);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when deleting a single signal with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const { statusCode } = await server.inject(getDeleteRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      deleteSignalsRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(getDeleteRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      deleteSignalsRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(getDeleteRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      deleteSignalsRoute(serverWithoutActionOrAlertClient);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(getDeleteRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 404 if given a non-existent id', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      alertsClient.delete.mockResolvedValue({});
      const request: ServerInjectOptions = {
        method: 'DELETE',
        url: '/api/siem/signals',
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(404);
    });
  });
});
