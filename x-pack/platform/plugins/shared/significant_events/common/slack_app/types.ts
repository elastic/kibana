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
  /** `streams.significantEventsAppsEnabled` flag on + `xpack.actions.relay.url` set + agentBuilder available. */
  available: boolean;
  status: RelayAppConnectionStatus;
  error?: string;
}

export interface SlackAppDisconnectResponse {
  success: boolean;
}

/**
 * Binding status as reported by the Relay:
 * - `bound_to_self` — this channel is already claimed by this deployment.
 * - `bound_to_other_target` — claimed by a different deployment; no action possible.
 * - `not_bound` — the bot is a member but the channel is unclaimed; can be bound.
 */
export type SlackChannelBindingStatus = 'bound_to_self' | 'bound_to_other_target' | 'not_bound';

/**
 * A single binding entry for a connected workspace, as returned by the bindings route.
 * `channel` = Slack channel id for a SUB-scope binding; `displayName` = channel name when available.
 * `bound_to_self` / `bound_to_other_target` come from the Relay; `not_bound` is derived on the
 * Kibana side by joining member channels against the bound entries.
 */
export interface SlackChannelBinding {
  /** Slack channel id for a channel-specific binding (`SUB` scope or `not_bound`). */
  channel?: string;
  /** Human-readable channel name; present when derived from the bot's member-channel list. */
  displayName?: string;
  /** Binding status for this entry (Relay-reported for bound entries, derived for `not_bound`). */
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
