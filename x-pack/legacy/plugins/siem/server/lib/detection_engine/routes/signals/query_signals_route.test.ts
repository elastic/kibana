/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { querySignalsRoute } from './query_signals_route';
import {
  getSignalsQueryRequest,
  getSignalsAggsQueryRequest,
  typicalSignalsQuery,
  typicalSignalsQueryAggs,
  getSignalsAggsAndQueryRequest,
} from '../__mocks__/request_responses';
import { requestContextMock, responseMock, serverMock } from '../__mocks__';

describe('query for signal', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    // clients.clusterClient.callAsCurrentUser.mockResolvedValue(true); // TODO: what is the return value of a successful query?

    querySignalsRoute(server.router);
  });

  describe('query and agg on signals index', () => {
    test('returns 200 when using single query', async () => {
      const response = await server.inject(getSignalsQueryRequest(), context);

      expect(response.ok).toHaveBeenCalled();
      expect(clients.clusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({ body: typicalSignalsQuery() })
      );
    });

    test('returns 200 when using single agg', async () => {
      const response = await server.inject(getSignalsAggsQueryRequest(), context);

      expect(response.ok).toHaveBeenCalled();
      expect(clients.clusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({ body: typicalSignalsQueryAggs() })
      );
    });

    test('returns 200 when using aggs and query together', async () => {
      const response = await server.inject(getSignalsAggsAndQueryRequest(), context);

      expect(response.ok).toHaveBeenCalled();
      expect(clients.clusterClient.callAsCurrentUser).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({
          body: {
            ...typicalSignalsQuery(),
            ...typicalSignalsQueryAggs(),
          },
        })
      );
    });

    test('catches error if query throws error', async () => {
      clients.clusterClient.callAsCurrentUser.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getSignalsAggsQueryRequest(), context);
      expect(response.customError).toHaveBeenCalledWith({
        body: 'Test error',
        statusCode: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows when query present', async () => {
      const response = responseMock.create();
      const body = typicalSignalsQuery();
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('allows when aggs present', async () => {
      const response = responseMock.create();
      const body = typicalSignalsQueryAggs();
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('allows when aggs and query present', async () => {
      const response = responseMock.create();
      const body = { ...typicalSignalsQueryAggs(), ...typicalSignalsQuery() };
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('rejects when missing aggs and query', async () => {
      const response = responseMock.create();
      const body = {};
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
