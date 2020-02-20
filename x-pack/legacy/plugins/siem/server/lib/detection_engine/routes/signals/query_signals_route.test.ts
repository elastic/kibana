/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerInjectOptions } from 'hapi';

import { querySignalsRoute } from './query_signals_route';
import * as myUtils from '../utils';
import {
  getSignalsQueryRequest,
  getSignalsAggsQueryRequest,
  typicalSignalsQuery,
  typicalSignalsQueryAggs,
} from '../__mocks__/request_responses';
import { createMockServer, createMockConfig, clientsServiceMock } from '../__mocks__';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../common/constants';

describe('query for signal', () => {
  let server = createMockServer();
  let config = createMockConfig();
  let getClients = clientsServiceMock.createGetScoped();
  let clients = clientsServiceMock.createClients();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(myUtils, 'getIndex').mockReturnValue('fakeindex');

    server = createMockServer();
    config = createMockConfig();
    getClients = clientsServiceMock.createGetScoped();
    clients = clientsServiceMock.createClients();

    getClients.mockResolvedValue(clients);
    clients.clusterClient.callAsCurrentUser.mockResolvedValue(true);

    querySignalsRoute(server.route, config, getClients);
  });

  describe('query and agg on signals index', () => {
    test('returns 200 when using single query', async () => {
      const { statusCode } = await server.inject(getSignalsQueryRequest());

      expect(statusCode).toBe(200);
      expect(clients.clusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({ body: typicalSignalsQuery() })
      );
      expect(myUtils.getIndex).toHaveReturnedWith('fakeindex');
    });

    test('returns 200 when using single agg', async () => {
      const { statusCode } = await server.inject(getSignalsAggsQueryRequest());

      expect(statusCode).toBe(200);
      expect(clients.clusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({ body: typicalSignalsQueryAggs() })
      );
      expect(myUtils.getIndex).toHaveReturnedWith('fakeindex');
    });

    test('returns 200 when using aggs and query together', async () => {
      const request = getSignalsQueryRequest();
      request.payload = { ...typicalSignalsQueryAggs(), ...typicalSignalsQuery() };
      const { statusCode } = await server.inject(request);

      expect(statusCode).toBe(200);
      expect(clients.clusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({
          body: {
            ...typicalSignalsQuery(),
            ...typicalSignalsQueryAggs(),
          },
        })
      );
      expect(myUtils.getIndex).toHaveReturnedWith('fakeindex');
    });

    test('returns 400 when missing aggs and query', async () => {
      const allTogether = getSignalsQueryRequest();
      allTogether.payload = {};
      const { statusCode } = await server.inject(allTogether);
      expect(statusCode).toBe(400);
    });
  });

  describe('validation', () => {
    test('returns 200 if query present', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        payload: typicalSignalsQuery(),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 200 if aggs is present', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        payload: typicalSignalsQueryAggs(),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 200 if aggs and query are present', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        payload: { ...typicalSignalsQueryAggs(), ...typicalSignalsQuery() },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if aggs and query are NOT present', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        payload: {},
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
