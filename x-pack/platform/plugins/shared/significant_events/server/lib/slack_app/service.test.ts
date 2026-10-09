/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { RelayRequestError } from '@kbn/actions-plugin/server';
import { RELAY_APP_CONNECTION_STATUS } from '../../../common/slack_app/types';
import { SlackAppService } from './service';
import { SlackAppUnavailableError } from './errors';
import { RELAY_APP_CONNECTION_SO_ID, RELAY_APP_CONNECTION_SO_TYPE } from './saved_object';

const request = {} as unknown as KibanaRequest;

// Shared across tests via `createHarness`'s injected `relayClient`, reset in `beforeEach`.
const startInstall = jest.fn();
const fetchClaim = jest.fn();
const unbind = jest.fn();

interface HarnessOptions {
  /** `streams.significantEventsAppsEnabled` feature flag value. Defaults to enabled. */
  featureFlagEnabled?: boolean;
  /** Whether `server.relayClient` (provided by the Actions plugin) exists. */
  hasRelayClient?: boolean;
}

function createHarness({ featureFlagEnabled = true, hasRelayClient = true }: HarnessOptions = {}) {
  const soClient = {
    get: jest
      .fn()
      .mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(RELAY_APP_CONNECTION_SO_TYPE)
      ),
    create: jest.fn().mockResolvedValue({ id: RELAY_APP_CONNECTION_SO_ID }),
    delete: jest.fn().mockResolvedValue({}),
  };
  const grantAsInternalUser = jest.fn();
  const invalidateAsInternalUser = jest.fn().mockResolvedValue({});
  const getBooleanValue = jest.fn().mockResolvedValue(featureFlagEnabled);
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    get: jest.fn(),
  } as unknown as Logger;
  (logger.get as jest.Mock).mockReturnValue(logger);

  const getLicense = jest.fn().mockResolvedValue({ type: 'platinum' });

  const server = {
    logger,
    config: {},
    agentBuilder: {},
    kibanaVersion: '9.2.0',
    relayClient: hasRelayClient ? { startInstall, fetchClaim, unbind } : undefined,
    core: {
      savedObjects: { getScopedClient: jest.fn().mockReturnValue(soClient) },
      featureFlags: { getBooleanValue },
      http: { basePath: { publicBaseUrl: 'https://kibana.test' }, getServerInfo: jest.fn() },
    },
    licensing: { getLicense },
    security: {
      authc: {
        apiKeys: { grantAsInternalUser, invalidateAsInternalUser },
        getCurrentUser: jest.fn().mockReturnValue({ username: 'admin' }),
      },
    },
  } as unknown as StreamsServer;

  return { server, soClient, grantAsInternalUser, invalidateAsInternalUser, getBooleanValue };
}

describe('SlackAppService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('throws when the feature flag is disabled', async () => {
      const { server } = createHarness({ featureFlagEnabled: false });
      await expect(new SlackAppService(server).connect(request)).rejects.toBeInstanceOf(
        SlackAppUnavailableError
      );
    });

    it('throws when the relay client is not configured', async () => {
      const { server } = createHarness({ hasRelayClient: false });
      await expect(new SlackAppService(server).connect(request)).rejects.toBeInstanceOf(
        SlackAppUnavailableError
      );
    });

    it('mints a scoped API key, supplies it as the deployment token, and writes the in-progress binding with the fixed SO id', async () => {
      const { server, soClient, grantAsInternalUser } = createHarness();
      grantAsInternalUser.mockResolvedValue({ id: 'key-1', name: 'k', api_key: 'secret' });
      startInstall.mockResolvedValue({
        authorize_url: 'https://slack/oauth',
        claim_id: 'claim-1',
      });

      const result = await new SlackAppService(server).connect(request);

      expect(grantAsInternalUser).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          metadata: expect.objectContaining({ managed: true, managed_by: 'nightshift-relay' }),
        })
      );

      // Read-only, least-privilege: direct ES read on observability signals only (queried as
      // this key), everything else (Streams, Significant Events, connectors) via Kibana features.
      const { kibana_role_descriptors: descriptors } = grantAsInternalUser.mock.calls[0][1];
      expect(descriptors.nightshift_relay_agent_builder).toEqual({
        elasticsearch: {
          cluster: ['monitor_inference'],
          indices: [
            {
              names: ['traces-*', 'logs-*', 'metrics-*', 'apm-*'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
          run_as: [],
        },
        kibana: [
          {
            spaces: ['*'],
            feature: {
              streams: ['read'],
              agentBuilder: ['read'],
              actions: ['read'],
              workflowsManagement: ['read'],
            },
          },
        ],
      });
      // The minted key is the caller-supplied credential; no relay-minted
      // secret exists anywhere in the exchange.
      expect(startInstall).toHaveBeenCalledWith({
        kibana_api_key: Buffer.from('key-1:secret').toString('base64'),
        kibana_url: 'https://kibana.test',
        kibana_version: '9.2.0',
        license_info: 'platinum',
        created_by_user_key: 'admin',
      });
      // Written to the fixed SO id with overwrite.
      expect(soClient.create).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        expect.objectContaining({
          status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
          apiKeyId: 'key-1',
          claimId: 'claim-1',
          tenantKey: null,
          surface: 'slack',
        }),
        { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
      );
      expect(result).toEqual({ authorizeUrl: 'https://slack/oauth' });
    });

    it('invalidates the minted key if the Relay install fails', async () => {
      const { server, invalidateAsInternalUser, grantAsInternalUser } = createHarness();
      grantAsInternalUser.mockResolvedValue({ id: 'key-1', name: 'k', api_key: 'secret' });
      startInstall.mockRejectedValue(new Error('relay down'));

      await expect(new SlackAppService(server).connect(request)).rejects.toThrow('relay down');
      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['key-1'] });
    });

    it('invalidates the previous key after a successful reconnect', async () => {
      const { server, soClient, invalidateAsInternalUser, grantAsInternalUser } = createHarness();
      // An existing connection is found via readConnection.
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          apiKeyId: 'old-key',
          tenantKey: 'tenant-A',
          surface: 'slack',
        },
      });
      grantAsInternalUser.mockResolvedValue({ id: 'new-key', name: 'k', api_key: 'secret' });
      startInstall.mockResolvedValue({ authorize_url: 'https://slack/oauth', claim_id: 'claim-2' });

      await new SlackAppService(server).connect(request);

      // The old key is invalidated after the new install succeeds.
      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['old-key'] });
      // The new in-progress state is written to the same fixed SO id.
      expect(soClient.create).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        expect.objectContaining({ apiKeyId: 'new-key', claimId: 'claim-2' }),
        { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
      );
    });

    // Regression: invalidating the old key up front (before startInstall) would
    // brick an already-working connection if the reconnect failed, since the SO is
    // never rewritten on failure. The old key must only be invalidated after the
    // new install succeeds.
    it('leaves an existing connection untouched when a reconnect attempt fails', async () => {
      const { server, soClient, invalidateAsInternalUser, grantAsInternalUser } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          apiKeyId: 'old-key',
          surface: 'slack',
        },
      });
      grantAsInternalUser.mockResolvedValue({ id: 'new-key', name: 'k', api_key: 'secret' });
      startInstall.mockRejectedValue(new Error('relay down'));

      await expect(new SlackAppService(server).connect(request)).rejects.toThrow('relay down');

      // Only the newly-minted (unused) key is invalidated; the existing
      // connection's key and record are left alone.
      expect(invalidateAsInternalUser).toHaveBeenCalledTimes(1);
      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['new-key'] });
      expect(invalidateAsInternalUser).not.toHaveBeenCalledWith({ ids: ['old-key'] });
      expect(soClient.create).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('reports unavailable when the relay client is not configured', async () => {
      const { server } = createHarness({ hasRelayClient: false });
      await expect(new SlackAppService(server).getStatus(request)).resolves.toEqual({
        available: false,
        status: RELAY_APP_CONNECTION_STATUS.notConnected,
      });
    });

    it('reports unavailable when the feature flag is disabled', async () => {
      const { server } = createHarness({ featureFlagEnabled: false });
      await expect(new SlackAppService(server).getStatus(request)).resolves.toEqual({
        available: false,
        status: RELAY_APP_CONNECTION_STATUS.notConnected,
      });
    });

    it('reports not_connected when no connection exists', async () => {
      const { server } = createHarness();
      await expect(new SlackAppService(server).getStatus(request)).resolves.toEqual({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.notConnected,
      });
    });

    it('returns existing status as-is when not in progress', async () => {
      const { server, soClient } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          tenantKey: 'tenant-A',
          apiKeyId: 'key-1',
        },
      });

      const result = await new SlackAppService(server).getStatus(request);

      expect(fetchClaim).not.toHaveBeenCalled();
      expect(result).toEqual({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.connected,
      });
    });

    it('returns error status with error field', async () => {
      const { server, soClient } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.error,
          error: 'something went wrong',
        },
      });

      const result = await new SlackAppService(server).getStatus(request);
      expect(result).toEqual({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.error,
        error: 'something went wrong',
      });
    });

    it('stays in progress while the Relay claim is pending', async () => {
      const { server, soClient } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
          apiKeyId: 'key-1',
          claimId: 'claim-1',
        },
      });
      fetchClaim.mockResolvedValue({ status: 'pending' });

      const result = await new SlackAppService(server).getStatus(request);

      expect(fetchClaim).toHaveBeenCalledWith('claim-1');
      expect(soClient.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
      });
    });

    it('fails terminally when an in-progress install has no claim id', async () => {
      const { server, soClient, invalidateAsInternalUser } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
          apiKeyId: 'key-1',
        },
      });

      const result = await new SlackAppService(server).getStatus(request);

      expect(fetchClaim).not.toHaveBeenCalled();
      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['key-1'] });
      expect(soClient.create).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        expect.objectContaining({
          status: RELAY_APP_CONNECTION_STATUS.error,
          apiKeyId: null,
          error: 'missing claim id',
        }),
        { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
      );
      expect(result).toMatchObject({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.error,
        error: 'missing claim id',
      });
    });

    it('fails the install terminally on a 4xx claim response, invalidating the orphaned key', async () => {
      const { server, soClient, invalidateAsInternalUser } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
          apiKeyId: 'key-1',
          claimId: 'claim-1',
        },
      });
      fetchClaim.mockRejectedValue(
        new RelayRequestError('/v1/slack/install/claim', 400, 'claim expired')
      );

      const result = await new SlackAppService(server).getStatus(request);

      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['key-1'] });
      expect(soClient.create).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        expect.objectContaining({
          status: RELAY_APP_CONNECTION_STATUS.error,
          apiKeyId: null,
          error: 'claim expired',
        }),
        { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
      );
      expect(result).toMatchObject({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.error,
        error: 'claim expired',
      });
    });

    it('keeps polling on transient (5xx / network) claim failures', async () => {
      const { server, soClient, invalidateAsInternalUser } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
          apiKeyId: 'key-1',
          claimId: 'claim-1',
        },
      });
      fetchClaim.mockRejectedValue(new RelayRequestError('/v1/slack/install/claim', 502));

      const result = await new SlackAppService(server).getStatus(request);

      expect(invalidateAsInternalUser).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
      expect(result.status).toBe(RELAY_APP_CONNECTION_STATUS.oauthInProgress);
    });

    it('advances an in-progress install to connected when the Relay claim completes', async () => {
      const { server, soClient } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
          apiKeyId: 'key-1',
          claimId: 'claim-1',
        },
      });
      fetchClaim.mockResolvedValue({ status: 'complete', tenant_key: 'tenant-A' });

      const result = await new SlackAppService(server).getStatus(request);

      expect(soClient.create).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        expect.objectContaining({
          status: RELAY_APP_CONNECTION_STATUS.connected,
          tenantKey: 'tenant-A',
        }),
        { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
      );
      expect(result).toEqual({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.connected,
      });
    });

    it('fails the install terminally when a completed claim carries no tenant key', async () => {
      const { server, soClient, invalidateAsInternalUser } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
          apiKeyId: 'key-1',
          claimId: 'claim-1',
        },
      });
      fetchClaim.mockResolvedValue({ status: 'complete', tenant_key: undefined });

      const result = await new SlackAppService(server).getStatus(request);

      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['key-1'] });
      expect(soClient.create).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        expect.objectContaining({
          status: RELAY_APP_CONNECTION_STATUS.error,
          apiKeyId: null,
          error: 'completed claim has no tenant key',
        }),
        { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
      );
      expect(result).toMatchObject({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.error,
        error: 'completed claim has no tenant key',
      });
    });
  });

  describe('disconnect', () => {
    it('invalidates the key, unbinds from the Relay by tenantKey, and deletes the binding', async () => {
      const { server, soClient, invalidateAsInternalUser } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          apiKeyId: 'key-1',
          tenantKey: 'tenant-A',
          surface: 'slack',
        },
      });
      unbind.mockResolvedValue(undefined);

      const result = await new SlackAppService(server).disconnect(request);

      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['key-1'] });
      expect(unbind).toHaveBeenCalledWith('tenant-A');
      expect(soClient.delete).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        RELAY_APP_CONNECTION_SO_ID
      );
      expect(result).toEqual({ status: 'disconnected' });
    });

    it('skips the Relay unbind when the binding is still in-progress (no tenantKey)', async () => {
      const { server, soClient, invalidateAsInternalUser } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
          apiKeyId: 'key-1',
          claimId: 'claim-1',
          tenantKey: null,
          surface: 'slack',
        },
      });

      const result = await new SlackAppService(server).disconnect(request);

      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['key-1'] });
      expect(unbind).not.toHaveBeenCalled();
      expect(soClient.delete).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        RELAY_APP_CONNECTION_SO_ID
      );
      expect(result).toEqual({ status: 'disconnected' });
    });

    it('keeps the binding in an error state and throws when the Relay unbind fails', async () => {
      const { server, soClient, invalidateAsInternalUser } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          apiKeyId: 'key-1',
          tenantKey: 'tenant-A',
        },
      });
      unbind.mockRejectedValue(
        new RelayRequestError(
          '/v1/slack/uninstall',
          502,
          'teardown incomplete: 1 workspace(s) failed and remain bound; retry to finish'
        )
      );

      await expect(new SlackAppService(server).disconnect(request)).rejects.toThrow(
        'teardown incomplete: 1 workspace(s) failed and remain bound; retry to finish'
      );

      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['key-1'] });
      expect(soClient.delete).not.toHaveBeenCalled();
      expect(soClient.create).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        expect.objectContaining({
          status: RELAY_APP_CONNECTION_STATUS.error,
          apiKeyId: null,
          error: 'teardown incomplete: 1 workspace(s) failed and remain bound; retry to finish',
        }),
        { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
      );
    });

    it('is a no-op when the connection does not exist', async () => {
      const { server, soClient, invalidateAsInternalUser } = createHarness();
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(RELAY_APP_CONNECTION_SO_TYPE)
      );

      await expect(new SlackAppService(server).disconnect(request)).resolves.toEqual({
        status: 'disconnected',
      });
      expect(invalidateAsInternalUser).not.toHaveBeenCalled();
      expect(soClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('listBindings', () => {
    const listBindings = jest.fn();

    function createHarnessWithListBindings(opts?: HarnessOptions) {
      const harness = createHarness(opts);
      // Re-inject relayClient with listBindings alongside the other mocks.
      (harness.server as unknown as { relayClient: unknown }).relayClient = {
        startInstall,
        fetchClaim,
        unbind,
        listBindings,
      };
      return harness;
    }

    beforeEach(() => {
      listBindings.mockReset();
    });

    it('returns empty bindings when the relay client is not available', async () => {
      const { server } = createHarness({ hasRelayClient: false });
      await expect(new SlackAppService(server).listBindings(request)).resolves.toEqual({
        bindings: [],
      });
    });

    it('returns empty bindings when the connection does not exist', async () => {
      const { server } = createHarnessWithListBindings();
      await expect(new SlackAppService(server).listBindings(request)).resolves.toEqual({
        bindings: [],
      });
    });

    it('returns empty bindings when the connection is not yet connected', async () => {
      const { server, soClient } = createHarnessWithListBindings();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
          tenantKey: null,
        },
      });
      await expect(new SlackAppService(server).listBindings(request)).resolves.toEqual({
        bindings: [],
      });
    });

    it('returns empty bindings when the connection is connected but has no tenantKey', async () => {
      const { server, soClient } = createHarnessWithListBindings();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          tenantKey: null,
        },
      });
      await expect(new SlackAppService(server).listBindings(request)).resolves.toEqual({
        bindings: [],
      });
    });

    it('maps a page of connected SUB bindings from the relay, using the persisted display name', async () => {
      const { server, soClient } = createHarnessWithListBindings();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          tenantKey: 'tenant-A',
        },
      });
      listBindings.mockResolvedValue({
        bindings: [
          { scope_type: 'SUB', scope_id: 'C123', display_name: 'general', visibility: 'public' },
          { scope_type: 'SUB', scope_id: 'C456' }, // no persisted display snapshot
        ],
        nextCursor: 'cursor-2',
      });

      await expect(new SlackAppService(server).listBindings(request)).resolves.toEqual({
        bindings: [
          { channel: 'C123', displayName: 'general', status: 'bound_to_self' },
          { channel: 'C456', status: 'bound_to_self' },
        ],
        nextCursor: 'cursor-2',
      });
    });

    it('forwards the cursor and perPage to the relay client', async () => {
      const { server, soClient } = createHarnessWithListBindings();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          tenantKey: 'tenant-A',
        },
      });
      listBindings.mockResolvedValue({ bindings: [], nextCursor: undefined });

      await new SlackAppService(server).listBindings(request, { cursor: 'cursor-1', perPage: 10 });

      expect(listBindings).toHaveBeenCalledWith('tenant-A', { cursor: 'cursor-1', limit: 10 });
    });

    it('ignores entries without a scope_id', async () => {
      const { server, soClient } = createHarnessWithListBindings();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          tenantKey: 'tenant-A',
        },
      });
      listBindings.mockResolvedValue({
        bindings: [
          { scope_type: 'TENANT' },
          { scope_type: 'SUB', scope_id: 'C123', display_name: 'general' },
        ],
        nextCursor: undefined,
      });

      await expect(new SlackAppService(server).listBindings(request)).resolves.toEqual({
        bindings: [{ channel: 'C123', displayName: 'general', status: 'bound_to_self' }],
        nextCursor: undefined,
      });
    });

    it('rethrows and logs a warning when the bindings API call fails', async () => {
      const { server, soClient } = createHarnessWithListBindings();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          tenantKey: 'tenant-A',
        },
      });
      const relayError = new RelayRequestError(
        '/v1/slack/tenants/tenant-A/bindings',
        403,
        'not installed'
      );
      listBindings.mockRejectedValue(relayError);

      await expect(new SlackAppService(server).listBindings(request)).rejects.toBe(relayError);
      expect(server.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list bindings from Relay')
      );
    });
  });

  describe('bindChannel / unbindChannel', () => {
    const bind = jest.fn();
    const unbindChannel = jest.fn();

    function createHarnessWithChannelOps(opts?: HarnessOptions) {
      const harness = createHarness(opts);
      (harness.server as unknown as { relayClient: unknown }).relayClient = {
        startInstall,
        fetchClaim,
        unbind,
        listBindings: jest.fn(),
        bind,
        unbindChannel,
      };
      return harness;
    }

    beforeEach(() => {
      bind.mockReset();
      unbindChannel.mockReset();
    });

    it('bindChannel calls relay bind with tenantKey and channelId', async () => {
      const { server, soClient } = createHarnessWithChannelOps();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          tenantKey: 'tenant-A',
        },
      });
      bind.mockResolvedValue(undefined);

      await new SlackAppService(server).bindChannel(request, 'C123');

      expect(bind).toHaveBeenCalledWith('tenant-A', 'C123');
    });

    it('bindChannel throws when the relay client is not available', async () => {
      const { server } = createHarness({ hasRelayClient: false });
      await expect(new SlackAppService(server).bindChannel(request, 'C123')).rejects.toBeInstanceOf(
        SlackAppUnavailableError
      );
    });

    it('bindChannel throws when the connection is not connected', async () => {
      const { server, soClient } = createHarnessWithChannelOps();
      soClient.get.mockResolvedValue({
        attributes: { status: RELAY_APP_CONNECTION_STATUS.oauthInProgress, tenantKey: null },
      });

      await expect(new SlackAppService(server).bindChannel(request, 'C123')).rejects.toThrow(
        'not in a connected state'
      );
    });

    it('unbindChannel calls relay unbindChannel with tenantKey and channelId', async () => {
      const { server, soClient } = createHarnessWithChannelOps();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          tenantKey: 'tenant-A',
        },
      });
      unbindChannel.mockResolvedValue(undefined);

      await new SlackAppService(server).unbindChannel(request, 'C123');

      expect(unbindChannel).toHaveBeenCalledWith('tenant-A', 'C123');
    });
  });
});
