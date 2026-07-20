/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared types for the "Elastic Slack App" connection surfaced under Significant
 * Events settings. The connection binds a Kibana deployment to the Nightshift
 * Relay service so the Relay can call Agent Builder on behalf of the deployment.
 */

export const RELAY_APP_CONNECTION_STATUS = {
  notConnected: 'not_connected',
  oauthInProgress: 'oauth_in_progress',
  connected: 'connected',
  error: 'error',
} as const;

export type RelayAppConnectionStatus =
  (typeof RELAY_APP_CONNECTION_STATUS)[keyof typeof RELAY_APP_CONNECTION_STATUS];

/** Response from the connect route: the Slack OAuth consent URL the browser opens. */
export interface SlackAppConnectResponse {
  authorizeUrl: string;
}

/** Response from the status route driving the card state. */
export interface SlackAppStatusResponse {
  /** `streams.significantEventsAppsEnabled` flag on + `xpack.significant_events.relayService.url` set + agentBuilder available. */
  available: boolean;
  status: RelayAppConnectionStatus;
  error?: string;
}

export interface SlackAppDisconnectResponse {
  success: boolean;
}

/**
 * Binding status as reported by the Relay:
 * - `bound_to_self` — this channel (or default route) is already claimed by this deployment.
 * - `bound_to_other_target` — claimed by a different deployment; no action possible.
 * - `not_bound` — the bot is a member but the channel is unclaimed; can be bound.
 */
export type SlackChannelBindingStatus = 'bound_to_self' | 'bound_to_other_target' | 'not_bound';

/**
 * A single binding entry for a connected workspace, as returned by the bindings route.
 * `isDefault` = the workspace-wide DEFAULT route (rendered as `*`).
 * `channel` = Slack channel id for a SUB-scope binding; `displayName` = channel name when available.
 * `status` reflects the relay's binding state for this entry.
 */
export interface SlackChannelBinding {
  /** True for the workspace-wide default binding (`DEFAULT` scope, rendered as `*`). */
  isDefault?: boolean;
  /** Slack channel id for a channel-specific binding (`SUB` scope or `not_bound`). */
  channel?: string;
  /** Human-readable channel name; only present when the Relay's enrichment is configured. */
  displayName?: string;
  /** Relay-reported binding status for this entry. */
  status: SlackChannelBindingStatus;
}

/** Response from the per-connection bindings route. */
export interface SlackAppBindingsResponse {
  bindings: SlackChannelBinding[];
}

/** Response from the per-channel bind route. */
export interface SlackAppBindChannelResponse {
  status: 'bound';
}

/** Response from the per-channel unbind route. */
export interface SlackAppUnbindChannelResponse {
  status: 'unbound';
}
