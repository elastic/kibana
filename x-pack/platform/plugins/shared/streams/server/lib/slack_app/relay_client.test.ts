/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RelayClient } from './relay_client';
import { RelayRequestError } from './relay_error';

describe('RelayClient', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('POSTs the caller-supplied kibana_api_key to the install endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        authorize_url: 'https://slack/oauth',
        state: 's',
        claim_id: 'claim-1',
        deployment_ref: 'dep-1',
      }),
    });

    const client = new RelayClient('https://relay.test');
    const result = await client.startInstall({
      kibana_api_key: 'a'.repeat(64),
      created_by_user_key: 'admin',
    });

    expect(result).toEqual({
      authorize_url: 'https://slack/oauth',
      state: 's',
      claim_id: 'claim-1',
      deployment_ref: 'dep-1',
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.toString()).toBe('https://relay.test/v1/slack/install');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      kibana_api_key: 'a'.repeat(64),
      created_by_user_key: 'admin',
    });
  });

  it('sends the claim id and maps a 202 claim response to pending', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ status: 'pending' }),
    });

    const client = new RelayClient('https://relay.test');
    await expect(client.fetchClaim('claim-1')).resolves.toEqual({ status: 'pending' });
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ claim_id: 'claim-1' });
  });

  it('maps a 200 claim response to complete with the deployment ref and no secret', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ deployment_ref: 'dep-1' }),
    });

    const client = new RelayClient('https://relay.test');
    await expect(client.fetchClaim('claim-1')).resolves.toEqual({
      status: 'complete',
      deployment_ref: 'dep-1',
    });
  });

  it('throws on a non-ok response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });

    const client = new RelayClient('https://relay.test');
    await expect(client.fetchClaim('claim-1')).rejects.toThrow('status 502');
  });

  it('preserves the Relay error message and status on a 4xx response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'workspace already bound' }),
    });

    const client = new RelayClient('https://relay.test');
    const error = await client
      .startInstall({ kibana_api_key: 'a'.repeat(64) })
      .then(() => undefined)
      .catch((e) => e);

    expect(error).toBeInstanceOf(RelayRequestError);
    expect(error.statusCode).toBe(400);
    expect(error.relayMessage).toBe('workspace already bound');
    expect(error.isTerminal).toBe(true);
  });
});
