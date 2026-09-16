/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ActionContext } from '@kbn/connector-specs';
import { executeDeclarativeRequest } from './runtime';
import type { DeclarativeConnectorSpec, DeclarativeRequest } from './types';

const connector: DeclarativeConnectorSpec = {
  schemaVersion: 1,
  id: '.declarative-test',
  version: '1.0.0',
  metadata: {
    displayName: 'Test',
    description: 'Test connector',
    minimumLicense: 'basic',
    supportedFeatureIds: ['workflows'],
  },
  config: { type: 'object' },
  auth: {
    types: [
      {
        type: 'api_key_header',
        defaults: { headerField: 'Authorization' },
        prefix: 'SSWS ',
      },
    ],
  },
  actions: {},
  test: {
    request: {
      method: 'GET',
      url: 'https://example.test',
    },
  },
};

const createContext = (request: jest.Mock): ActionContext =>
  ({
    client: { request } as unknown as ActionContext['client'],
    config: { baseUrl: 'https://example.test' },
    secrets: { authType: 'api_key_header', Authorization: 'token' },
    log: loggerMock.create(),
    getClient: jest.fn(),
  } as ActionContext);

const response = (
  data: unknown,
  headers: Record<string, string> = {},
  status = 200
): Record<string, unknown> => ({
  data,
  headers,
  status,
  statusText: 'OK',
  config: { headers: {} },
});

describe('executeDeclarativeRequest', () => {
  it('renders config and input templates and applies an auth prefix', async () => {
    const requestMock = jest.fn().mockResolvedValue(response({ data: { score: 17 } }));
    const request: DeclarativeRequest = {
      method: 'GET',
      baseUrl: '{{ config.baseUrl }}',
      path: '/check',
      query: { ip: '{{ input.ip }}' },
      response: { dataPath: 'data' },
    };

    const result = await executeDeclarativeRequest({
      context: createContext(requestMock),
      connector,
      request,
      input: { ip: '192.0.2.1' },
    });

    expect(result).toEqual({ score: 17 });
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.test/check',
        params: { ip: '192.0.2.1' },
        headers: { Authorization: 'SSWS token' },
      })
    );
  });

  it('leaves unprefixed auth to the connectors v2 client', async () => {
    const requestMock = jest.fn().mockResolvedValue(response({ ok: true }));
    const context = createContext(requestMock);
    context.secrets = { authType: 'api_key_header', Key: 'raw-token' };

    await executeDeclarativeRequest({
      context,
      connector: {
        ...connector,
        auth: {
          types: [
            {
              type: 'api_key_header',
              defaults: { headerField: 'Key' },
            },
          ],
        },
      },
      request: { method: 'GET', url: 'https://example.test/check' },
      input: {},
    });

    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({ headers: {} }));
  });

  it('rejects unresolved embedded templates', async () => {
    await expect(
      executeDeclarativeRequest({
        context: createContext(jest.fn()),
        connector,
        request: {
          method: 'GET',
          url: 'https://example.test/users/{{ input.userId }}',
        },
        input: {},
      })
    ).rejects.toThrow('Declarative template "input.userId" did not resolve to a value.');
  });

  it('rejects missing configured response paths', async () => {
    await expect(
      executeDeclarativeRequest({
        context: createContext(jest.fn().mockResolvedValue(response({}))),
        connector,
        request: {
          method: 'GET',
          url: 'https://example.test/users',
          response: { dataPath: 'data.users' },
        },
        input: {},
      })
    ).rejects.toThrow('Declarative response path "data.users" did not resolve to a value.');
  });

  it('follows same-origin Link headers up to the configured page bound', async () => {
    const requestMock = jest
      .fn()
      .mockResolvedValueOnce(
        response([{ id: 1 }], {
          link: '<https://example.test/users?after=page2>; rel="next"',
        })
      )
      .mockResolvedValueOnce(
        response([{ id: 2 }], {
          link: '<https://example.test/users?after=page3>; rel="next"',
          'x-rate-limit-remaining': '8',
        })
      );
    const request: DeclarativeRequest = {
      method: 'GET',
      baseUrl: '{{ config.baseUrl }}',
      path: '/users',
      pagination: {
        strategy: 'link_header',
        maxPages: 2,
        outputKey: 'users',
      },
      response: {
        rateLimitHeaders: { remaining: 'x-rate-limit-remaining' },
      },
    };

    const result = await executeDeclarativeRequest({
      context: createContext(requestMock),
      connector,
      request,
      input: {},
    });

    expect(result).toEqual({
      users: [{ id: 1 }, { id: 2 }],
      _meta: {
        pages: 2,
        truncated: true,
        rateLimit: { remaining: '8' },
      },
    });
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it('retries configured status codes and honors Retry-After', async () => {
    const error = {
      response: {
        status: 429,
        headers: { 'retry-after': '0' },
      },
    };
    const requestMock = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(response({ ok: true }));
    const sleep = jest.fn().mockResolvedValue(undefined);
    const request: DeclarativeRequest = {
      method: 'GET',
      url: 'https://example.test/retry',
      retry: {
        statusCodes: [429],
        maxAttempts: 2,
      },
    };

    const result = await executeDeclarativeRequest({
      context: createContext(requestMock),
      connector,
      request,
      input: {},
      sleep,
    });

    expect(result).toEqual({ ok: true });
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(0);
  });

  it('rejects cross-origin pagination links', async () => {
    const requestMock = jest.fn().mockResolvedValue(
      response([], {
        link: '<https://attacker.example/users?after=page2>; rel="next"',
      })
    );
    const request: DeclarativeRequest = {
      method: 'GET',
      url: 'https://example.test/users',
      pagination: {
        strategy: 'link_header',
        maxPages: 2,
        outputKey: 'users',
      },
    };

    await expect(
      executeDeclarativeRequest({
        context: createContext(requestMock),
        connector,
        request,
        input: {},
      })
    ).rejects.toThrow('cannot follow a cross-origin next link');
  });
});
