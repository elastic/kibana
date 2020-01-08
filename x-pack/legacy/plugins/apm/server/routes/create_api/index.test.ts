/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { createApi } from './index';
import { CoreSetup, Logger } from 'src/core/server';
import { Params } from '../typings';
import { BehaviorSubject } from 'rxjs';
import { APMConfig } from '../../../../../../plugins/apm/server';
import { LegacySetup } from '../../../../../../plugins/apm/server/plugin';

const getCoreMock = () => {
  const get = jest.fn();
  const post = jest.fn();
  const put = jest.fn();
  const createRouter = jest.fn().mockReturnValue({
    get,
    post,
    put
  });

  const mock = {} as CoreSetup;

  return {
    mock: {
      ...mock,
      http: {
        ...mock.http,
        createRouter
      }
    },
    get,
    post,
    put,
    createRouter,
    context: {
      config$: new BehaviorSubject({} as APMConfig),
      logger: ({
        error: jest.fn()
      } as unknown) as Logger,
      __LEGACY: {} as LegacySetup
    }
  };
};

describe('createApi', () => {
  it('registers a route with the server', () => {
    const { mock, context, createRouter, post, get, put } = getCoreMock();

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
      .add(() => ({
        path: '/baz',
        method: 'PUT',
        options: {
          tags: ['access:apm', 'access:apm_write']
        },
        handler: async () => null
      }))
      .init(mock, context);

    expect(createRouter).toHaveBeenCalledTimes(1);

    expect(get).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(1);

    expect(get.mock.calls[0][0]).toEqual({
      options: {
        tags: ['access:apm']
      },
      path: '/foo',
      validate: expect.anything()
    });

    expect(post.mock.calls[0][0]).toEqual({
      options: {
        tags: ['access:apm']
      },
      path: '/bar',
      validate: expect.anything()
    });

    expect(put.mock.calls[0][0]).toEqual({
      options: {
        tags: ['access:apm', 'access:apm_write']
      },
      path: '/baz',
      validate: expect.anything()
    });
  });

  describe('when validating', () => {
    const initApi = (params: Params) => {
      const { mock, context, createRouter, get, post } = getCoreMock();
      const handlerMock = jest.fn();
      createApi()
        .add(() => ({
          path: '/foo',
          params,
          handler: handlerMock
        }))
        .init(mock, context);

      const routeHandler = get.mock.calls[0][1];
      const responseMock = {
        ok: jest.fn(),
        internalError: jest.fn(),
        notFound: jest.fn(),
        forbidden: jest.fn(),
        badRequest: jest.fn()
      };

      const simulate = (requestMock: any) => {
        return routeHandler(
          {},
          {
            // stub default values
            params: {},
            query: {},
            body: null,
            ...requestMock
          },
          responseMock
        );
      };

      return { simulate, handlerMock, createRouter, get, post, responseMock };
    };

    it('adds a _debug query parameter by default', async () => {
      const { simulate, handlerMock, responseMock } = initApi({});

      await simulate({ query: { _debug: 'true' } });

      expect(handlerMock).toHaveBeenCalledTimes(1);

      expect(responseMock.ok).toHaveBeenCalled();

      expect(responseMock.badRequest).not.toHaveBeenCalled();

      const params = handlerMock.mock.calls[0][0].context.params;

      expect(params).toEqual({
        query: {
          _debug: true
        }
      });

      await simulate({
        query: {
          _debug: 1
        }
      });

      expect(responseMock.badRequest).toHaveBeenCalled();
    });

    it('throws if any parameters are used but no types are defined', async () => {
      const { simulate, responseMock } = initApi({});

      await simulate({
        query: {
          _debug: true,
          extra: ''
        }
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(1);

      await simulate({
        body: { foo: 'bar' }
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(2);

      await simulate({
        params: {
          foo: 'bar'
        }
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(3);
    });

    it('validates path parameters', async () => {
      const { simulate, handlerMock, responseMock } = initApi({
        path: t.type({
          foo: t.string
        })
      });

      await simulate({
        params: {
          foo: 'bar'
        }
      });

      expect(handlerMock).toHaveBeenCalledTimes(1);

      expect(responseMock.ok).toHaveBeenCalledTimes(1);
      expect(responseMock.badRequest).not.toHaveBeenCalled();

      const params = handlerMock.mock.calls[0][0].context.params;

      expect(params).toEqual({
        path: {
          foo: 'bar'
        },
        query: {
          _debug: false
        }
      });

      await simulate({
        params: {
          bar: 'foo'
        }
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(1);

      await simulate({
        params: {
          foo: 9
        }
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(2);

      await simulate({
        params: {
          foo: 'bar',
          extra: ''
        }
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(3);
    });

    it('validates body parameters', async () => {
      const { simulate, handlerMock, responseMock } = initApi({
        body: t.string
      });

      await simulate({
        body: ''
      });

      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(responseMock.ok).toHaveBeenCalledTimes(1);
      expect(responseMock.badRequest).not.toHaveBeenCalled();

      const params = handlerMock.mock.calls[0][0].context.params;

      expect(params).toEqual({
        body: '',
        query: {
          _debug: false
        }
      });

      await simulate({
        body: null
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(1);
    });

    it('validates query parameters', async () => {
      const { simulate, handlerMock, responseMock } = initApi({
        query: t.type({ bar: t.string })
      });

      await simulate({
        query: {
          bar: '',
          _debug: 'true'
        }
      });

      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(responseMock.ok).toHaveBeenCalledTimes(1);
      expect(responseMock.badRequest).not.toHaveBeenCalled();

      const params = handlerMock.mock.calls[0][0].context.params;

      expect(params).toEqual({
        query: {
          bar: '',
          _debug: true
        }
      });

      await simulate({
        query: {
          bar: '',
          foo: ''
        }
      });

      expect(responseMock.badRequest).toHaveBeenCalledTimes(1);
    });
  });
});
