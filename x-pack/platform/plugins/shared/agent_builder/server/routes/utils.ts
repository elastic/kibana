/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server';
import type { ConnectorItem, OAuthStatus } from '../../common/http_api/tools';

export const getTechnicalPreviewWarning = (featureName: string) => {
  return `${featureName} is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.`;
};

/**
 * Timeout for agentic HTTP APIs - 20 mins
 *
 * Raised from 15 minutes to accommodate multi-turn Agent Builder conversations
 * with reasoning models (e.g. GLM-5.2) where a single inference call can take
 * up to 5 minutes (matching the default inference endpoint timeout). A 3-4
 * turn conversation with a reasoning model can legitimately take 15-20 minutes.
 *
 * This is the idle socket timeout — it only fires if no data (including SSE
 * keep-alive comments) is received for this duration. The SSE stream already
 * sends keep-alive comments every 10 seconds, so this timeout only triggers
 * when the entire Node.js event loop is wedged.
 */
export const AGENT_SOCKET_TIMEOUT_MS = 20 * 60 * 1000;

/**
 * Returns the headers needed for SSE streaming responses.
 * On cloud, uses `application/octet-stream` to avoid proxy compression breaking chunked encoding.
 */
export const getSSEResponseHeaders = (isCloud: boolean): Record<string, string> => ({
  // Cloud proxies compress text/* types, losing chunking capabilities needed for SSE
  'Content-Type': isCloud ? 'application/octet-stream' : 'text/event-stream',
  'Content-Encoding': 'identity',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'Transfer-Encoding': 'chunked',
  'X-Content-Type-Options': 'nosniff',
  'X-Accel-Buffering': 'no',
});

export const toConnectorItem = (
  connector: Connector,
  options?: {
    oauthStatus?: OAuthStatus;
  }
): ConnectorItem => {
  return {
    id: connector.id,
    name: connector.name,
    actionTypeId: connector.actionTypeId,
    isPreconfigured: connector.isPreconfigured,
    isDeprecated: connector.isDeprecated,
    isSystemAction: connector.isSystemAction,
    isMissingSecrets: connector.isMissingSecrets,
    isConnectorTypeDeprecated: connector.isConnectorTypeDeprecated,
    config: connector.config,
    authMode: connector.authMode,
    oauthStatus: options?.oauthStatus,
  };
};
