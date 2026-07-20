/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerKibanaFunction } from './kibana';
import type { FunctionRegistrationParameters } from '.';

function registerFunction(
  overrides: {
    requestUrl?: URL;
    rewrittenUrl?: URL;
    basePath?: string;
    headers?: Record<string, string | string[]>;
    fetchError?: Error;
  } = {}
) {
  const logger = { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const fetch = jest.fn().mockImplementation((pathname: string) => {
    if (overrides.fetchError) {
      throw overrides.fetchError;
    }

    return {
      body: { ok: true },
      request: { url: `https://target.example/base${pathname}` },
    };
  });
  const scopedClient = { fetch };
  const coreStart = {
    http: {
      selfClient: {
        asScoped: jest.fn().mockReturnValue(scopedClient),
      },
    },
  };

  const resources = {
    request: {
      url:
        overrides.requestUrl ??
        new URL('https://source.example/internal/observability_ai_assistant/chat/private-id'),
      basePath: overrides.basePath ?? '',
      rewrittenUrl: overrides.rewrittenUrl,
      route: {
        method: 'post',
        path: '/internal/observability_ai_assistant/chat/{action}',
      },
      headers: overrides.headers ?? {
        'content-type': 'application/json',
        host: 'attacker.example',
        origin: 'https://attacker.example',
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
    fetch,
    resources,
  };
}

const createFetchError = ({
  status,
  code,
  message = 'private raw error message',
  errorCode,
}: {
  status: number;
  code: string;
  message?: string;
  errorCode?: string;
}) => {
  const error = Object.assign(new Error(message), {
    name: 'HttpSelfFetchError',
    ...(errorCode ? { code: errorCode } : {}),
    request: { url: 'https://target.example/api/private-target/private-id?secret=value' },
    response: { status },
    body: {
      statusCode: status,
      message: 'private response body',
      attributes: { code },
    },
  });
  return error;
};

describe('kibana tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Kibana through the Core scoped self client without logging literal URLs', async () => {
    const { handler, coreStart, fetch, resources } = registerFunction();
    const signal = new AbortController().signal;

    const result = await handler(
      {
        arguments: {
          method: 'POST',
          pathname: '/api/apm/agent_keys/private-target-id',
          query: { type: 'private-query-value' },
          body: { secret: 'private-body-value' },
        },
      },
      signal
    );

    expect(coreStart.http.selfClient.asScoped).toHaveBeenCalledWith(resources.request);
    expect(fetch).toHaveBeenCalledWith('/api/apm/agent_keys/private-target-id', {
      method: 'POST',
      query: { type: 'private-query-value' },
      body: { secret: 'private-body-value' },
      signal,
      forwardRequestHeaders: true,
      asResponse: true,
    });
    expect(result).toEqual({ content: { ok: true } });
    expect(resources.logger.info).not.toHaveBeenCalled();
    expect(resources.logger.error).not.toHaveBeenCalled();
  });

  it('logs only stable redacted diagnostics when a self call fails', async () => {
    const error = createFetchError({
      status: 500,
      code: 'PRIVATE_RESPONSE_CODE',
      errorCode: 'UND_ERR_SOCKET',
    });
    const { handler, resources } = registerFunction({ fetchError: error });

    await expect(
      handler({
        arguments: {
          method: 'GET',
          pathname: '/api/private-target/private-id',
          query: { secret: 'private-query-value' },
        },
      })
    ).rejects.toBe(error);

    expect(resources.logger.error).toHaveBeenCalledWith('Kibana self HTTP API call failed', {
      labels: {
        self_http_source_route_template: '/internal/observability_ai_assistant/chat/{action}',
        self_http_target_method: 'GET',
        self_http_error_type: 'HttpSelfFetchError',
        self_http_error_code: 'UND_ERR_SOCKET',
      },
      http: { response: { status_code: 500 } },
    });
    const serializedLog = JSON.stringify((resources.logger.error as jest.Mock).mock.calls);
    expect(serializedLog).not.toContain('private-id');
    expect(serializedLog).not.toContain('private-target');
    expect(serializedLog).not.toContain('private-query-value');
    expect(serializedLog).not.toContain('private raw error message');
    expect(serializedLog).not.toContain('private response body');
    expect(serializedLog).not.toContain('PRIVATE_RESPONSE_CODE');
    expect(serializedLog).not.toContain('target.example');
    expect(serializedLog).not.toContain('source.example');
  });

  it('propagates 403 authorization failures', async () => {
    const error = createFetchError({ status: 403, code: 'FORBIDDEN' });
    const { handler, fetch } = registerFunction({ fetchError: error });

    await expect(
      handler({
        arguments: {
          method: 'GET',
          pathname: '/api/private-target/private-id',
        },
      })
    ).rejects.toBe(error);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('opts into Core safe request header forwarding for self calls', async () => {
    const { handler, fetch } = registerFunction({
      headers: {
        accept: 'application/json',
        'accept-language': 'en-US',
        authorization: 'Bearer attacker',
        cookie: 'sid=attacker',
        host: 'attacker.example',
        'kbn-version': '1.2.3',
        origin: 'https://origin.example',
        referer: 'https://origin.example/app/home',
        'sec-fetch-site': 'same-origin',
        'x-elastic-internal-origin': 'attacker',
        'x-elastic-product-origin': 'observability',
        'x-kbn-context': '%7B%7D',
      },
    });

    await handler({
      arguments: {
        method: 'GET',
        pathname: '/api/status',
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/status',
      expect.objectContaining({
        forwardRequestHeaders: true,
      })
    );
  });
});
