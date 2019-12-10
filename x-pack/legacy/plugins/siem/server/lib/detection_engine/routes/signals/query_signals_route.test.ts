/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from '../__mocks__/_mock_server';
import { querySignalsRoute } from './query_signals_route';
import * as myUtils from '../utils';
import { ServerInjectOptions } from 'hapi';
import { getSignalsQueryRequest, typicalSignalsQuery } from '../__mocks__/request_responses';
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

  describe('status on signal', () => {
    test('returns 200 when setting a status on a signal by ids', async () => {
      elasticsearch.getCluster = jest.fn(() => ({
        callWithRequest: jest.fn(
          (_req, _type: string, queryBody: { index: string; body: object }) => {
            expect(queryBody.body).toMatchObject({ ...typicalSignalsQuery });
            return true;
          }
        ),
      }));
      const { statusCode } = await server.inject(getSignalsQueryRequest());
      expect(statusCode).toBe(200);
      expect(myUtils.getIndex).toHaveReturnedWith('fakeindex');
    });
  });

  describe('validation', () => {
    test('returns 200 if search_query present', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        payload: typicalSignalsQuery(),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if search_query is not present', async () => {
      const { search_query: sq, ...otherThings } = typicalSignalsQuery();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_QUERY_SIGNALS_URL,
        payload: otherThings,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
