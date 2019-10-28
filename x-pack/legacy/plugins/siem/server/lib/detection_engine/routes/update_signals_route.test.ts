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

import { updateSignalsRoute } from './update_signals_route';
import { ServerInjectOptions } from 'hapi';
import {
  getFindResult,
  getResult,
  updateActionResult,
  updateAlertResult,
  getUpdateRequest,
  typicalPayload,
} from './__mocks__/request_responses';

describe('update_signals', () => {
  let { server, alertsClient, actionsClient } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    ({ server, alertsClient, actionsClient } = createMockServer());
    updateSignalsRoute(server);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single signal with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(updateAlertResult());
      const { statusCode } = await server.inject(getUpdateRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      updateSignalsRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(getUpdateRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      updateSignalsRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(getUpdateRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      updateSignalsRoute(serverWithoutActionOrAlertClient);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(getUpdateRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 400 if id is not given in either the body or the url', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      const { id, ...noId } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'PUT',
        url: '/api/siem/signals',
        payload: {
          payload: noId,
        },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 200 if type is query', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(updateAlertResult());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'PUT',
        url: '/api/siem/signals',
        payload: {
          ...noType,
          type: 'query',
        },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 200 if type is filter', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(updateAlertResult());
      const { language, query, type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'PUT',
        url: '/api/siem/signals',
        payload: {
          ...noType,
          type: 'filter',
        },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if type is not filter or kql', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(updateAlertResult());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'PUT',
        url: '/api/siem/signals',
        payload: {
          ...noType,
          type: 'something-made-up',
        },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 200 if id is given in the url but not the payload', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.update.mockResolvedValue(updateActionResult());
      alertsClient.update.mockResolvedValue(updateAlertResult());
      // missing id should throw a 400
      const { id, ...noId } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'PUT',
        url: '/api/siem/signals/rule-1',
        payload: noId,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });
  });
});
