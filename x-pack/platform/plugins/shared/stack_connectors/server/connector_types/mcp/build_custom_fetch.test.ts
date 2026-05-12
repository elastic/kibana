/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent, ProxyAgent } from 'undici';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { buildCustomFetch } from './build_custom_fetch';

jest.mock('undici', () => {
  const MockAgent = jest.fn();
  const MockProxyAgent = jest.fn();
  return {
    Agent: MockAgent,
    ProxyAgent: MockProxyAgent,
  };
});

describe('buildCustomFetch', () => {
  const logger = loggingSystemMock.createLogger();
  const targetUrl = 'https://mcp-server.example.com/v1/mcp';

  let configurationUtilities: ReturnType<typeof actionsConfigMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    configurationUtilities = actionsConfigMock.create();
  });

  it('returns a function', () => {
    const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);
    expect(typeof customFetch).toBe('function');
  });

  describe('without proxy', () => {
    it('creates an undici Agent with default SSL settings', () => {
      configurationUtilities.getSSLSettings.mockReturnValue({});
      configurationUtilities.getProxySettings.mockReturnValue(undefined);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      expect(Agent).toHaveBeenCalledTimes(1);
      expect(Agent).toHaveBeenCalledWith({ connect: {} });
      expect(ProxyAgent).not.toHaveBeenCalled();
    });

    it('creates an Agent with rejectUnauthorized=false when verificationMode is none', () => {
      configurationUtilities.getSSLSettings.mockReturnValue({ verificationMode: 'none' });
      configurationUtilities.getProxySettings.mockReturnValue(undefined);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      expect(Agent).toHaveBeenCalledWith({
        connect: expect.objectContaining({ rejectUnauthorized: false }),
      });
    });

    it('creates an Agent with rejectUnauthorized=true when verificationMode is full', () => {
      configurationUtilities.getSSLSettings.mockReturnValue({ verificationMode: 'full' });
      configurationUtilities.getProxySettings.mockReturnValue(undefined);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      expect(Agent).toHaveBeenCalledWith({
        connect: expect.objectContaining({ rejectUnauthorized: true }),
      });
    });

    it('creates an Agent with checkServerIdentity when verificationMode is certificate', () => {
      configurationUtilities.getSSLSettings.mockReturnValue({
        verificationMode: 'certificate',
      });
      configurationUtilities.getProxySettings.mockReturnValue(undefined);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      const connectOpts = (Agent as unknown as jest.Mock).mock.calls[0][0].connect;
      expect(connectOpts.rejectUnauthorized).toBe(true);
      expect(typeof connectOpts.checkServerIdentity).toBe('function');
      expect(connectOpts.checkServerIdentity()).toBeUndefined();
    });

    it('warns and defaults to rejectUnauthorized=true for unknown verificationMode', () => {
      configurationUtilities.getSSLSettings.mockReturnValue({
        // @ts-expect-error invalid verification mode
        verificationMode: 'bogus',
      });
      configurationUtilities.getProxySettings.mockReturnValue(undefined);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      expect(logger.warn).toHaveBeenCalledWith('Unknown ssl verificationMode: bogus');
      expect(Agent).toHaveBeenCalledWith({
        connect: expect.objectContaining({ rejectUnauthorized: true }),
      });
    });

    it('applies custom host SSL CA overrides', () => {
      configurationUtilities.getSSLSettings.mockReturnValue({ verificationMode: 'full' });
      configurationUtilities.getProxySettings.mockReturnValue(undefined);
      configurationUtilities.getCustomHostSettings.mockReturnValue({
        url: 'https://mcp-server.example.com:443',
        ssl: {
          certificateAuthoritiesData: 'custom-ca-data',
          verificationMode: 'none',
        },
      });

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      expect(Agent).toHaveBeenCalledWith({
        connect: expect.objectContaining({
          ca: 'custom-ca-data',
          rejectUnauthorized: false,
        }),
      });
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Creating customized connection settings')
      );
    });

    it('applies custom host verificationMode=certificate with checkServerIdentity', () => {
      configurationUtilities.getSSLSettings.mockReturnValue({ verificationMode: 'full' });
      configurationUtilities.getProxySettings.mockReturnValue(undefined);
      configurationUtilities.getCustomHostSettings.mockReturnValue({
        url: 'https://mcp-server.example.com:443',
        ssl: {
          verificationMode: 'certificate',
        },
      });

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      const connectOpts = (Agent as unknown as jest.Mock).mock.calls[0][0].connect;
      expect(connectOpts.rejectUnauthorized).toBe(true);
      expect(typeof connectOpts.checkServerIdentity).toBe('function');
    });
  });

  describe('with proxy', () => {
    const proxySettings = {
      proxyUrl: 'https://proxy.example.com:8080',
      proxyBypassHosts: undefined as Set<string> | undefined,
      proxyOnlyHosts: undefined as Set<string> | undefined,
      proxyHeaders: { 'Proxy-Auth': 'token-123' },
      proxySSLSettings: { verificationMode: 'full' as const },
    };

    it('creates a ProxyAgent when proxy settings are configured', () => {
      configurationUtilities.getSSLSettings.mockReturnValue({ verificationMode: 'full' });
      configurationUtilities.getProxySettings.mockReturnValue(proxySettings);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      expect(ProxyAgent).toHaveBeenCalledTimes(1);
      expect(ProxyAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: expect.stringContaining('proxy.example.com:8080'),
          requestTls: expect.objectContaining({ rejectUnauthorized: true }),
          proxyTls: expect.objectContaining({ rejectUnauthorized: true }),
          headers: proxySettings.proxyHeaders,
        })
      );
      expect(Agent).not.toHaveBeenCalled();
    });

    it('uses Agent (not ProxyAgent) when host is in proxyBypassHosts', () => {
      const bypassSettings = {
        ...proxySettings,
        proxyBypassHosts: new Set(['mcp-server.example.com']),
      };
      configurationUtilities.getSSLSettings.mockReturnValue({});
      configurationUtilities.getProxySettings.mockReturnValue(bypassSettings);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      expect(Agent).toHaveBeenCalledTimes(1);
      expect(ProxyAgent).not.toHaveBeenCalled();
    });

    it('uses Agent (not ProxyAgent) when host is NOT in proxyOnlyHosts', () => {
      const onlySettings = {
        ...proxySettings,
        proxyOnlyHosts: new Set(['other-host.example.com']),
      };
      configurationUtilities.getSSLSettings.mockReturnValue({});
      configurationUtilities.getProxySettings.mockReturnValue(onlySettings);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      expect(Agent).toHaveBeenCalledTimes(1);
      expect(ProxyAgent).not.toHaveBeenCalled();
    });

    it('uses ProxyAgent when host IS in proxyOnlyHosts', () => {
      const onlySettings = {
        ...proxySettings,
        proxyOnlyHosts: new Set(['mcp-server.example.com']),
      };
      configurationUtilities.getSSLSettings.mockReturnValue({});
      configurationUtilities.getProxySettings.mockReturnValue(onlySettings);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      expect(ProxyAgent).toHaveBeenCalledTimes(1);
      expect(Agent).not.toHaveBeenCalled();
    });

    it('applies proxy SSL verification mode for the proxy connection', () => {
      const proxyWithNoVerify = {
        ...proxySettings,
        proxySSLSettings: { verificationMode: 'none' as const },
      };
      configurationUtilities.getSSLSettings.mockReturnValue({});
      configurationUtilities.getProxySettings.mockReturnValue(proxyWithNoVerify);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      expect(ProxyAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          proxyTls: expect.objectContaining({ rejectUnauthorized: false }),
        })
      );
    });

    it('falls back to Agent when proxy URL is invalid', () => {
      const invalidProxySettings = {
        ...proxySettings,
        proxyUrl: 'not-a-valid-url',
      };
      configurationUtilities.getSSLSettings.mockReturnValue({});
      configurationUtilities.getProxySettings.mockReturnValue(invalidProxySettings);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, targetUrl);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid proxy URL'));
      expect(Agent).toHaveBeenCalledTimes(1);
      expect(ProxyAgent).not.toHaveBeenCalled();
    });

    it('warns when target URL is invalid for proxy bypass check', () => {
      configurationUtilities.getSSLSettings.mockReturnValue({});
      configurationUtilities.getProxySettings.mockReturnValue(proxySettings);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      buildCustomFetch(configurationUtilities, logger, 'not-a-url');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('error determining proxy state')
      );
      expect(Agent).toHaveBeenCalledTimes(1);
      expect(ProxyAgent).not.toHaveBeenCalled();
    });
  });

  describe('fetch wrapper', () => {
    it('calls global fetch with the dispatcher', async () => {
      configurationUtilities.getSSLSettings.mockReturnValue({});
      configurationUtilities.getProxySettings.mockReturnValue(undefined);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      const mockResponse = new Response('ok');
      const globalFetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

      const result = await customFetch('https://mcp-server.example.com/v1/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(result).toBe(mockResponse);
      expect(globalFetchSpy).toHaveBeenCalledWith(
        'https://mcp-server.example.com/v1/mcp',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          redirect: 'manual',
          dispatcher: expect.anything(),
        })
      );

      globalFetchSpy.mockRestore();
    });
  });

  describe('handles redirects', () => {
    let globalFetchSpy: jest.SpyInstance;

    const allowedHosts = ['mcp-server.example.com', 'allowed.example.com'];

    const mockRedirectResponse = (status: number, location: string | null): Response => {
      const headers = new Headers();
      if (location !== null) {
        headers.set('location', location);
      }
      return new Response(null, { status, headers });
    };

    beforeEach(() => {
      globalFetchSpy = jest.spyOn(globalThis, 'fetch');

      configurationUtilities.getSSLSettings.mockReturnValue({});
      configurationUtilities.getProxySettings.mockReturnValue(undefined);
      configurationUtilities.getCustomHostSettings.mockReturnValue(undefined);

      configurationUtilities.ensureUriAllowed.mockImplementation((uri: string) => {
        const { hostname } = new URL(uri);
        if (!allowedHosts.includes(hostname)) {
          throw new Error(
            `target url "${uri}" is not added to the Kibana config xpack.actions.allowedHosts`
          );
        }
      });
    });

    afterEach(() => {
      globalFetchSpy.mockRestore();
    });

    it('follows a redirect to an allowlisted host', async () => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      const redirectUrl = 'https://allowed.example.com/v1/mcp';
      const finalResponse = new Response('final', { status: 200 });
      globalFetchSpy.mockResolvedValueOnce(mockRedirectResponse(302, redirectUrl));
      globalFetchSpy.mockResolvedValueOnce(finalResponse);

      const result = await customFetch(targetUrl, { method: 'POST' });
      expect(result).toBe(finalResponse);
      expect(globalFetchSpy).toHaveBeenCalledTimes(2);
      expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(redirectUrl);
    });

    it('blocks a redirect to a disallowed host', async () => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      const redirectUrl = 'https://evil.internal.example.com/steal';
      globalFetchSpy.mockResolvedValueOnce(mockRedirectResponse(302, redirectUrl));

      await expect(customFetch(targetUrl, { method: 'POST' })).rejects.toThrow(
        `target url "${redirectUrl}" is not added to the Kibana config xpack.actions.allowedHosts`
      );

      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
    });

    it('throws when max redirects is exceeded', async () => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      globalFetchSpy.mockResolvedValue(
        mockRedirectResponse(302, 'https://allowed.example.com/loop')
      );

      await expect(customFetch(targetUrl)).rejects.toThrow('Max redirects (20) exceeded');

      expect(globalFetchSpy).toHaveBeenCalledTimes(21);
    });

    it('throws when a redirect response is missing the Location header', async () => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      globalFetchSpy.mockResolvedValueOnce(mockRedirectResponse(302, null));

      await expect(customFetch(targetUrl)).rejects.toThrow(
        'Redirect response 302 missing Location header'
      );
    });

    it.each([307, 308])('preserves method and body for %i redirects', async (status) => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(status, 'https://allowed.example.com/v1/mcp'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await customFetch(targetUrl, { method: 'POST', body: '{"data":true}' });

      const { method, body } = globalFetchSpy.mock.calls[1][1];
      expect(method).toBe('POST');
      expect(body).toBe('{"data":true}');
    });

    it.each([301, 302, 303])(
      'downgrades method to GET and drops body for %i redirects',
      async (status) => {
        const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

        globalFetchSpy
          .mockResolvedValueOnce(mockRedirectResponse(status, 'https://allowed.example.com/v1/mcp'))
          .mockResolvedValueOnce(new Response('final', { status: 200 }));

        await customFetch(targetUrl, { method: 'POST', body: '{"data":true}' });

        const { method, body } = globalFetchSpy.mock.calls[1][1];
        expect(method).toBe('GET');
        expect(body).toBeUndefined();
      }
    );

    it.each([301, 302, 303])('strips request-body-headers on %i method change', async (status) => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      globalFetchSpy
        .mockResolvedValueOnce(
          mockRedirectResponse(status, 'https://mcp-server.example.com/v2/mcp')
        )
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await customFetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
          'Content-Language': 'en',
          'Content-Location': '/resource',
          'X-Custom-Header': 'keep-me',
        },
      });

      const redirectHeaders = globalFetchSpy.mock.calls[1][1].headers;
      const entries =
        redirectHeaders instanceof Headers
          ? Object.fromEntries(redirectHeaders.entries())
          : redirectHeaders;

      expect(entries).not.toHaveProperty('content-type');
      expect(entries).not.toHaveProperty('content-encoding');
      expect(entries).not.toHaveProperty('content-language');
      expect(entries).not.toHaveProperty('content-location');
      expect(entries).toHaveProperty('x-custom-header', 'keep-me');
    });

    it.each([307, 308])('preserves request-body-headers on %i redirects', async (status) => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      globalFetchSpy
        .mockResolvedValueOnce(
          mockRedirectResponse(status, 'https://mcp-server.example.com/v2/mcp')
        )
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await customFetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
        },
      });

      const redirectHeaders = globalFetchSpy.mock.calls[1][1].headers;
      expect(redirectHeaders).toHaveProperty('Content-Type', 'application/json');
      expect(redirectHeaders).toHaveProperty('Content-Encoding', 'gzip');
    });

    it('resolves relative Location URLs against the request URL', async () => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(302, '/v2/mcp'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await customFetch(targetUrl);

      const secondCallUrl = globalFetchSpy.mock.calls[1][0];
      expect(secondCallUrl).toBe('https://mcp-server.example.com/v2/mcp');
      expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
        'https://mcp-server.example.com/v2/mcp'
      );
    });

    it('follows multiple redirects through allowed hosts', async () => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(302, 'https://allowed.example.com/step1'))
        .mockResolvedValueOnce(mockRedirectResponse(301, 'https://mcp-server.example.com/step2'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      const result = await customFetch(targetUrl);
      expect(result.status).toBe(200);
      expect(globalFetchSpy).toHaveBeenCalledTimes(3);
      expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
        'https://allowed.example.com/step1'
      );
      expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
        'https://mcp-server.example.com/step2'
      );
    });

    it('blocks a multi-hop redirect when an intermediate hop is disallowed', async () => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(302, 'https://allowed.example.com/step1'))
        .mockResolvedValueOnce(
          mockRedirectResponse(302, 'https://evil.internal.example.com/steal')
        );

      await expect(customFetch(targetUrl)).rejects.toThrow(
        'target url "https://evil.internal.example.com/steal" is not added to the Kibana config xpack.actions.allowedHosts'
      );

      expect(globalFetchSpy).toHaveBeenCalledTimes(2);
    });

    it('strips authorization header on cross-origin redirects', async () => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://allowed.example.com/v1/mcp'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await customFetch(targetUrl, {
        method: 'POST',
        headers: { Authorization: 'Bearer secret-token', 'Content-Type': 'application/json' },
      });

      const redirectHeaders = globalFetchSpy.mock.calls[1][1].headers;
      const redirectHeaderEntries =
        redirectHeaders instanceof Headers
          ? Object.fromEntries(redirectHeaders.entries())
          : redirectHeaders;

      expect(redirectHeaderEntries).not.toHaveProperty('authorization');
      expect(redirectHeaderEntries).toHaveProperty('content-type', 'application/json');
    });

    it('preserves authorization header on same-origin redirects', async () => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://mcp-server.example.com/v2/mcp'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await customFetch(targetUrl, {
        method: 'POST',
        headers: { Authorization: 'Bearer secret-token', 'Content-Type': 'application/json' },
      });

      const redirectHeaders = globalFetchSpy.mock.calls[1][1].headers;
      expect(redirectHeaders).toHaveProperty('Authorization', 'Bearer secret-token');
      expect(redirectHeaders).toHaveProperty('Content-Type', 'application/json');
    });

    it('strips both authorization and request-body-headers on cross-origin method change', async () => {
      const customFetch = buildCustomFetch(configurationUtilities, logger, targetUrl);

      globalFetchSpy
        .mockResolvedValueOnce(mockRedirectResponse(302, 'https://allowed.example.com/v1/mcp'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await customFetch(targetUrl, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer secret-token',
          'Content-Type': 'application/json',
          'X-Custom-Header': 'keep-me',
        },
      });

      const redirectHeaders = globalFetchSpy.mock.calls[1][1].headers;
      const entries =
        redirectHeaders instanceof Headers
          ? Object.fromEntries(redirectHeaders.entries())
          : redirectHeaders;

      expect(entries).not.toHaveProperty('authorization');
      expect(entries).not.toHaveProperty('content-type');
      expect(entries).toHaveProperty('x-custom-header', 'keep-me');

      const { method, body } = globalFetchSpy.mock.calls[1][1];
      expect(method).toBe('GET');
      expect(body).toBeUndefined();
    });
  });
});
