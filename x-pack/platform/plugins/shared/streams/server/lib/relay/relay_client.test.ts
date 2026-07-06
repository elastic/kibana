/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import undici from 'undici';
import type { Agent } from 'undici';
import { loggerMock } from '@kbn/logging-mocks';
import { RelayClientImpl } from './relay_client';
import { RelayResponseError, RelayUnreachableError } from './errors';
import type { BindingsResponseBody, StartInstallResponseBody, TenantsResponseBody } from './types';

describe('RelayClientImpl', () => {
  const logger = loggerMock.create();
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const relayResponse: StartInstallResponseBody = {
    authorize_url: 'https://slack.example/oauth/authorize?state=abc',
    state: 'abc',
    claim_id: 'claim-1',
    deployment_ref: 'deployment-1',
  };

  const okResponse = (body: unknown): Response =>
    ({
      ok: true,
      status: 200,
      json: async () => body,
    } as Response);

  const kibanaApiKey = 'a'.repeat(48);

  describe('startSlackInstall', () => {
    it('POSTs to /v1/slack/install with the kibana_api_key + created_by_user_key and returns the response', async () => {
      fetchMock.mockResolvedValue(okResponse(relayResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      const result = await client.startSlackInstall({
        kibanaApiKey,
        createdByUserKey: 'user-42',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://relay.example/v1/slack/install');
      expect(init).toMatchObject({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      expect(JSON.parse(init.body)).toEqual({
        kibana_api_key: kibanaApiKey,
        created_by_user_key: 'user-42',
      });
      expect(result).toEqual(relayResponse);
    });

    it('sends the content-type header', async () => {
      fetchMock.mockResolvedValue(okResponse(relayResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await client.startSlackInstall({ kibanaApiKey });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).toEqual({ 'content-type': 'application/json' });
    });

    it('trims a trailing slash from the base URL', async () => {
      fetchMock.mockResolvedValue(okResponse(relayResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example/', logger });

      await client.startSlackInstall({ kibanaApiKey });

      expect(fetchMock.mock.calls[0][0]).toBe('https://relay.example/v1/slack/install');
    });

    it('throws a RelayResponseError when the relay responds with a non-2xx status', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'unavailable',
      } as Response);
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await expect(client.startSlackInstall({ kibanaApiKey })).rejects.toThrow(RelayResponseError);
      await expect(client.startSlackInstall({ kibanaApiKey })).rejects.toThrow(/status 503/);
      expect(logger.error).toHaveBeenCalled();
    });

    it('throws a RelayUnreachableError when the request itself fails', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await expect(client.startSlackInstall({ kibanaApiKey })).rejects.toThrow(
        RelayUnreachableError
      );
      await expect(client.startSlackInstall({ kibanaApiKey })).rejects.toThrow(
        /Failed to reach the relay service/
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('listTenants', () => {
    const tenantsResponse: TenantsResponseBody = {
      items: [
        {
          surface: 'slack',
          tenant_key: 'team-1',
          deployment_ref: 'deployment-1',
          status: 'active',
        },
      ],
      next_cursor: 'opaque-cursor',
    };

    it('GETs /v1/tenants with no query string and returns the response', async () => {
      fetchMock.mockResolvedValue(okResponse(tenantsResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      const result = await client.listTenants();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://relay.example/v1/tenants');
      expect(init).toMatchObject({ method: 'GET', headers: {} });
      expect(result).toEqual(tenantsResponse);
    });

    it('encodes limit and cursor as query params', async () => {
      fetchMock.mockResolvedValue(okResponse(tenantsResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await client.listTenants({ limit: 10, cursor: 'prev-cursor' });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('https://relay.example/v1/tenants?limit=10&cursor=prev-cursor');
    });

    it('throws a RelayResponseError when the relay responds with a non-2xx status', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'unavailable',
      } as Response);
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await expect(client.listTenants()).rejects.toThrow(RelayResponseError);
    });

    it('throws a RelayUnreachableError when the request itself fails', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await expect(client.listTenants()).rejects.toThrow(RelayUnreachableError);
    });
  });

  describe('listBindings', () => {
    const bindingsResponse: BindingsResponseBody = {
      items: [
        {
          surface: 'slack',
          tenant_key: 'team-1',
          scope: { type: 'USER', id: 'user-42' },
          deployment_ref: 'deployment-1',
        },
      ],
      next_cursor: 'opaque-cursor',
    };

    it('GETs /v1/bindings with no query string and returns the response', async () => {
      fetchMock.mockResolvedValue(okResponse(bindingsResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      const result = await client.listBindings();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://relay.example/v1/bindings');
      expect(init).toMatchObject({ method: 'GET', headers: {} });
      expect(result).toEqual(bindingsResponse);
    });

    it('encodes limit and cursor as query params', async () => {
      fetchMock.mockResolvedValue(okResponse(bindingsResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await client.listBindings({ limit: 5, cursor: 'prev-cursor' });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('https://relay.example/v1/bindings?limit=5&cursor=prev-cursor');
    });

    it('throws a RelayResponseError when the relay responds with a non-2xx status', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'unavailable',
      } as Response);
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await expect(client.listBindings()).rejects.toThrow(RelayResponseError);
    });

    it('throws a RelayUnreachableError when the request itself fails', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await expect(client.listBindings()).rejects.toThrow(RelayUnreachableError);
    });
  });

  describe('TLS dispatcher', () => {
    const AGENT_MOCK = { name: 'mock-undici-agent' };
    const emptyTenantsResponse: TenantsResponseBody = { items: [] };
    let readFileSyncSpy: jest.SpyInstance;
    let agentSpy: jest.SpyInstance;

    beforeEach(() => {
      fetchMock.mockResolvedValue(okResponse(emptyTenantsResponse));
      readFileSyncSpy = jest
        .spyOn(fs, 'readFileSync')
        .mockImplementation((path) => `mocked file content for ${path}`);
      agentSpy = jest
        .spyOn(undici, 'Agent')
        .mockImplementation(() => AGENT_MOCK as unknown as Agent);
    });

    afterEach(() => {
      readFileSyncSpy.mockRestore();
      agentSpy.mockRestore();
    });

    it('does not build a dispatcher for verificationMode "full" with no custom TLS settings', async () => {
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await client.listTenants();

      expect(agentSpy).not.toHaveBeenCalled();
      const [, init] = fetchMock.mock.calls[0];
      expect(init.dispatcher).toBeUndefined();
    });

    it('builds a dispatcher with rejectUnauthorized: false for verificationMode "none"', async () => {
      const client = new RelayClientImpl({
        baseUrl: 'https://relay.example',
        tls: { verificationMode: 'none' },
        logger,
      });

      await client.listTenants();

      expect(agentSpy).toHaveBeenCalledWith({
        connect: { allowPartialTrustChain: true, rejectUnauthorized: false },
      });
      const [, init] = fetchMock.mock.calls[0];
      expect(init.dispatcher).toBe(AGENT_MOCK);
    });

    it('builds a dispatcher with checkServerIdentity overridden for verificationMode "certificate"', async () => {
      const client = new RelayClientImpl({
        baseUrl: 'https://relay.example',
        tls: { verificationMode: 'certificate', certificateAuthorities: '/some/ca/path' },
        logger,
      });

      await client.listTenants();

      expect(agentSpy).toHaveBeenCalledWith({
        connect: {
          ca: ['mocked file content for /some/ca/path'],
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
          checkServerIdentity: expect.any(Function),
        },
      });
    });

    it('reads the client certificate and key files for mTLS', async () => {
      const client = new RelayClientImpl({
        baseUrl: 'https://relay.example',
        tls: {
          verificationMode: 'full',
          certificate: '/path/to/cert.pem',
          key: '/path/to/key.pem',
        },
        logger,
      });

      await client.listTenants();

      expect(readFileSyncSpy).toHaveBeenCalledWith('/path/to/cert.pem', 'utf8');
      expect(readFileSyncSpy).toHaveBeenCalledWith('/path/to/key.pem', 'utf8');
      expect(agentSpy).toHaveBeenCalledWith({
        connect: {
          cert: 'mocked file content for /path/to/cert.pem',
          key: 'mocked file content for /path/to/key.pem',
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
        },
      });
    });

    it('reads every CA file path when certificateAuthorities is an array', async () => {
      const client = new RelayClientImpl({
        baseUrl: 'https://relay.example',
        tls: {
          verificationMode: 'full',
          certificateAuthorities: ['/some/ca/path-1', '/some/ca/path-2'],
        },
        logger,
      });

      await client.listTenants();

      expect(agentSpy).toHaveBeenCalledWith({
        connect: {
          ca: [
            'mocked file content for /some/ca/path-1',
            'mocked file content for /some/ca/path-2',
          ],
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
        },
      });
    });
  });
});
