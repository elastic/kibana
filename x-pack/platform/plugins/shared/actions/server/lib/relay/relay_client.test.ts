/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SSLSettings } from '@kbn/actions-utils';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import { request } from '../axios_utils';
import { RelayClient } from './relay_client';
import { RelayRequestError } from './relay_error';

jest.mock('../axios_utils');

const requestMock = jest.mocked(request);
const logger = {} as Logger;
const relaySSLSettings: SSLSettings = {
  verificationMode: 'full',
  cert: Buffer.from('certificate'),
  key: Buffer.from('key'),
};
const configurationUtilities = {
  getRelaySSLSettings: jest.fn().mockReturnValue(relaySSLSettings),
} as unknown as ActionsConfigurationUtilities;

const createClient = () =>
  new RelayClient({
    baseUrl: 'https://relay.test',
    configurationUtilities,
    logger,
  });

describe('RelayClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts installs through the Actions HTTP plane with Relay SSL overrides', async () => {
    requestMock.mockResolvedValue({
      status: 200,
      data: { authorize_url: 'https://slack/oauth', claim_id: 'claim-1' },
    } as never);

    await expect(
      createClient().startInstall({
        kibana_api_key: 'api-key',
        kibana_url: 'https://kibana.test',
        kibana_version: '9.2.0',
        license_info: 'platinum',
      })
    ).resolves.toEqual({
      authorize_url: 'https://slack/oauth',
      claim_id: 'claim-1',
    });

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://relay.test/v1/slack/install',
        method: 'post',
        configurationUtilities,
        sslOverrides: relaySSLSettings,
        maxRedirects: 0,
      })
    );
  });

  it('maps claim responses', async () => {
    requestMock.mockResolvedValueOnce({ status: 202, data: {} } as never);
    await expect(createClient().fetchClaim('claim-1')).resolves.toEqual({ status: 'pending' });

    requestMock.mockResolvedValueOnce({ status: 200, data: { tenant_key: 'tenant-1' } } as never);
    await expect(createClient().fetchClaim('claim-1')).resolves.toEqual({
      status: 'complete',
      tenant_key: 'tenant-1',
    });
  });

  it('maps a complete claim with an absent tenant_key to undefined', async () => {
    requestMock.mockResolvedValueOnce({ status: 200, data: {} } as never);
    await expect(createClient().fetchClaim('claim-1')).resolves.toEqual({
      status: 'complete',
      tenant_key: undefined,
    });
  });

  it('unbind posts the tenant key to the uninstall endpoint', async () => {
    requestMock.mockResolvedValue({ status: 200, data: {} } as never);

    await createClient().unbind('tenant-1');

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://relay.test/v1/slack/uninstall',
        method: 'post',
        data: { tenant_key: 'tenant-1' },
      })
    );
  });

  describe('listBindings', () => {
    it('GETs a single page and maps SUB entries with their display snapshot, exposing next_cursor', async () => {
      requestMock.mockResolvedValue({
        status: 200,
        data: {
          bindings: [
            {
              scope_type: 'SUB',
              scope_id: 'C123',
              display_name: 'general',
              visibility: 'public',
            },
            { scope_type: 'SUB', scope_id: 'C456' },
          ],
          next_cursor: 'cursor-2',
        },
      } as never);

      await expect(createClient().listBindings('team-A')).resolves.toEqual({
        bindings: [
          {
            scope_type: 'SUB',
            scope_id: 'C123',
            display_name: 'general',
            visibility: 'public',
          },
          {
            scope_type: 'SUB',
            scope_id: 'C456',
            display_name: undefined,
            visibility: undefined,
          },
        ],
        nextCursor: 'cursor-2',
      });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://relay.test/v1/slack/tenants/team-A/bindings?limit=200',
          method: 'get',
        })
      );
    });

    it('passes the caller-supplied cursor and limit through to the Relay', async () => {
      requestMock.mockResolvedValue({ status: 200, data: { bindings: [] } } as never);

      await createClient().listBindings('team-A', { cursor: 'cursor-1', limit: 10 });

      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://relay.test/v1/slack/tenants/team-A/bindings?limit=10&cursor=cursor-1',
        })
      );
    });

    it('encodes special characters in the tenantKey path segment', async () => {
      requestMock.mockResolvedValue({ status: 200, data: { bindings: [] } } as never);

      await createClient().listBindings('team/with spaces');

      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://relay.test/v1/slack/tenants/team%2Fwith%20spaces/bindings?limit=200',
        })
      );
    });

    it('returns an empty page with no cursor when the response bindings field is missing', async () => {
      requestMock.mockResolvedValue({ status: 200, data: {} } as never);
      await expect(createClient().listBindings('team-A')).resolves.toEqual({
        bindings: [],
        nextCursor: undefined,
      });
    });
  });

  describe('bind', () => {
    it('PUTs to the per-channel bind endpoint', async () => {
      requestMock.mockResolvedValue({ status: 200, data: { status: 'bound' } } as never);

      await createClient().bind('team-A', 'C123');

      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://relay.test/v1/slack/tenants/team-A/bindings/C123/bind',
          method: 'put',
        })
      );
    });

    it('encodes special characters in tenantKey and channelId', async () => {
      requestMock.mockResolvedValue({ status: 200, data: { status: 'bound' } } as never);

      await createClient().bind('team/A', 'C 1');

      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://relay.test/v1/slack/tenants/team%2FA/bindings/C%201/bind',
        })
      );
    });
  });

  describe('unbindChannel', () => {
    it('DELETEs the per-channel unbind endpoint', async () => {
      requestMock.mockResolvedValue({ status: 200, data: { status: 'unbound' } } as never);

      await createClient().unbindChannel('team-A', 'C123');

      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://relay.test/v1/slack/tenants/team-A/bindings/C123/unbind',
          method: 'delete',
        })
      );
    });
  });

  it('preserves Relay errors', async () => {
    requestMock.mockResolvedValue({
      status: 400,
      data: { message: 'workspace already bound' },
    } as never);

    const error = await createClient()
      .fetchClaim('claim-1')
      .then(() => undefined)
      .catch((cause) => cause);

    expect(error).toBeInstanceOf(RelayRequestError);
    expect(error).toMatchObject({
      statusCode: 400,
      relayMessage: 'workspace already bound',
      isTerminal: true,
    });
  });

  it('recognizes the configured Relay origin independently of the path', () => {
    const client = createClient();

    expect(client.isRelayOrigin('https://relay.test/v1/events?token=abc')).toBe(true);
    expect(client.isRelayOrigin('https://relay.test/v1/other')).toBe(true);
    expect(client.isRelayOrigin('https://other.test/v1/events')).toBe(false);
    expect(client.isRelayOrigin('not-a-url')).toBe(false);
  });

  it('posts callbacks with the same SSL overrides', async () => {
    requestMock.mockResolvedValue({ status: 204, data: undefined } as never);
    const signal = new AbortController().signal;

    await expect(
      createClient().postCallback(
        'https://relay.test/relay-provided/callback?token=abc',
        { execution_id: 'execution-1' },
        signal
      )
    ).resolves.toEqual({ status: 204 });

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://relay.test/relay-provided/callback?token=abc',
        data: { execution_id: 'execution-1' },
        signal,
        sslOverrides: relaySSLSettings,
      })
    );
  });

  it('rejects callback URLs outside the configured Relay origin', async () => {
    await expect(
      createClient().postCallback(
        'https://other.test/v1/events?token=abc',
        { execution_id: 'execution-1' },
        new AbortController().signal
      )
    ).rejects.toThrow('Callback URL does not match the configured Relay origin');

    expect(requestMock).not.toHaveBeenCalled();
  });
});
