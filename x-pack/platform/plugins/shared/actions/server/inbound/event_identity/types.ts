/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConnectorEventIdentity {
  apiKey?: string;
  uiamApiKey?: string;
  uiamApiKeyExternal?: boolean;
}

export const CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA = {
  managed: true,
  kibana: { type: 'connector_event_identity' },
} as const;

export const connectorEventIdentityApiKeyName = (connectorId: string): string =>
  `Actions: connector event identity ${connectorId}`;
