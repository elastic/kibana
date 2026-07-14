/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { RelayClientContract } from '@kbn/significant-events-schema';
import type {
  SlackAppConnectResponse,
  SlackAppDisconnectResponse,
  SlackAppStatusResponse,
} from '../../../common/slack_app/types';
import { RELAY_APP_CONNECTION_STATUS } from '../../../common/slack_app/types';
import { STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG } from '../../../common/feature_flags';
import {
  RELAY_APP_CONNECTION_SO_ID,
  RELAY_APP_CONNECTION_SO_TYPE,
  type RelayAppConnectionAttributes,
} from './saved_object';
import { RelayRequestError } from './relay_error';
import { SlackAppUnavailableError } from './errors';
import { getKibanaUrl } from './get_kibana_url';

export class SlackAppService {
  private readonly logger: Logger;

  constructor(private readonly server: StreamsServer) {
    this.logger = server.logger.get('slack-app');
  }

  /**
   * feature flag on + `relayService` configured (the injected singleton client exists) +
   * agentBuilder available on this deployment.
   */
  private async getRelayClient(): Promise<RelayClientContract | undefined> {
    const { relayClient, agentBuilder } = this.server;
    if (!relayClient || !agentBuilder) {
      return undefined;
    }
    const enabled = await this.server.core.featureFlags.getBooleanValue(
      STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG,
      false
    );
    return enabled ? relayClient : undefined;
  }

  private getSoClient(request: KibanaRequest): SavedObjectsClientContract {
    return this.server.core.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [RELAY_APP_CONNECTION_SO_TYPE],
    });
  }

  private async readConnection(
    soClient: SavedObjectsClientContract
  ): Promise<RelayAppConnectionAttributes | undefined> {
    try {
      const so = await soClient.get<RelayAppConnectionAttributes>(
        RELAY_APP_CONNECTION_SO_TYPE,
        RELAY_APP_CONNECTION_SO_ID
      );
      return so.attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async writeConnection(
    soClient: SavedObjectsClientContract,
    attributes: Omit<RelayAppConnectionAttributes, 'updatedAt'>
  ): Promise<void> {
    await soClient.create<RelayAppConnectionAttributes>(
      RELAY_APP_CONNECTION_SO_TYPE,
      { ...attributes, updatedAt: new Date().toISOString() },
      { id: RELAY_APP_CONNECTION_SO_ID, overwrite: true }
    );
  }

  /** Best-effort key invalidation: never blocks the caller, only logs on failure. */
  private async invalidateApiKey(apiKeyId: string, context: string): Promise<void> {
    await this.server.security.authc.apiKeys
      .invalidateAsInternalUser({ ids: [apiKeyId] })
      .catch((error) => {
        this.logger.warn(`Failed to invalidate API key ${apiKeyId} ${context}: ${error.message}`);
      });
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof RelayRequestError) {
      return error.relayMessage ?? error.message;
    }
    if (error instanceof Error && error.cause instanceof Error) {
      return `${error.message} cause: ${error.cause.message}`;
    }
    return error instanceof Error ? error.message : String(error);
  }

  async connect(request: KibanaRequest): Promise<SlackAppConnectResponse> {
    const relayClient = await this.getRelayClient();
    if (!relayClient) {
      throw new SlackAppUnavailableError(
        'The Elastic Slack App is not available on this deployment'
      );
    }

    const soClient = this.getSoClient(request);
    const now = new Date().toISOString();

    // A prior connection (connected, or a still-in-progress install) may already
    // hold a live managed key. It's invalidated only once the new install
    // succeeds (below), not here — invalidating it up front would brick a
    // working connection if startInstall then failed, since the SO write also
    // only happens on success.
    const existingConnection = await this.readConnection(soClient);

    // Mint a managed, least-privilege ES API key scoped to Agent Builder read. The key
    // is granted on behalf of the connecting user but survives their deletion (ES keys
    // outlive their owner). The connecting user must hold `agentBuilder:read`, otherwise
    // the granted key is under-privileged (grant intersects with the owner's privileges).
    // `monitor_inference` and the `actions` feature are required for converse to list
    // inference endpoints and stack connectors (see getConnectorList).
    const apiKeyResult = await this.server.security.authc.apiKeys.grantAsInternalUser(request, {
      name: 'nightshift-relay-agent-builder',
      metadata: { managed: true, managed_by: 'nightshift-relay', type: 'agent_builder_converse' },
      kibana_role_descriptors: {
        nightshift_relay_agent_builder: {
          elasticsearch: { cluster: ['monitor_inference'], indices: [], run_as: [] },
          kibana: [{ spaces: ['*'], feature: { agentBuilder: ['read'], actions: ['read'] } }],
        },
      },
    });

    if (!apiKeyResult) {
      throw new Error('Unable to create an API key (API keys are disabled)');
    }

    const encodedApiKey = Buffer.from(`${apiKeyResult.id}:${apiKeyResult.api_key}`).toString(
      'base64'
    );

    const username = this.server.security.authc.getCurrentUser(request)?.username;

    // Falls back to 'basic' in the (practically unreachable) case where no
    // license doc exists on the cluster at all, so the required field always
    // has a valid LicenseType value.
    const license = await this.server.licensing.getLicense();

    // The key is the caller-supplied `kibana_api_key` (relay-service#78): the Relay
    // stores it encrypted against the binding and presents it to Agent Builder. It is
    // never returned by any Relay endpoint, so Kibana stores no secret at all.
    let installResponse;
    try {
      installResponse = await relayClient.startInstall({
        kibana_api_key: encodedApiKey,
        kibana_url: getKibanaUrl(this.server.core, this.server.cloud),
        kibana_version: this.server.kibanaVersion,
        license_info: license.type ?? 'basic',
        ...(username ? { created_by_user_key: username } : {}),
      });
    } catch (error) {
      this.logger.error(`Slack app install failed: ${this.toErrorMessage(error)}`);
      // Do not leak an orphaned key if the Relay never took ownership of it. The
      // existing connection (if any) is left untouched so a failed reconnect
      // attempt never breaks an already-working one.
      await this.invalidateApiKey(apiKeyResult.id, 'after Relay install error');
      throw error;
    }

    // The new key has taken over — safe to invalidate whatever it's replacing now.
    if (existingConnection?.apiKeyId) {
      await this.invalidateApiKey(existingConnection.apiKeyId, 'after successful reconnect');
    }

    await this.writeConnection(soClient, {
      status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
      apiKeyId: apiKeyResult.id,
      claimId: installResponse.claim_id,
      tenantKey: null,
      surface: 'slack',
      createdBy: username,
      createdAt: now,
    });

    return { authorizeUrl: installResponse.authorize_url };
  }

  /**
   * Transitions a stuck in-progress install to a terminal `error` state: the
   * claim is gone Relay-side, so the minted key will never be used — invalidate
   * it and record the reason for the UI. The user can then retry Connect cleanly.
   */
  private async failInProgressInstall(
    soClient: SavedObjectsClientContract,
    connection: RelayAppConnectionAttributes,
    error: RelayRequestError
  ): Promise<SlackAppStatusResponse> {
    if (connection.apiKeyId) {
      await this.invalidateApiKey(connection.apiKeyId, 'after install failure');
    }

    const message = this.toErrorMessage(error);
    this.logger.warn(`Slack app install failed terminally: ${message}`);
    await this.writeConnection(soClient, {
      ...connection,
      status: RELAY_APP_CONNECTION_STATUS.error,
      apiKeyId: null,
      error: message,
    });

    return { available: true, status: RELAY_APP_CONNECTION_STATUS.error, error: message };
  }

  async getStatus(request: KibanaRequest): Promise<SlackAppStatusResponse> {
    const soClient = this.getSoClient(request);
    const [relayClient, connection] = await Promise.all([
      this.getRelayClient(),
      this.readConnection(soClient),
    ]);

    if (!relayClient) {
      return { available: false, status: RELAY_APP_CONNECTION_STATUS.notConnected };
    }

    if (!connection) {
      return { available: true, status: RELAY_APP_CONNECTION_STATUS.notConnected };
    }

    // While an install is in progress, poll the Relay for claim fulfillment (the Slack
    // OAuth callback lands on the Relay, not Kibana). The Relay resolves the pending
    // claim from the transport-level deployment identity.
    if (connection.status === RELAY_APP_CONNECTION_STATUS.oauthInProgress) {
      // An in-progress install without a claim id cannot be polled (pre-fix
      // documents, or a partial write): fail it terminally rather than spin.
      if (!connection.claimId) {
        return this.failInProgressInstall(
          soClient,
          connection,
          new RelayRequestError('/v1/slack/install/claim', 400, 'missing claim id')
        );
      }
      try {
        const claim = await relayClient.fetchClaim(connection.claimId);
        if (claim.status === 'complete') {
          await this.writeConnection(soClient, {
            ...connection,
            tenantKey: claim.tenant_key,
            status: RELAY_APP_CONNECTION_STATUS.connected,
          });
          return { available: true, status: RELAY_APP_CONNECTION_STATUS.connected };
        }
      } catch (error) {
        // A 4xx claim response is terminal (claim expired, consumed, or rejected):
        // retrying can never succeed, so stop the install, release the orphaned
        // key, and surface the reason. 5xx / network errors stay transient.
        if (error instanceof RelayRequestError && error.isTerminal) {
          return this.failInProgressInstall(soClient, connection, error);
        }
        this.logger.warn(`Failed to poll Relay install claim: ${this.toErrorMessage(error)}`);
      }
    }

    return {
      available: true,
      status: connection.status,
      error: connection.error,
    };
  }

  async disconnect(request: KibanaRequest): Promise<SlackAppDisconnectResponse> {
    const soClient = this.getSoClient(request);
    const [relayClient, connection] = await Promise.all([
      this.getRelayClient(),
      this.readConnection(soClient),
    ]);

    if (!connection) {
      return { success: true };
    }

    if (connection.apiKeyId) {
      await this.invalidateApiKey(connection.apiKeyId, 'on disconnect');
    }

    if (relayClient) {
      try {
        await relayClient.unbind();
      } catch (error) {
        // The Relay's own contract requires the caller never see success while a
        // binding survives (a partial teardown returns 502 and must be retried).
        // Keep the connection record in an `error` state instead of deleting it,
        // so the settings UI surfaces the failure and the user can retry rather
        // than believing they're disconnected while the workspace stays bound.
        const message = this.toErrorMessage(error);
        this.logger.warn(`Failed to unbind from Relay on disconnect: ${message}`);
        await this.writeConnection(soClient, {
          ...connection,
          status: RELAY_APP_CONNECTION_STATUS.error,
          apiKeyId: null,
          error: message,
        });
        return { success: false };
      }
    }

    await soClient
      .delete(RELAY_APP_CONNECTION_SO_TYPE, RELAY_APP_CONNECTION_SO_ID)
      .catch((error) => {
        if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
          throw error;
        }
      });

    return { success: true };
  }
}
