/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  SlackAppConnectResponse,
  SlackAppDisconnectResponse,
  SlackAppStatusResponse,
} from '../../../common/slack_app/types';
import { RELAY_APP_CONNECTION_STATUS } from '../../../common/slack_app/types';
import type { StreamsServer } from '../../types';
import {
  RELAY_APP_CONNECTION_SO_ID,
  RELAY_APP_CONNECTION_SO_TYPE,
  type RelayAppConnectionAttributes,
} from './saved_object';
import { RelayClient } from './relay_client';
import { RelayRequestError } from './relay_error';
import { SlackAppUnavailableError } from './errors';

export class SlackAppService {
  private readonly logger: Logger;

  constructor(private readonly server: StreamsServer) {
    this.logger = server.logger.get('slack-app');
  }

  /** feature flag on + relayUrl configured + agentBuilder available on this deployment. */
  private getRelayUrl(): string | undefined {
    const { enabled, relayUrl } = this.server.config.slackApp;
    if (!enabled || !relayUrl || !this.server.agentBuilder) {
      return undefined;
    }
    return relayUrl;
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
    attributes: RelayAppConnectionAttributes
  ): Promise<void> {
    await soClient.create<RelayAppConnectionAttributes>(RELAY_APP_CONNECTION_SO_TYPE, attributes, {
      id: RELAY_APP_CONNECTION_SO_ID,
      overwrite: true,
    });
  }

  async connect(request: KibanaRequest): Promise<SlackAppConnectResponse> {
    const relayUrl = this.getRelayUrl();
    if (!relayUrl) {
      throw new SlackAppUnavailableError(
        'The Elastic Slack App is not available on this deployment'
      );
    }

    const soClient = this.getSoClient(request);
    const now = new Date().toISOString();

    // A prior connection (connected, or a still-in-progress install) may already
    // hold a live managed key. Invalidate it before minting a new one so
    // reconnecting — or any repeat call to this route — never orphans a key in ES.
    const existingConnection = await this.readConnection(soClient);
    if (existingConnection?.apiKeyId) {
      await this.server.security.authc.apiKeys
        .invalidateAsInternalUser({ ids: [existingConnection.apiKeyId] })
        .catch((error) => {
          this.logger.warn(
            `Failed to invalidate existing API key ${existingConnection.apiKeyId} before reconnecting: ${error.message}`
          );
        });
    }

    // Mint a managed, least-privilege ES API key scoped to Agent Builder read. The key
    // is granted on behalf of the connecting user but survives their deletion (ES keys
    // outlive their owner). The connecting user must hold `agentBuilder:read`, otherwise
    // the granted key is under-privileged (grant intersects with the owner's privileges).
    const apiKeyResult = await this.server.security.authc.apiKeys.grantAsInternalUser(request, {
      name: 'nightshift-relay-agent-builder',
      metadata: { managed: true, managed_by: 'nightshift-relay', type: 'agent_builder_converse' },
      kibana_role_descriptors: {
        nightshift_relay_agent_builder: {
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [{ spaces: ['*'], feature: { agentBuilder: ['read'] } }],
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

    // The key is the caller-supplied `kibana_api_key` (relay-service#78): the Relay
    // stores it encrypted against the binding and presents it to Agent Builder. It is
    // never returned by any Relay endpoint, so Kibana stores no secret at all.
    let installResponse;
    try {
      const relayClient = new RelayClient(relayUrl);
      installResponse = await relayClient.startInstall({
        kibana_api_key: encodedApiKey,
        ...(username ? { created_by_user_key: username } : {}),
      });
    } catch (error) {
      this.logger.error(
        `Slack app install failed: ${error instanceof Error ? error.message : String(error)}`
      );
      // Do not leak an orphaned key if the Relay never took ownership of it.
      await this.server.security.authc.apiKeys
        .invalidateAsInternalUser({ ids: [apiKeyResult.id] })
        .catch((invalidateError) => {
          this.logger.warn(
            `Failed to clean up API key ${apiKeyResult.id} after Relay install error: ${invalidateError.message}`
          );
        });
      throw error;
    }

    await this.writeConnection(soClient, {
      status: RELAY_APP_CONNECTION_STATUS.oauthInProgress,
      apiKeyId: apiKeyResult.id,
      claimId: installResponse.claim_id,
      surface: 'slack',
      createdBy: username,
      createdAt: now,
      updatedAt: now,
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
      await this.server.security.authc.apiKeys
        .invalidateAsInternalUser({ ids: [connection.apiKeyId] })
        .catch((invalidateError) => {
          this.logger.warn(
            `Failed to invalidate API key ${connection.apiKeyId} after install failure: ${invalidateError.message}`
          );
        });
    }

    const message = error.relayMessage ?? error.message;
    this.logger.warn(`Slack app install failed terminally: ${message}`);
    await this.writeConnection(soClient, {
      ...connection,
      status: RELAY_APP_CONNECTION_STATUS.error,
      apiKeyId: undefined,
      error: message,
      updatedAt: new Date().toISOString(),
    });

    return { available: true, status: RELAY_APP_CONNECTION_STATUS.error, error: message };
  }

  async getStatus(request: KibanaRequest): Promise<SlackAppStatusResponse> {
    const relayUrl = this.getRelayUrl();
    if (!relayUrl) {
      return { available: false, status: RELAY_APP_CONNECTION_STATUS.notConnected };
    }

    const soClient = this.getSoClient(request);
    const connection = await this.readConnection(soClient);

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
        const relayClient = new RelayClient(relayUrl);
        const claim = await relayClient.fetchClaim(connection.claimId);
        if (claim.status === 'complete') {
          await this.writeConnection(soClient, {
            ...connection,
            status: RELAY_APP_CONNECTION_STATUS.connected,
            updatedAt: new Date().toISOString(),
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
        this.logger.warn(
          `Failed to poll Relay install claim: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return {
      available: true,
      status: connection.status,
      error: connection.error,
    };
  }

  async disconnect(request: KibanaRequest): Promise<SlackAppDisconnectResponse> {
    const relayUrl = this.getRelayUrl();
    const soClient = this.getSoClient(request);
    const connection = await this.readConnection(soClient);

    if (!connection) {
      return { success: true };
    }

    if (connection.apiKeyId) {
      await this.server.security.authc.apiKeys
        .invalidateAsInternalUser({ ids: [connection.apiKeyId] })
        .catch((error) => {
          this.logger.warn(
            `Failed to invalidate API key ${connection.apiKeyId} on disconnect: ${error.message}`
          );
        });
    }

    if (relayUrl) {
      try {
        await new RelayClient(relayUrl).unbind();
      } catch (error) {
        // The Relay's own contract requires the caller never see success while a
        // binding survives (a partial teardown returns 502 and must be retried).
        // Keep the connection record in an `error` state instead of deleting it,
        // so the settings UI surfaces the failure and the user can retry rather
        // than believing they're disconnected while the workspace stays bound.
        const message =
          error instanceof RelayRequestError
            ? error.relayMessage ?? error.message
            : error instanceof Error
            ? error.message
            : String(error);
        this.logger.warn(`Failed to unbind from Relay on disconnect: ${message}`);
        await this.writeConnection(soClient, {
          ...connection,
          status: RELAY_APP_CONNECTION_STATUS.error,
          apiKeyId: undefined,
          error: message,
          updatedAt: new Date().toISOString(),
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
