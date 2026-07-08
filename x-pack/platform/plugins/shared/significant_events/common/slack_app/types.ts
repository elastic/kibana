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
