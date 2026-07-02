/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { RelayClientImpl } from './relay_client';
import { RelayResponseError, RelayUnreachableError } from './errors';
import type { StartInstallResponseBody } from './types';

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

  const deploymentToken = 'a'.repeat(48);

  describe('startSlackInstall', () => {
    it('POSTs to /v1/slack/install with the deployment_token + created_by_user_key and maps the response', async () => {
      fetchMock.mockResolvedValue(okResponse(relayResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      const result = await client.startSlackInstall({
        deploymentToken,
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
        deployment_token: deploymentToken,
        created_by_user_key: 'user-42',
      });
      expect(result).toEqual({ authorizeUrl: relayResponse.authorize_url });
    });

    it('sends only the content-type header when no headers are configured', async () => {
      fetchMock.mockResolvedValue(okResponse(relayResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await client.startSlackInstall({ deploymentToken });

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

      await client.startSlackInstall({ deploymentToken });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).toEqual({
        'content-type': 'application/json',
        'x-forwarded-client-cert': 'DeploymentID=dev-deployment;OrgID=someorg',
      });
    });

    it('trims a trailing slash from the base URL', async () => {
      fetchMock.mockResolvedValue(okResponse(relayResponse));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example/', logger });

      await client.startSlackInstall({ deploymentToken });

      expect(fetchMock.mock.calls[0][0]).toBe('https://relay.example/v1/slack/install');
    });

    it('throws a RelayResponseError when the relay responds with a non-2xx status', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'unavailable',
      } as Response);
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await expect(client.startSlackInstall({ deploymentToken })).rejects.toThrow(
        RelayResponseError
      );
      await expect(client.startSlackInstall({ deploymentToken })).rejects.toThrow(/status 503/);
      expect(logger.error).toHaveBeenCalled();
    });

    it('throws a RelayUnreachableError when the request itself fails', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      const client = new RelayClientImpl({ baseUrl: 'https://relay.example', logger });

      await expect(client.startSlackInstall({ deploymentToken })).rejects.toThrow(
        RelayUnreachableError
      );
      await expect(client.startSlackInstall({ deploymentToken })).rejects.toThrow(
        /Failed to reach the relay service/
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
