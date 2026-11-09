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
      url: new URL('https://source.example/internal/observability_ai_assistant/chat/complete'),
      basePath: '',
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

  it('calls Kibana through the Core scoped self client with internal access', async () => {
    const { handler, coreStart, fetch, resources } = registerFunction();
    const signal = new AbortController().signal;

    const result = await handler(
      {
        arguments: {
          method: 'POST',
          pathname: '/api/apm/agent_keys/private-target-id',
          query: { type: 'private-query-value' },
          body: { sensitive: 'private-body-value' },
        },
      },
      signal
    );

    expect(coreStart.http.selfClient.asScoped).toHaveBeenCalledWith(resources.request);
    expect(fetch).toHaveBeenCalledWith('/api/apm/agent_keys/private-target-id', {
      method: 'POST',
      query: { type: 'private-query-value' },
      body: { sensitive: 'private-body-value' },
      signal,
      forwardRequestHeaders: true,
      access: 'internal',
      asResponse: true,
    });
    expect(result).toEqual({ content: { ok: true } });
    expect(resources.logger.info).not.toHaveBeenCalled();
    expect(resources.logger.error).not.toHaveBeenCalled();
  });

  it('propagates self-call errors unchanged without plugin logging', async () => {
    const error = new Error('self-call failed');
    const { handler, fetch, resources } = registerFunction({ fetchError: error });

    await expect(
      handler({
        arguments: {
          method: 'GET',
          pathname: '/api/private-target/private-id',
        },
      })
    ).rejects.toBe(error);

    expect(fetch).toHaveBeenCalledWith(
      '/api/private-target/private-id',
      expect.objectContaining({ access: 'internal' })
    );
    expect(resources.logger.info).not.toHaveBeenCalled();
    expect(resources.logger.debug).not.toHaveBeenCalled();
    expect(resources.logger.warn).not.toHaveBeenCalled();
    expect(resources.logger.error).not.toHaveBeenCalled();
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
        access: 'internal',
      })
    );
  });
});
