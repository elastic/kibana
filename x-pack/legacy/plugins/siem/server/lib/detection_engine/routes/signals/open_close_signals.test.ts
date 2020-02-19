/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerInjectOptions } from 'hapi';
import { DETECTION_ENGINE_SIGNALS_STATUS_URL } from '../../../../../common/constants';
import { setSignalsStatusRoute } from './open_close_signals_route';
import * as myUtils from '../utils';

import {
  getSetSignalStatusByIdsRequest,
  getSetSignalStatusByQueryRequest,
  typicalSetStatusSignalByIdsPayload,
  typicalSetStatusSignalByQueryPayload,
  setStatusSignalMissingIdsAndQueryPayload,
} from '../__mocks__/request_responses';
import { createMockServer, createMockConfig, clientsServiceMock } from '../__mocks__';

describe('set signal status', () => {
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
    jest.spyOn(myUtils, 'getIndex').mockReturnValue('fakeindex');

    server = createMockServer();
    config = createMockConfig();
    getClients = clientsServiceMock.createGetScoped();
    clients = clientsServiceMock.createClients();

    getClients.mockResolvedValue(clients);
    clients.clusterClient.callAsCurrentUser.mockResolvedValue(true);

    setSignalsStatusRoute(server.route, config, getClients);
  });

  describe('status on signal', () => {
    test('returns 200 when setting a status on a signal by ids', async () => {
      const { statusCode } = await server.inject(getSetSignalStatusByIdsRequest());
      expect(statusCode).toBe(200);
      expect(myUtils.getIndex).toHaveReturnedWith('fakeindex');
    });

    test('returns 200 when setting a status on a signal by query', async () => {
      const { statusCode } = await server.inject(getSetSignalStatusByQueryRequest());
      expect(statusCode).toBe(200);
    });

    test('catches error if callAsCurrentUser throws error', async () => {
      clients.clusterClient.callAsCurrentUser.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const { payload, statusCode } = await server.inject(getSetSignalStatusByQueryRequest());
      expect(JSON.parse(payload).message).toBe('Test error');
      expect(statusCode).toBe(500);
    });
  });

  describe('validation', () => {
    test('returns 200 if signal_ids and status are present', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: typicalSetStatusSignalByIdsPayload(),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 200 if query and status are present', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: typicalSetStatusSignalByQueryPayload(),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if signal_ids and query are not present', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: setStatusSignalMissingIdsAndQueryPayload(),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 400 if signal_ids are present but status is not', async () => {
      const { status, ...justIds } = typicalSetStatusSignalByIdsPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: justIds,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 400 if query is present but status is not', async () => {
      const { status, ...justTheQuery } = typicalSetStatusSignalByQueryPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: justTheQuery,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });

    test('returns 400 if query and signal_ids are present but status is not', async () => {
      const allTogether = {
        ...typicalSetStatusSignalByIdsPayload(),
        ...typicalSetStatusSignalByQueryPayload(),
      };
      const { status, ...queryAndSignalIdsNoStatus } = allTogether;
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_SIGNALS_STATUS_URL,
        payload: queryAndSignalIdsNoStatus,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
