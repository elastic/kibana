/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    it('POSTs to /v1/slack/install with the kibana_api_key + created_by_user_key and maps the response', async () => {
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
      expect(result).toEqual({ authorizeUrl: relayResponse.authorize_url });
    });

    it('sends only the content-type header when no headers are configured', async () => {
      fetchMock.mockResolvedValue(okResponse(relayResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await client.startSlackInstall({ kibanaApiKey });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).toEqual({ 'content-type': 'application/json' });
    });

    it('sends configured headers, e.g. x-forwarded-client-cert', async () => {
      fetchMock.mockResolvedValue(okResponse(relayResponse));
      const client = new RelayClientImpl({
        baseUrl: 'https://relay.example',
        headers: { 'x-forwarded-client-cert': 'DeploymentID=dev-deployment;OrgID=someorg' },
        logger,
      });

      await client.startSlackInstall({ kibanaApiKey });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).toEqual({
        'content-type': 'application/json',
        'x-forwarded-client-cert': 'DeploymentID=dev-deployment;OrgID=someorg',
      });
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
      ok: true,
      tenants: [
        {
          surface: 'slack',
          tenant_key: 'team-1',
          deployment_ref: 'deployment-1',
          status: 'active',
        },
      ],
      next_cursor: 'opaque-cursor',
    };

    it('GETs /v1/tenants with no query string and maps the response', async () => {
      fetchMock.mockResolvedValue(okResponse(tenantsResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      const result = await client.listTenants();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://relay.example/v1/tenants');
      expect(init).toMatchObject({ method: 'GET', headers: {} });
      expect(result).toEqual({
        tenants: [
          {
            surface: 'slack',
            tenantKey: 'team-1',
            deploymentRef: 'deployment-1',
            status: 'active',
          },
        ],
        nextCursor: 'opaque-cursor',
      });
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
      ok: true,
      bindings: [
        {
          surface: 'slack',
          tenant_key: 'team-1',
          scope: { type: 'USER', id: 'user-42' },
          deployment_ref: 'deployment-1',
        },
      ],
      next_cursor: 'opaque-cursor',
    };

    it('GETs /v1/bindings with no query string and maps the response', async () => {
      fetchMock.mockResolvedValue(okResponse(bindingsResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      const result = await client.listBindings();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://relay.example/v1/bindings');
      expect(init).toMatchObject({ method: 'GET', headers: {} });
      expect(result).toEqual({
        bindings: [
          {
            surface: 'slack',
            tenantKey: 'team-1',
            scope: { type: 'USER', id: 'user-42' },
            deploymentRef: 'deployment-1',
          },
        ],
        nextCursor: 'opaque-cursor',
      });
    });

    it('encodes limit and cursor as query params', async () => {
      fetchMock.mockResolvedValue(okResponse(bindingsResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await client.listBindings({ limit: 5, cursor: 'prev-cursor' });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('https://relay.example/v1/bindings?limit=5&cursor=prev-cursor');
    });

    it('sends configured headers, e.g. x-forwarded-client-cert', async () => {
      fetchMock.mockResolvedValue(okResponse(bindingsResponse));
      const client = new RelayClientImpl({
        baseUrl: 'https://relay.example',
        headers: { 'x-forwarded-client-cert': 'DeploymentID=dev-deployment;OrgID=someorg' },
        logger,
      });

      await client.listBindings();

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).toEqual({
        'x-forwarded-client-cert': 'DeploymentID=dev-deployment;OrgID=someorg',
      });
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
});
