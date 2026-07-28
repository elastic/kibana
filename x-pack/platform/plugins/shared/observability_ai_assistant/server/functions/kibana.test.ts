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
        new URL('https://source.example/internal/observability_ai_assistant/chat/complete'),
      basePath: overrides.basePath ?? '',
      rewrittenUrl: overrides.rewrittenUrl,
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

describe('kibana tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Kibana through the Core scoped self client', async () => {
    const { handler, coreStart, fetch, resources } = registerFunction();
    const signal = new AbortController().signal;

    const result = await handler(
      {
        arguments: {
          method: 'POST',
          pathname: '/api/apm/agent_keys',
          query: { type: 'dashboard' },
          body: { foo: 'bar' },
        },
      },
      signal
    );

    expect(coreStart.http.selfClient.asScoped).toHaveBeenCalledWith(resources.request);
    expect(fetch).toHaveBeenCalledWith('/api/apm/agent_keys', {
      method: 'POST',
      query: { type: 'dashboard' },
      body: { foo: 'bar' },
      signal,
      forwardRequestHeaders: true,
      access: 'public',
      asResponse: true,
    });
    expect(result).toEqual({ content: { ok: true } });
  });

  it('logs the source request and resolved target url', async () => {
    const { handler, fetch, resources } = registerFunction({ basePath: '/s/my-space' });

    await handler({
      arguments: {
        method: 'GET',
        pathname: '/api/saved_objects/_find',
        query: { type: 'dashboard' },
      },
    });

    expect(resources.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('GET https://target.example/base/api/saved_objects/_find')
    );
    expect(fetch).toHaveBeenCalledWith(
      '/api/saved_objects/_find',
      expect.objectContaining({
        method: 'GET',
        query: { type: 'dashboard' },
      })
    );
  });

  it('logs the resolved target URL when the self call fails', async () => {
    const error = Object.assign(new Error('Not found'), {
      request: { url: 'https://target.example/base/api/missing' },
    });
    const { handler, resources } = registerFunction({ fetchError: error });

    await expect(
      handler({
        arguments: {
          method: 'GET',
          pathname: '/api/missing',
        },
      })
    ).rejects.toThrow('Not found');

    expect(resources.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('GET https://target.example/base/api/missing')
    );
  });

  it('uses the rewritten url in logs when present', async () => {
    const rewrittenUrl = new URL('https://source.example/s/space/original');
    const { handler, resources } = registerFunction({ rewrittenUrl });

    await handler({
      arguments: {
        method: 'GET',
        pathname: '/api/status',
      },
    });

    expect(resources.logger.info).toHaveBeenCalledWith(
      expect.stringContaining(String(rewrittenUrl))
    );
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

  it('requests internal access for internal Kibana APIs', async () => {
    const { handler, fetch } = registerFunction();

    await handler({
      arguments: {
        method: 'GET',
        pathname: '/internal/search',
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/search',
      expect.objectContaining({
        access: 'internal',
      })
    );
  });
});
