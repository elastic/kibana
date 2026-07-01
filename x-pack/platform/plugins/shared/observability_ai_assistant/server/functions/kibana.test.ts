/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerKibanaFunction } from './kibana';
import type { FunctionRegistrationParameters } from '.';

function registerFunction(
  overrides: { requestUrl?: URL; rewrittenUrl?: URL; basePath?: string } = {}
) {
  const logger = { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const fetch = jest.fn().mockResolvedValue({ ok: true });
  const scopedClient = { fetch };
  const coreStart = {
    http: {
      self: {
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
      headers: {
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

    expect(coreStart.http.self.asScoped).toHaveBeenCalledWith(resources.request);
    expect(fetch).toHaveBeenCalledWith('/api/apm/agent_keys', {
      method: 'POST',
      query: { type: 'dashboard' },
      body: { foo: 'bar' },
      signal,
    });
    expect(result).toEqual({ content: { ok: true } });
  });

  it('logs the source request and target pathname', async () => {
    const { handler, fetch, resources } = registerFunction({ basePath: '/s/my-space' });

    await handler({
      arguments: {
        method: 'GET',
        pathname: '/api/saved_objects/_find',
        query: { type: 'dashboard' },
      },
    });

    expect(resources.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('GET /api/saved_objects/_find')
    );
    expect(fetch).toHaveBeenCalledWith(
      '/api/saved_objects/_find',
      expect.objectContaining({
        method: 'GET',
        query: { type: 'dashboard' },
      })
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
});
