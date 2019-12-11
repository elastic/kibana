/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from '../__mocks__/_mock_server';
import { querySignalsRoute } from './query_signals_route';
import * as myUtils from '../utils';
import { ServerInjectOptions } from 'hapi';
import {
  getSignalsQueryRequest,
  getSignalsAggsQueryRequest,
  typicalSignalsQuery,
  typicalSignalsQueryAggs,
} from '../__mocks__/request_responses';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../common/constants';

describe('query for signal', () => {
  let { server, elasticsearch } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(myUtils, 'getIndex').mockReturnValue('fakeindex');
    ({ server, elasticsearch } = createMockServer());
    elasticsearch.getCluster = jest.fn(() => ({
      callWithRequest: jest.fn(() => true),
    }));
    querySignalsRoute(server);
  });

  describe('query and agg on signals index', () => {
    test('returns 200 when using single query', async () => {
      elasticsearch.getCluster = jest.fn(() => ({
        callWithRequest: jest.fn(
          (_req, _type: string, queryBody: { index: string; body: object }) => {
            expect(queryBody.body).toMatchObject({ ...typicalSignalsQueryAggs() });
            return true;
          }
        ),
      }));
      const { statusCode } = await server.inject(getSignalsAggsQueryRequest());
      expect(statusCode).toBe(200);
      expect(myUtils.getIndex).toHaveReturnedWith('fakeindex');
    });

    test('returns 200 when using single agg', async () => {
      elasticsearch.getCluster = jest.fn(() => ({
        callWithRequest: jest.fn(
          (_req, _type: string, queryBody: { index: string; body: object }) => {
            expect(queryBody.body).toMatchObject({ ...typicalSignalsQueryAggs() });
            return true;
          }
        ),
      }));
      const { statusCode } = await server.inject(getSignalsAggsQueryRequest());
      expect(statusCode).toBe(200);
      expect(myUtils.getIndex).toHaveReturnedWith('fakeindex');
    });

    test('returns 200 when using aggs and query together', async () => {
      const allTogether = getSignalsQueryRequest();
      allTogether.payload = { ...typicalSignalsQueryAggs(), ...typicalSignalsQuery() };
      elasticsearch.getCluster = jest.fn(() => ({
        callWithRequest: jest.fn(
          (_req, _type: string, queryBody: { index: string; body: object }) => {
            expect(queryBody.body).toMatchObject({
              ...typicalSignalsQueryAggs(),
              ...typicalSignalsQuery(),
            });
            return true;
          }
        ),
      }));
      const { statusCode } = await server.inject(allTogether);
      expect(statusCode).toBe(200);
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
