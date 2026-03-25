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

function registerFunction(overrides: {
  publicBaseUrl?: string;
  serverInfo?: { hostname: string; port: number; protocol: 'http' | 'https' };
  requestUrl?: URL;
  rewrittenUrl?: URL;
  headers?: Record<string, string>;
}) {
  const logger = { info: jest.fn(), error: jest.fn() };
  const coreStart = {
    http: {
      basePath: {
        publicBaseUrl: overrides.publicBaseUrl,
        serverBasePath: '',
        get: jest.fn(),
      },
      getServerInfo: jest
        .fn()
        .mockReturnValue(
          overrides.serverInfo ?? { hostname: 'localhost', port: 5601, protocol: 'http' }
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

  it('forwards requests to the local server address, ignoring user-supplied headers', async () => {
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
      'http://localhost:5601/api/saved_objects/_find?type=dashboard'
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
        url: 'http://localhost:5601/s/my-space/api/apm/agent_keys',
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

  it('maps 0.0.0.0 hostname to 127.0.0.1', async () => {
    const { handler } = registerFunction({
      serverInfo: { hostname: '0.0.0.0', port: 5601, protocol: 'http' },
    });

    await handler({
      arguments: { method: 'GET', pathname: '/api/status' },
    });

    const forwardedRequest = mockedAxios.mock.calls[0][0] as AxiosRequestConfig;
    expect(forwardedRequest.url).toBe('http://127.0.0.1:5601/api/status');
  });

  it('maps :: hostname to ::1', async () => {
    const { handler } = registerFunction({
      serverInfo: { hostname: '::', port: 5601, protocol: 'http' },
    });

    await handler({
      arguments: { method: 'GET', pathname: '/api/status' },
    });

    const forwardedRequest = mockedAxios.mock.calls[0][0] as AxiosRequestConfig;
    expect(forwardedRequest.url).toBe('http://[::1]:5601/api/status');
  });

  it('preserves ::1 hostname', async () => {
    const { handler } = registerFunction({
      serverInfo: { hostname: '::1', port: 5601, protocol: 'http' },
    });

    await handler({
      arguments: { method: 'GET', pathname: '/api/status' },
    });

    const forwardedRequest = mockedAxios.mock.calls[0][0] as AxiosRequestConfig;
    expect(forwardedRequest.url).toBe('http://[::1]:5601/api/status');
  });

  it('brackets IPv6 literal addresses in the URL', async () => {
    const { handler } = registerFunction({
      serverInfo: { hostname: 'fe80::1', port: 5601, protocol: 'http' },
    });

    await handler({
      arguments: { method: 'GET', pathname: '/api/status' },
    });

    const forwardedRequest = mockedAxios.mock.calls[0][0] as AxiosRequestConfig;
    expect(forwardedRequest.url).toBe('http://[fe80::1]:5601/api/status');
  });

  it('uses publicBaseUrl hostname for https verification when available', async () => {
    const { handler } = registerFunction({
      publicBaseUrl: 'https://kibana.example.com:5601',
      serverInfo: { hostname: '0.0.0.0', port: 5601, protocol: 'https' },
    });

    await handler({
      arguments: { method: 'GET', pathname: '/api/status' },
    });

    const forwardedRequest = mockedAxios.mock.calls[0][0] as AxiosRequestConfig;
    expect(forwardedRequest.url).toBe('https://127.0.0.1:5601/api/status');
    expect(forwardedRequest.httpsAgent).toBeDefined();
    expect((forwardedRequest.httpsAgent as any).options.servername).toBe('kibana.example.com');
    expect((forwardedRequest.httpsAgent as any).options.checkServerIdentity).toEqual(
      expect.any(Function)
    );
  });

  it('uses loopback-only https verification fallback when publicBaseUrl is unavailable', async () => {
    const { handler } = registerFunction({
      serverInfo: { hostname: '::1', port: 5601, protocol: 'https' },
    });

    await handler({
      arguments: { method: 'GET', pathname: '/api/status' },
    });

    const forwardedRequest = mockedAxios.mock.calls[0][0] as AxiosRequestConfig;
    expect(forwardedRequest.url).toBe('https://[::1]:5601/api/status');
    expect(forwardedRequest.httpsAgent).toBeDefined();
    expect((forwardedRequest.httpsAgent as any).options.servername).toBeUndefined();
    expect((forwardedRequest.httpsAgent as any).options.checkServerIdentity).toEqual(
      expect.any(Function)
    );
  });

  it('does not override hostname verification for non-loopback https targets', async () => {
    const { handler } = registerFunction({
      serverInfo: { hostname: 'kibana.internal', port: 5601, protocol: 'https' },
    });

    await handler({
      arguments: { method: 'GET', pathname: '/api/status' },
    });

    const forwardedRequest = mockedAxios.mock.calls[0][0] as AxiosRequestConfig;
    expect(forwardedRequest.url).toBe('https://kibana.internal:5601/api/status');
    expect(forwardedRequest.httpsAgent).toBeUndefined();
  });

  it('does not provide httpsAgent when server uses http', async () => {
    const { handler } = registerFunction({
      serverInfo: { hostname: 'localhost', port: 5601, protocol: 'http' },
    });

    await handler({
      arguments: { method: 'GET', pathname: '/api/status' },
    });

    const forwardedRequest = mockedAxios.mock.calls[0][0] as AxiosRequestConfig;
    expect(forwardedRequest.httpsAgent).toBeUndefined();
  });
});
