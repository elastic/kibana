/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import undici, { type Agent } from 'undici';
import type { Logger } from '@kbn/core/server';
import { RelayClient } from './relay_client';
import { RelayRequestError } from './relay_error';

const createLogger = () =>
  ({
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  } as unknown as Logger);

const createClient = (baseUrl = 'https://relay.test') =>
  new RelayClient({ baseUrl, logger: createLogger() });

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
        claim_id: 'claim-1',
      }),
    });

    const client = createClient();
    const result = await client.startInstall({
      kibana_api_key: 'a'.repeat(64),
      kibana_url: 'https://kibana.test',
      kibana_version: '9.2.0',
      license_info: 'platinum',
      created_by_user_key: 'admin',
    });

    expect(result).toEqual({
      authorize_url: 'https://slack/oauth',
      claim_id: 'claim-1',
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.toString()).toBe('https://relay.test/v1/slack/install');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      kibana_api_key: 'a'.repeat(64),
      kibana_url: 'https://kibana.test',
      kibana_version: '9.2.0',
      license_info: 'platinum',
      created_by_user_key: 'admin',
    });
  });

  it('sends the claim id and maps a 202 claim response to pending', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ status: 'pending' }),
    });

    const client = createClient();
    await expect(client.fetchClaim('claim-1')).resolves.toEqual({ status: 'pending' });
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ claim_id: 'claim-1' });
  });

  it('maps a 200 claim response to complete', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tenant_key: 'tenant-1' }),
    });

    const client = createClient();
    await expect(client.fetchClaim('claim-1')).resolves.toEqual({
      status: 'complete',
      tenant_key: 'tenant-1',
    });
  });

  it('throws on a non-ok response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });

    const client = createClient();
    await expect(client.fetchClaim('claim-1')).rejects.toThrow('status 502');
  });

  it('preserves the Relay error message and status on a 4xx response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'workspace already bound' }),
    });

    const client = createClient();
    const error = await client
      .startInstall({
        kibana_api_key: 'a'.repeat(64),
        kibana_url: 'https://kibana.test',
        kibana_version: '9.2.0',
        license_info: 'platinum',
      })
      .then(() => undefined)
      .catch((e) => e);

    expect(error).toBeInstanceOf(RelayRequestError);
    expect(error.statusCode).toBe(400);
    expect(error.relayMessage).toBe('workspace already bound');
    expect(error.isTerminal).toBe(true);
  });

  describe('TLS dispatcher', () => {
    let readFileSyncSpy: jest.SpyInstance;
    let agentSpy: jest.SpyInstance;

    beforeEach(() => {
      readFileSyncSpy = jest
        .spyOn(fs, 'readFileSync')
        .mockImplementation((path) => `mocked file content for ${path}`);
      agentSpy = jest.spyOn(undici, 'Agent').mockImplementation(() => ({} as unknown as Agent));
    });

    afterEach(() => {
      readFileSyncSpy.mockRestore();
      agentSpy.mockRestore();
    });

    it('does not create a custom dispatcher for `full` verification without custom TLS settings', () => {
      new RelayClient({ baseUrl: 'https://relay.test', logger: createLogger() });
      expect(agentSpy).not.toHaveBeenCalled();
    });

    it('creates a custom dispatcher for `full` verification when a custom CA is configured', () => {
      new RelayClient({
        baseUrl: 'https://relay.test',
        tls: { verificationMode: 'full', certificateAuthorities: '/some/ca/path' },
        logger: createLogger(),
      });

      expect(agentSpy).toHaveBeenCalledWith({
        connect: {
          ca: ['mocked file content for /some/ca/path'],
          cert: undefined,
          key: undefined,
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
        },
      });
    });

    it('reads the client certificate and key for mTLS', () => {
      new RelayClient({
        baseUrl: 'https://relay.test',
        tls: { verificationMode: 'full', certificate: '/some/cert.pem', key: '/some/key.pem' },
        logger: createLogger(),
      });

      expect(agentSpy).toHaveBeenCalledWith({
        connect: expect.objectContaining({
          cert: 'mocked file content for /some/cert.pem',
          key: 'mocked file content for /some/key.pem',
        }),
      });
    });

    it('disables verification and server identity checks in `none` mode', () => {
      new RelayClient({
        baseUrl: 'https://relay.test',
        tls: { verificationMode: 'none' },
        logger: createLogger(),
      });

      expect(agentSpy).toHaveBeenCalledWith({
        connect: expect.objectContaining({ rejectUnauthorized: false }),
      });
    });

    it('skips server identity checks (SAN/CN) in `certificate` mode', () => {
      new RelayClient({
        baseUrl: 'https://relay.test',
        tls: { verificationMode: 'certificate' },
        logger: createLogger(),
      });

      const { checkServerIdentity } = agentSpy.mock.calls[0][0].connect;
      expect(checkServerIdentity?.()).toBeUndefined();
    });
  });
});
