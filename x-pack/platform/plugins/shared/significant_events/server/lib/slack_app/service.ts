/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import {
  RelayRequestError,
  type InMemoryConnector,
  type RelayClientContract,
} from '@kbn/actions-plugin/server';
import { RELAY_AUTH_ID } from '@kbn/connector-specs';
import type {
  SlackAppBindingsResponse,
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
import { SlackAppUnavailableError } from './errors';
import { getKibanaUrl } from './get_kibana_url';

/**
 * One instance per deployment, under a stable id: rules and workflows reference it directly, so it
 * must survive restarts and reconnects unchanged.
 */
export const ELASTIC_APPS_SLACK_CONNECTOR_ID = 'elastic-apps-slack';

/** The Elastic Slack app is not its own connector type — it is the `relay` auth method on this one. */
const ELASTIC_APPS_SLACK_CONNECTOR_TYPE_ID = '.slack2';

const ELASTIC_APPS_SLACK_CONNECTOR_NAME = 'Slack (Elastic app)';

const buildConnector = (tenantKey: string): InMemoryConnector => ({
  id: ELASTIC_APPS_SLACK_CONNECTOR_ID,
  actionTypeId: ELASTIC_APPS_SLACK_CONNECTOR_TYPE_ID,
  name: ELASTIC_APPS_SLACK_CONNECTOR_NAME,
  // The Relay holds the Slack credentials, so naming the workspace is all this needs. `config`
  // mirrors the auth type in plaintext, as `ensureConfigAuthType` does for saved connectors.
  config: { authType: RELAY_AUTH_ID },
  secrets: { authType: RELAY_AUTH_ID, tenantKey },
  isMissingSecrets: false,
  isPreconfigured: true,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
});

/** Pagination options for a single page of connected channels. */
export interface ListBindingsOptions {
  /** Opaque cursor from a previous page's `nextCursor`; omit for the first page. */
  cursor?: string;
  /** Max entries to return in this page. */
  perPage?: number;
}

export class SlackAppService {
  private readonly logger: Logger;

  /**
   * An id collision clears only by editing `kibana.yml` and restarting, so the reconcile loop would
   * otherwise repeat the warning every interval for the life of the process.
   */
  private idTakenWarned = false;

  constructor(private readonly server: StreamsServer) {
    this.logger = server.logger.get('slack-app');
  }

  /**
   * feature flag on + `xpack.actions.relay` configured (the injected singleton client exists) +
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

  /**
   * Unregisters first because `registerDynamicConnector` is a no-op when the id is taken, so a
   * reconnect to a different workspace would otherwise keep serving the previous tenant key.
   *
   * When the id is held by a connector this app does not own (a preconfigured `elastic-apps-slack`
   * in `kibana.yml`) the unregister leaves it in place and the register is refused, so the call must
   * not be treated as having taken effect.
   */
  private publishConnector(tenantKey: string): void {
    this.server.actions.unregisterDynamicConnector(ELASTIC_APPS_SLACK_CONNECTOR_ID);

    if (this.server.actions.registerDynamicConnector(buildConnector(tenantKey))) {
      this.logger.debug(`Registered the ${ELASTIC_APPS_SLACK_CONNECTOR_ID} connector`);
      this.idTakenWarned = false;
      return;
    }

    if (!this.idTakenWarned) {
      this.idTakenWarned = true;
      this.logger.warn(
        `Could not register the "${ELASTIC_APPS_SLACK_CONNECTOR_ID}" connector: a connector with that id already exists and is not managed by the Elastic Slack app. Remove it from your Kibana configuration so the Elastic Slack app can own the id.`
      );
    }
  }

  private withdrawConnector(): void {
    if (this.server.actions.unregisterDynamicConnector(ELASTIC_APPS_SLACK_CONNECTOR_ID)) {
      this.logger.debug(`Unregistered the ${ELASTIC_APPS_SLACK_CONNECTOR_ID} connector`);
    }
  }

  /**
   * Lets a reconcile tell "already correct" from "registered for the wrong workspace". Matches on
   * `isDynamic` as well as the id, because only dynamic connectors are ones this app registered and
   * can unregister: a foreign connector squatting the id must never read as already correct.
   */
  private getRegisteredTenantKey(): string | undefined {
    const connector = this.server.actions.inMemoryConnectors.find(
      ({ id, isDynamic }) => id === ELASTIC_APPS_SLACK_CONNECTOR_ID && isDynamic === true
    );
    const tenantKey = (connector?.secrets as { tenantKey?: unknown } | undefined)?.tenantKey;
    return typeof tenantKey === 'string' ? tenantKey : undefined;
  }

  /**
   * Brings this process's connector in line with the stored connection. In-memory connectors are
   * per-process, so a connect handled by another node only reaches here. Safe to call repeatedly.
   */
  async reconcileConnector(soClient: SavedObjectsClientContract): Promise<void> {
    // Gated like every request, so disabling the app also withdraws the connector rather than
    // leaving one that can only fail.
    const available = await this.getRelayClient();
    const connection = available ? await this.readConnection(soClient) : undefined;
    const desiredTenantKey =
      connection?.status === RELAY_APP_CONNECTION_STATUS.connected
        ? connection.tenantKey ?? undefined
        : undefined;

    if (desiredTenantKey === this.getRegisteredTenantKey()) {
      return;
    }
    if (!desiredTenantKey) {
      this.withdrawConnector();
      return;
    }
    this.publishConnector(desiredTenantKey);
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

    // Mint a managed, read-only, least-privilege ES API key for the agent. The key
    // is granted on behalf of the connecting user but survives their deletion (ES keys
    // outlive their owner). Because the grant intersects with the owner's privileges, the
    // connecting user must themselves hold every privilege below or the key is silently
    // under-privileged.
    //
    // - Observability signals get direct ES read: the obs agent tools query them as this key
    //   (asCurrentUser). Broad conventional patterns cover APM/OTel logs, metrics and traces
    //   without regenerating the key when new data is onboarded.
    // - Significant Events and Streams data is reached through the `streams` Kibana feature
    //   (read), and connectors/LLM through `actions` (read) — both go via the internal Kibana
    //   client, so no grants on system/dot indices (unsupported in serverless) are needed.
    const apiKeyResult = await this.server.security.authc.apiKeys.grantAsInternalUser(request, {
      name: 'nightshift-relay-agent-builder',
      metadata: { managed: true, managed_by: 'nightshift-relay', type: 'agent_builder_converse' },
      kibana_role_descriptors: {
        nightshift_relay_agent_builder: {
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
      // Do not leak an orphaned key if the Relay never took ownership of it.
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

    // The install may land on a different workspace, so any leftover connector now carries a stale
    // tenant key. Republished once the claim completes.
    this.withdrawConnector();

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
    this.withdrawConnector();

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
      // An in-progress install without a claim id cannot be polled: fail it terminally.
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
          // A completed claim must carry a tenant key: it's what every connected
          // operation (listBindings / bind / unbind / disconnect) keys off. Marking
          // the connection `connected` without one would strand it in a permanently
          // broken state that never self-heals (getStatus only polls while in
          // progress). Treat a tenant-less completion as a terminal install failure.
          if (!claim.tenant_key) {
            return this.failInProgressInstall(
              soClient,
              connection,
              new RelayRequestError(
                '/v1/slack/install/claim',
                502,
                'completed claim has no tenant key'
              )
            );
          }
          await this.writeConnection(soClient, {
            ...connection,
            tenantKey: claim.tenant_key,
            status: RELAY_APP_CONNECTION_STATUS.connected,
          });
          this.publishConnector(claim.tenant_key);
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
      ...(connection.error ? { error: connection.error } : {}),
    };
  }

  async listBindings(
    request: KibanaRequest,
    options: ListBindingsOptions = {}
  ): Promise<SlackAppBindingsResponse> {
    const soClient = this.getSoClient(request);
    const [relayClient, connection] = await Promise.all([
      this.getRelayClient(),
      this.readConnection(soClient),
    ]);

    if (!relayClient) {
      return { bindings: [] };
    }

    if (connection?.status !== RELAY_APP_CONNECTION_STATUS.connected || !connection.tenantKey) {
      return { bindings: [] };
    }

    let page;
    try {
      page = await relayClient.listBindings(connection.tenantKey, {
        cursor: options.cursor,
        limit: options.perPage,
      });
    } catch (error) {
      this.logger.warn(`Failed to list bindings from Relay: ${this.toErrorMessage(error)}`);
      throw error;
    }

    // The Relay returns only this deployment's own SUB bindings (the connected channels),
    // each carrying its persisted display snapshot, so no additional Slack call is needed.
    const bindings: SlackAppBindingsResponse['bindings'] = [];
    for (const entry of page.bindings) {
      if (entry.scope_id == null) {
        continue;
      }
      const binding: SlackAppBindingsResponse['bindings'][number] = {
        channel: entry.scope_id,
        status: 'bound_to_self',
      };
      if (entry.display_name != null) {
        binding.displayName = entry.display_name;
      }
      bindings.push(binding);
    }

    return { bindings, nextCursor: page.nextCursor };
  }

  private async requireConnectedTenant(
    request: KibanaRequest
  ): Promise<{ relayClient: RelayClientContract; tenantKey: string }> {
    const soClient = this.getSoClient(request);
    const [relayClient, connection] = await Promise.all([
      this.getRelayClient(),
      this.readConnection(soClient),
    ]);
    if (!relayClient) {
      throw new SlackAppUnavailableError(
        'The Elastic Slack App is not available on this deployment'
      );
    }
    if (connection?.status !== RELAY_APP_CONNECTION_STATUS.connected || !connection.tenantKey) {
      throw new SlackAppUnavailableError('Connection is not in a connected state');
    }
    return { relayClient, tenantKey: connection.tenantKey };
  }

  async bindChannel(request: KibanaRequest, channelId: string): Promise<void> {
    const { relayClient, tenantKey } = await this.requireConnectedTenant(request);
    await relayClient.bind(tenantKey, channelId);
  }

  async unbindChannel(request: KibanaRequest, channelId: string): Promise<void> {
    const { relayClient, tenantKey } = await this.requireConnectedTenant(request);
    await relayClient.unbindChannel(tenantKey, channelId);
  }

  async disconnect(request: KibanaRequest): Promise<SlackAppDisconnectResponse> {
    const soClient = this.getSoClient(request);
    const [relayClient, connection] = await Promise.all([
      this.getRelayClient(),
      this.readConnection(soClient),
    ]);

    if (!connection) {
      return { status: 'disconnected' };
    }

    // Up front, not on the success path: a failed unbind below leaves the connection in `error` for
    // the user to retry, and rules must not keep posting through a connection being torn down.
    this.withdrawConnector();

    if (connection.apiKeyId) {
      await this.invalidateApiKey(connection.apiKeyId, 'on disconnect');
    }

    // Only ask the Relay to unbind if this connection has a tenantKey: an in-progress
    // install (no tenantKey) has no Relay-side binding to tear down yet.
    if (relayClient && connection.tenantKey) {
      try {
        await relayClient.unbind(connection.tenantKey);
      } catch (error) {
        // The Relay's own contract requires the caller never see success while a
        // binding survives (a partial teardown returns 502 and must be retried).
        // Keep the connection record in an `error` state instead of deleting it,
        // so the settings UI surfaces the failure and the user can retry.
        const message = this.toErrorMessage(error);
        this.logger.warn(`Failed to unbind from Relay on disconnect: ${message}`);
        await this.writeConnection(soClient, {
          ...connection,
          status: RELAY_APP_CONNECTION_STATUS.error,
          apiKeyId: null,
          error: message,
        });
        // Surface the failure to the caller instead of a misleading success: the
        // route maps this to a retryable 5xx and the connection stays in `error`
        // state so the settings UI shows it and the user can retry.
        throw error;
      }
    }

    await soClient
      .delete(RELAY_APP_CONNECTION_SO_TYPE, RELAY_APP_CONNECTION_SO_ID)
      .catch((error) => {
        if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
          throw error;
        }
      });

    return { status: 'disconnected' };
  }
}
