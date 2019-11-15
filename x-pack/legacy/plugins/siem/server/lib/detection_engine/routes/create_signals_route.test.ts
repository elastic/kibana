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
import { createSignalsRoute } from './create_signals_route';
import { ServerInjectOptions } from 'hapi';
import {
  getFindResult,
  getResult,
  createActionResult,
  createAlertResult,
  getCreateRequest,
  typicalPayload,
} from './__mocks__/request_responses';

describe('create_signals', () => {
  let { server, alertsClient, actionsClient } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    ({ server, alertsClient, actionsClient } = createMockServer());
    createSignalsRoute(server);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a single signal with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(createAlertResult());
      const { statusCode } = await server.inject(getCreateRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      createSignalsRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(getCreateRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      createSignalsRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(getCreateRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      createSignalsRoute(serverWithoutActionOrAlertClient);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(getCreateRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 200 if id is not given as the id is auto generated from the alert framework', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(createAlertResult());
      // missing id should return 200 as it will be auto generated if not given
      const { rule_id, ...noId } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: '/api/siem/signals',
        payload: noId,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 200 if type is query', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(createAlertResult());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
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
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(createAlertResult());
      // Cannot type request with a ServerInjectOptions as the type system complains
      // about the property filter involving Hapi types, so I left it off for now
      const { language, query, type, ...noType } = typicalPayload();
      const request = {
        method: 'POST',
        url: '/api/siem/signals',
        payload: {
          ...noType,
          type: 'filter',
          filter: {},
        },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if type is not filter or kql', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(createAlertResult());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: '/api/siem/signals',
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
