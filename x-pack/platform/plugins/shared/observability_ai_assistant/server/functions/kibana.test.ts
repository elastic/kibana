/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { registerKibanaFunction } from './kibana';
import type { FunctionRegistrationParameters } from '.';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

function createEnotfoundError(hostname: string): Error {
  const cause = new Error(`getaddrinfo ENOTFOUND ${hostname}`) as NodeJS.ErrnoException;
  cause.code = 'ENOTFOUND';
  const error = new Error(`getaddrinfo ENOTFOUND ${hostname}`) as NodeJS.ErrnoException;
  error.code = 'ERR_NETWORK';
  error.cause = cause;
  return error;
}

function registerFunction(overrides: {
  publicBaseUrl?: string;
  requestUrl?: URL;
  rewrittenUrl?: URL;
  headers?: Record<string, string>;
  serverInfo?: { hostname: string; port: number; protocol: 'http' | 'https' };
}) {
  const logger = { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const coreStart = {
    http: {
      basePath: {
        publicBaseUrl: overrides.publicBaseUrl ?? 'https://kibana.example.com:5601',
        serverBasePath: '',
        get: jest.fn(),
      },
      getServerInfo: jest.fn().mockReturnValue(
        overrides.serverInfo ?? {
          name: 'kibana',
          hostname: '0.0.0.0',
          port: 5601,
          protocol: 'http',
        }
      ),
    },
  };

  const resources = {
    request: {
      url:
        overrides.requestUrl ??
        new URL('https://source.example/internal/observability_ai_assistant/chat/complete'),
      rewrittenUrl: overrides.rewrittenUrl,
      headers: {
        'content-type': 'application/json',
        host: 'attacker.example',
        origin: 'https://attacker.example',
        ...(overrides.headers ?? {}),
      },
    },
    logger,
    plugins: {
      core: {
        start: jest.fn().mockResolvedValue(coreStart),
      },
    },
  };

  const functions = { registerFunction: jest.fn() };
  registerKibanaFunction({ functions, resources } as unknown as FunctionRegistrationParameters);

  return {
    handler: functions.registerFunction.mock.calls[0][1],
    coreStart,
    resources,
  };
}

describe('kibana tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.mockResolvedValue({ data: { ok: true } });
  });

  it('forwards requests to the configured publicBaseUrl host only', async () => {
    const { handler } = registerFunction({
      headers: {
        host: 'malicious-host:9200',
        origin: 'https://malicious-host:9200',
        'x-forwarded-host': 'another-host',
      },
    });

    await handler({
      arguments: {
        method: 'GET',
        pathname: '/api/saved_objects/_find',
        query: { type: 'dashboard' },
      },
    });

    const forwardedRequest = mockedAxios.mock.calls[0][0] as AxiosRequestConfig;
    expect(forwardedRequest.url).toBe(
      'https://kibana.example.com:5601/api/saved_objects/_find?type=dashboard'
    );
    expect(forwardedRequest.url).not.toContain('malicious-host');
  });

  it('builds the forwarded url using the space from the incoming request path', async () => {
    const { handler } = registerFunction({
      requestUrl: new URL(
        'https://source.example/s/my-space/internal/observability_ai_assistant/chat/complete'
      ),
    });

    await handler({
      arguments: {
        method: 'POST',
        pathname: '/api/apm/agent_keys',
        body: { foo: 'bar' },
      },
    });

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://kibana.example.com:5601/s/my-space/api/apm/agent_keys',
        data: JSON.stringify({ foo: 'bar' }),
      })
    );
  });

  it('forwards authorization header', async () => {
    const { handler } = registerFunction({
      headers: {
        authorization: 'Basic dGVzdA==',
        'x-forwarded-user': 'should-be-stripped',
      },
    });

    await handler({
      arguments: {
        method: 'GET',
        pathname: '/api/status',
      },
    });

    const forwardedRequest = mockedAxios.mock.calls[0][0] as AxiosRequestConfig;
    expect(forwardedRequest.headers?.authorization).toBe('Basic dGVzdA==');
    expect(forwardedRequest.headers).not.toHaveProperty('x-forwarded-user');
  });

  it('throws when server.publicBaseUrl is not configured', async () => {
    const { handler, coreStart } = registerFunction({});
    coreStart.http.basePath.publicBaseUrl = undefined as any;

    await expect(
      handler({
        arguments: {
          method: 'GET',
          pathname: '/api/saved_objects/_find',
          query: { type: 'dashboard' },
        },
      })
    ).rejects.toThrow(
      'Cannot invoke Kibana tool: "server.publicBaseUrl" must be configured in kibana.yml'
    );
  });

  it('falls back to local server address when publicBaseUrl hostname is not resolvable', async () => {
    const { handler, resources } = registerFunction({
      publicBaseUrl: 'https://kibana-vpc.internal:5601',
      serverInfo: { hostname: '0.0.0.0', port: 5601, protocol: 'http' },
    });

      mockedAxios
        .mockRejectedValueOnce(createEnotfoundError('kibana-vpc.internal'))
        .mockResolvedValueOnce({ data: { status: 'ok' } });

    const result = await handler({
      arguments: { method: 'GET', pathname: '/api/status' },
    });

    expect(mockedAxios).toHaveBeenCalledTimes(2);

    const firstCall = mockedAxios.mock.calls[0][0] as AxiosRequestConfig;
    expect(firstCall.url).toBe('https://kibana-vpc.internal:5601/api/status');

    const retryCall = mockedAxios.mock.calls[1][0] as AxiosRequestConfig;
    expect(retryCall.url).toBe('http://localhost:5601/api/status');

    expect(result).toEqual({ content: { status: 'ok' } });
      expect(resources.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('(ENOTFOUND)')
      );
  });
});
