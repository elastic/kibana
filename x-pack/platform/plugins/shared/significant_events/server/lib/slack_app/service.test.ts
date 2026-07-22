/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { RELAY_APP_CONNECTION_STATUS } from '../../../common/slack_app/types';
import { SlackAppService } from './service';
import { SlackAppUnavailableError } from './errors';
import { RelayRequestError } from './relay_error';
import { RELAY_APP_CONNECTION_SO_ID, RELAY_APP_CONNECTION_SO_TYPE } from './saved_object';

const request = {} as unknown as KibanaRequest;

// Shared across tests via `createHarness`'s injected `relayClient`, reset in `beforeEach`.
const startInstall = jest.fn();
const fetchClaim = jest.fn();
const unbind = jest.fn();

interface HarnessOptions {
  /** `streams.significantEventsAppsEnabled` feature flag value. Defaults to enabled. */
  featureFlagEnabled?: boolean;
  /** Whether `server.relayClient` (built at plugin start from `relayService` config) exists. */
  hasRelayClient?: boolean;
}

function createHarness({ featureFlagEnabled = true, hasRelayClient = true }: HarnessOptions = {}) {
  const soClient = {
    // Defaults to "no connection exists yet"; individual tests override this
    // with mockResolvedValue to simulate an existing connection document.
    get: jest
      .fn()
      .mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(RELAY_APP_CONNECTION_SO_TYPE)
      ),
    create: jest.fn().mockResolvedValue({}),
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
    config: { relayService: { url: 'https://relay.test' } },
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

    it('mints a scoped API key, supplies it as the deployment token, and persists in-progress state', async () => {
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
          kibana_role_descriptors: {
            nightshift_relay_agent_builder: expect.objectContaining({
              elasticsearch: { cluster: ['monitor_inference'], indices: [], run_as: [] },
              kibana: [{ spaces: ['*'], feature: { agentBuilder: ['read'], actions: ['read'] } }],
            }),
          },
        })
      );
      // The minted key is the caller-supplied credential; no relay-minted
      // secret exists anywhere in the exchange.
      expect(startInstall).toHaveBeenCalledWith({
        kibana_api_key: Buffer.from('key-1:secret').toString('base64'),
        kibana_url: 'https://kibana.test',
        kibana_version: '9.2.0',
        license_info: 'platinum',
        created_by_user_key: 'admin',
      });
      expect(soClient.create).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        expect.objectContaining({
          status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
          apiKeyId: 'key-1',
          claimId: 'claim-1',
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

    it('invalidates the pre-existing key once the new install succeeds, when a connection already exists', async () => {
      const { server, soClient, invalidateAsInternalUser, grantAsInternalUser } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          apiKeyId: 'old-key',
          surface: 'slack',
        },
      });
      grantAsInternalUser.mockResolvedValue({ id: 'new-key', name: 'k', api_key: 'secret' });
      startInstall.mockResolvedValue({
        authorize_url: 'https://slack/oauth',
        claim_id: 'claim-2',
      });

      const result = await new SlackAppService(server).connect(request);

      // The old key is invalidated rather than left orphaned when the
      // connection document gets overwritten.
      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['old-key'] });
      expect(soClient.create).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        expect.objectContaining({ apiKeyId: 'new-key', claimId: 'claim-2' }),
        { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
      );
      expect(result).toEqual({ authorizeUrl: 'https://slack/oauth' });
    });

    // Regression coverage: invalidating the old key up front (before startInstall
    // is attempted) would brick an already-working connection if the reconnect
    // then failed, since the SO is never rewritten on failure. The old key must
    // only be invalidated once the new install has actually succeeded.
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

    it('reports not_connected when no connection document exists', async () => {
      const { server, soClient } = createHarness();
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(RELAY_APP_CONNECTION_SO_TYPE)
      );
      await expect(new SlackAppService(server).getStatus(request)).resolves.toEqual({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.notConnected,
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

      await expect(new SlackAppService(server).getStatus(request)).resolves.toEqual({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
      });
      expect(fetchClaim).toHaveBeenCalledWith('claim-1');
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('fails terminally when an in-progress install has no claim id to poll with', async () => {
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
      expect(result).toEqual({
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
        new RelayRequestError('/v1/slack/install/claim', 400, 'workspace already bound')
      );

      const result = await new SlackAppService(server).getStatus(request);

      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['key-1'] });
      expect(soClient.create).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        expect.objectContaining({
          status: RELAY_APP_CONNECTION_STATUS.error,
          apiKeyId: null,
          error: 'workspace already bound',
        }),
        { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
      );
      expect(result).toEqual({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.error,
        error: 'workspace already bound',
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

      await expect(new SlackAppService(server).getStatus(request)).resolves.toEqual({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
      });
      expect(invalidateAsInternalUser).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
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
      fetchClaim.mockResolvedValue({ status: 'complete', tenant_key: 'tenant-1' });

      const result = await new SlackAppService(server).getStatus(request);

      expect(soClient.create).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        expect.objectContaining({
          status: RELAY_APP_CONNECTION_STATUS.connected,
          tenantKey: 'tenant-1',
        }),
        { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
      );
      expect(result).toEqual({
        available: true,
        status: RELAY_APP_CONNECTION_STATUS.connected,
      });
    });
  });

  describe('disconnect', () => {
    it('invalidates the key, unbinds from the Relay, and deletes the connection', async () => {
      const { server, soClient, invalidateAsInternalUser } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          apiKeyId: 'key-1',
          surface: 'slack',
        },
      });
      unbind.mockResolvedValue(undefined);

      const result = await new SlackAppService(server).disconnect(request);

      expect(invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['key-1'] });
      expect(unbind).toHaveBeenCalled();
      expect(soClient.delete).toHaveBeenCalledWith(
        RELAY_APP_CONNECTION_SO_TYPE,
        RELAY_APP_CONNECTION_SO_ID
      );
      expect(result).toEqual({ success: true });
    });

    it('keeps the connection in an error state and reports failure when the Relay unbind fails', async () => {
      const { server, soClient, invalidateAsInternalUser } = createHarness();
      soClient.get.mockResolvedValue({
        attributes: {
          status: RELAY_APP_CONNECTION_STATUS.connected,
          apiKeyId: 'key-1',
        },
      });
      unbind.mockRejectedValue(
        new RelayRequestError(
          '/v1/slack/uninstall',
          502,
          'teardown incomplete: 1 workspace(s) failed and remain bound; retry to finish'
        )
      );

      const result = await new SlackAppService(server).disconnect(request);

      // The key is still invalidated even though the Relay-side teardown failed,
      // but the connection record survives (not deleted) so the user can retry —
      // the Relay's own contract says the caller must never see success while a
      // binding survives.
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
      expect(result).toEqual({ success: false });
    });

    it('is a no-op when there is no connection', async () => {
      const { server, soClient, invalidateAsInternalUser } = createHarness();
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(RELAY_APP_CONNECTION_SO_TYPE)
      );

      await expect(new SlackAppService(server).disconnect(request)).resolves.toEqual({
        success: true,
      });
      expect(invalidateAsInternalUser).not.toHaveBeenCalled();
      expect(soClient.delete).not.toHaveBeenCalled();
    });
  });
});
