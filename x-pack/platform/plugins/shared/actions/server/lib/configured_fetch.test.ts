/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent, ProxyAgent } from 'undici';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { buildConfiguredFetch } from './configured_fetch';

jest.mock('undici', () => {
  const MockAgent = jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
  }));
  const MockProxyAgent = jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
  }));
  return {
    Agent: MockAgent,
    ProxyAgent: MockProxyAgent,
  };
});

describe('buildConfiguredFetch', () => {
  const logger = loggingSystemMock.createLogger();
  const targetUrl = 'https://mcp-server.example.com/v1/mcp';
  const allowedHosts = ['mcp-server.example.com', 'allowed.example.com'];

  let configurationUtilities: ReturnType<typeof actionsConfigMock.create>;
  let globalFetchSpy: jest.SpyInstance;

  const mockRedirectResponse = (status: number, location: string | null): Response => {
    const headers = new Headers();
    if (location !== null) {
      headers.set('location', location);
    }
    return new Response(null, { status, headers });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configurationUtilities = actionsConfigMock.create();

    configurationUtilities.getSSLSettings.mockReturnValue({});
    configurationUtilities.getProxySettings.mockReturnValue(undefined);
    configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);
    configurationUtilities.getResponseSettings.mockReturnValue({
      maxContentLength: 1_000_000,
      timeout: 60_000,
    });

    configurationUtilities.ensureUriAllowed.mockImplementation((uri: string) => {
      const { hostname } = new URL(uri);
      if (!allowedHosts.includes(hostname)) {
        throw new Error(
          `target url "${uri}" is not added to the Kibana config xpack.actions.allowedHosts`
        );
      }
    });

    globalFetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    globalFetchSpy.mockRestore();
  });

  describe('initial URL validation', () => {
    it('throws immediately if the target URL is not allowed', () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      expect(() => factory({ targetUrl: 'https://evil.internal.example.com/steal' })).toThrow(
        'target url "https://evil.internal.example.com/steal" is not added to the Kibana config xpack.actions.allowedHosts'
      );
      expect(globalFetchSpy).not.toHaveBeenCalled();
    });

    it('does not throw for an allowed target URL', () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      expect(() => factory({ targetUrl })).not.toThrow();
    });
  });

  describe('redirect URL validation', () => {
    it('validates each redirect URL against the allowlist', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      const redirectUrl = 'https://allowed.example.com/v1/mcp';
      const finalResponse = new Response('final', { status: 200 });
      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(302, redirectUrl))
        .mockResolvedValueOnce(finalResponse);

      await resource.fetch(targetUrl, { method: 'POST' });

      expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(redirectUrl);
    });

    it('throws when a redirect URL is not on the allowlist', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy.mockResolvedValueOnce(
        mockRedirectResponse(302, 'https://evil.internal.example.com/steal')
      );

      await expect(resource.fetch(targetUrl, { method: 'POST' })).rejects.toThrow(
        'target url "https://evil.internal.example.com/steal" is not added to the Kibana config xpack.actions.allowedHosts'
      );
    });
  });

  describe('dispatcher caching', () => {
    it('creates one dispatcher per resource and reuses it', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      const finalResponse = new Response('ok', { status: 200 });
      globalFetchSpy.mockResolvedValue(finalResponse);

      await resource.fetch(targetUrl);
      await resource.fetch(targetUrl);

      // Only one Agent should have been created (same policy key)
      expect(Agent).toHaveBeenCalledTimes(1);
    });

    it('creates separate dispatchers for different destination policies', async () => {
      // Different proxy policies for different hosts
      configurationUtilities.getProxySettings.mockReturnValue({
        proxyUrl: 'https://proxy.example.com:8080',
        proxyBypassHosts: new Set(['mcp-server.example.com']),
        proxyOnlyHosts: undefined,
        proxyHeaders: {},
        proxySSLSettings: { verificationMode: 'full' as const },
      });

      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      const redirectUrl = 'https://allowed.example.com/v1';
      const finalResponse = new Response('ok', { status: 200 });
      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(302, redirectUrl))
        .mockResolvedValueOnce(finalResponse);

      await resource.fetch(targetUrl);

      // The original host bypasses proxy (Agent); the redirect host uses ProxyAgent
      expect(Agent).toHaveBeenCalledTimes(1);
      expect(ProxyAgent).toHaveBeenCalledTimes(1);
    });
  });

  describe('redirect behaviour', () => {
    it('changes method to GET and strips body for 301', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(301, 'https://allowed.example.com/v1'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, { method: 'POST', body: '{"data":true}' });

      const { method, body } = globalFetchSpy.mock.calls[1][1];
      expect(method).toBe('GET');
      expect(body).toBeUndefined();
    });

    it('changes method to GET and strips body for 302', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(302, 'https://allowed.example.com/v1'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, { method: 'POST', body: '{"data":true}' });

      const { method, body } = globalFetchSpy.mock.calls[1][1];
      expect(method).toBe('GET');
      expect(body).toBeUndefined();
    });

    it('changes method to GET and strips body for 303', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(303, 'https://allowed.example.com/v1'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, { method: 'POST', body: '{"data":true}' });

      const { method, body } = globalFetchSpy.mock.calls[1][1];
      expect(method).toBe('GET');
      expect(body).toBeUndefined();
    });

    it('preserves method and body for 307', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://allowed.example.com/v1'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, { method: 'POST', body: '{"data":true}' });

      const { method, body } = globalFetchSpy.mock.calls[1][1];
      expect(method).toBe('POST');
      expect(body).toBe('{"data":true}');
    });

    it('preserves method and body for 308', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(308, 'https://allowed.example.com/v1'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, { method: 'POST', body: '{"data":true}' });

      const { method, body } = globalFetchSpy.mock.calls[1][1];
      expect(method).toBe('POST');
      expect(body).toBe('{"data":true}');
    });

    it('strips authorization header on cross-origin redirect', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://allowed.example.com/v1'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, {
        method: 'POST',
        headers: { Authorization: 'Bearer secret', 'Content-Type': 'application/json' },
      });

      const redirectInit = globalFetchSpy.mock.calls[1][1];
      const headers =
        redirectInit.headers instanceof Headers
          ? Object.fromEntries((redirectInit.headers as Headers).entries())
          : redirectInit.headers;
      expect(headers).not.toHaveProperty('authorization');
      expect(headers).toHaveProperty('content-type', 'application/json');
    });

    it('preserves authorization header on same-origin redirect', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://mcp-server.example.com/v2/mcp'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, {
        method: 'POST',
        headers: { Authorization: 'Bearer secret', 'Content-Type': 'application/json' },
      });

      const redirectInit = globalFetchSpy.mock.calls[1][1];
      const headers =
        redirectInit.headers instanceof Headers
          ? Object.fromEntries((redirectInit.headers as Headers).entries())
          : redirectInit.headers;
      expect(headers).toHaveProperty('authorization', 'Bearer secret');
    });

    it('throws when max redirects are exceeded', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy.mockResolvedValue(
        mockRedirectResponse(302, 'https://allowed.example.com/loop')
      );

      await expect(resource.fetch(targetUrl)).rejects.toThrow('Max redirects (20) exceeded');
      expect(globalFetchSpy).toHaveBeenCalledTimes(21);
    });

    it('throws when a redirect is missing the Location header', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy.mockResolvedValueOnce(mockRedirectResponse(302, null));

      await expect(resource.fetch(targetUrl)).rejects.toThrow(
        'Redirect response 302 missing Location header'
      );
    });
  });

  describe('SSE passthrough', () => {
    it('passes GET response body through as a stream', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      const sseResponse = new Response('data: hello\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
      globalFetchSpy.mockResolvedValueOnce(sseResponse);

      const result = await resource.fetch(targetUrl, { method: 'GET' });
      expect(result).toBe(sseResponse);
    });

    it('passes POST response with text/event-stream content-type through as a stream', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      const sseResponse = new Response('data: hello\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      });
      globalFetchSpy.mockResolvedValueOnce(sseResponse);

      const result = await resource.fetch(targetUrl, { method: 'POST' });
      expect(result).toBe(sseResponse);
    });
  });

  describe('Cloud User-Agent', () => {
    it('applies a User-Agent header derived from cloud info', async () => {
      // Provide a minimal cloud mock. The actual CloudSetup type has many fields;
      // buildUserAgent only needs serverless.projectId or deploymentId.
      const mockCloud = { serverless: { projectId: 'proj-abc' } } as Parameters<
        typeof buildConfiguredFetch
      >[2];

      const factory = buildConfiguredFetch(configurationUtilities, logger, mockCloud);
      const resource = factory({ targetUrl });

      globalFetchSpy.mockResolvedValueOnce(new Response('ok', { status: 200 }));

      await resource.fetch(targetUrl);

      const requestInit = globalFetchSpy.mock.calls[0][1];
      const headers = requestInit.headers as Headers;
      const ua = headers.get('user-agent');
      expect(ua).toContain('elastic');
      expect(ua).toContain('proj-abc');
    });

    it('applies a User-Agent header even without cloud info', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy.mockResolvedValueOnce(new Response('ok', { status: 200 }));

      await resource.fetch(targetUrl);

      const requestInit = globalFetchSpy.mock.calls[0][1];
      const headers = requestInit.headers as Headers;
      const ua = headers.get('user-agent');
      expect(ua).toBeTruthy();
    });
  });

  describe('close()', () => {
    it('closes all cached dispatchers', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy.mockResolvedValueOnce(new Response('ok', { status: 200 }));
      await resource.fetch(targetUrl);

      await resource.close();

      const agentInstance = (Agent as unknown as jest.Mock).mock.results[0].value;
      expect(agentInstance.close).toHaveBeenCalledTimes(1);
    });

    it('is idempotent: calling close() twice does not throw', async () => {
      const factory = buildConfiguredFetch(configurationUtilities, logger);
      const resource = factory({ targetUrl });

      globalFetchSpy.mockResolvedValueOnce(new Response('ok', { status: 200 }));
      await resource.fetch(targetUrl);

      await expect(resource.close()).resolves.toBeUndefined();
      await expect(resource.close()).resolves.toBeUndefined();

      const agentInstance = (Agent as unknown as jest.Mock).mock.results[0].value;
      // Second close should be a no-op
      expect(agentInstance.close).toHaveBeenCalledTimes(1);
    });
  });
});
