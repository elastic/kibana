/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { createApi } from './index';
import { InternalCoreSetup } from 'src/core/server';
import { Params } from '../typings';

const getCoreMock = () =>
  (({
    http: {
      server: {
        route: jest.fn()
      }
    }
  } as unknown) as InternalCoreSetup & {
    http: { server: { route: ReturnType<typeof jest.fn> } };
  });

describe('createApi', () => {
  it('registers a route with the server', () => {
    const coreMock = getCoreMock();

    createApi()
      .add(() => ({
        path: '/foo',
        handler: async () => null
      }))
      .add(() => ({
        path: '/bar',
        method: 'POST',
        params: {
          body: t.string
        },
        handler: async () => null
      }))
      .init(coreMock);

    expect(coreMock.http.server.route).toHaveBeenCalledTimes(2);

    const firstRoute = coreMock.http.server.route.mock.calls[0][0];

    expect(firstRoute).toEqual({
      method: 'GET',
      options: {
        tags: ['access:apm']
      },
      path: '/foo',
      handler: expect.any(Function)
    });

    const secondRoute = coreMock.http.server.route.mock.calls[1][0];

    expect(secondRoute).toEqual({
      method: 'POST',
      options: {
        tags: ['access:apm']
      },
      path: '/bar',
      handler: expect.any(Function)
    });
  });

  describe('when validating', () => {
    const initApi = (params: Params) => {
      const core = getCoreMock();
      const handler = jest.fn();
      createApi()
        .add(() => ({
          path: '/foo',
          params,
          handler
        }))
        .init(core);

      const route = core.http.server.route.mock.calls[0][0];

      const routeHandler = route.handler;

      route.handler = (requestMock: any) => {
        return routeHandler({
          // stub hapi's default values
          params: {},
          query: {},
          payload: null,
          ...requestMock
        });
      };

      return { route, handler };
    };

    it('adds a _debug query parameter by default', () => {
      const { handler, route } = initApi({});

      expect(() =>
        route.handler({
          query: {
            _debug: 'true'
          }
        })
      ).not.toThrow();

      expect(handler).toHaveBeenCalledTimes(1);

      const params = handler.mock.calls[0][1];

      expect(params).toEqual({});

      expect(() =>
        route.handler({
          query: {
            _debug: 1
          }
        })
      ).toThrow();
    });

    it('throws if any parameters are used but no types are defined', () => {
      const { route } = initApi({});

      expect(() =>
        route.handler({
          query: {
            _debug: 'true',
            extra: ''
          }
        })
      ).toThrow();

      expect(() =>
        route.handler({
          payload: { foo: 'bar' }
        })
      ).toThrow();

      expect(() =>
        route.handler({
          params: {
            foo: 'bar'
          }
        })
      ).toThrow();
    });

    it('validates path parameters', () => {
      const { handler, route } = initApi({ path: t.type({ foo: t.string }) });

      expect(() =>
        route.handler({
          params: {
            foo: 'bar'
          }
        })
      ).not.toThrow();

      expect(handler).toHaveBeenCalledTimes(1);

      const params = handler.mock.calls[0][1];

      expect(params).toEqual({
        path: {
          foo: 'bar'
        }
      });

      handler.mockClear();

      expect(() =>
        route.handler({
          params: {
            bar: 'foo'
          }
        })
      ).toThrow();

      expect(() =>
        route.handler({
          params: {
            foo: 9
          }
        })
      ).toThrow();

      expect(() =>
        route.handler({
          params: {
            foo: 'bar',
            extra: ''
          }
        })
      ).toThrow();
    });

    it('validates body parameters', () => {
      const { handler, route } = initApi({ body: t.string });

      expect(() =>
        route.handler({
          payload: ''
        })
      ).not.toThrow();

      expect(handler).toHaveBeenCalledTimes(1);

      const params = handler.mock.calls[0][1];

      expect(params).toEqual({
        body: ''
      });

      handler.mockClear();

      expect(() =>
        route.handler({
          payload: null
        })
      ).toThrow();
    });

    it('validates query parameters', () => {
      const { handler, route } = initApi({
        query: t.type({ bar: t.string })
      });

      expect(() =>
        route.handler({
          query: {
            bar: '',
            _debug: 'true'
          }
        })
      ).not.toThrow();

      expect(handler).toHaveBeenCalledTimes(1);

      const params = handler.mock.calls[0][1];

      expect(params).toEqual({
        query: {
          bar: ''
        }
      });

      handler.mockClear();

      expect(() =>
        route.handler({
          query: {
            bar: '',
            foo: ''
          }
        })
      ).toThrow();
    });
  });
});
