/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server';
import {
  filterActionsBySelection,
  getConnectorSpec,
  type SelectedActions,
} from '@kbn/connector-specs';
import type { ConnectorItem, ConnectorSubAction, OAuthStatus } from '../../common/http_api/tools';

export const getTechnicalPreviewWarning = (featureName: string) => {
  return `${featureName} is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.`;
};

/**
 * Timeout for agentic HTTP APIs - 15 mins
 */
export const AGENT_SOCKET_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Returns the headers needed for SSE streaming responses.
 */
export const getSSEResponseHeaders = (): Record<string, string> => ({
  'Content-Type': 'text/event-stream',
  'Content-Encoding': 'identity',
  'Cache-Control': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Accel-Buffering': 'no',
});

export const getConnectorSubActions = (
  actionTypeId: string,
  selectedActions?: SelectedActions
): ConnectorSubAction[] => {
  const spec = getConnectorSpec(actionTypeId);
  if (!spec) return [];

  return filterActionsBySelection(spec.actions, selectedActions).map(([name, action]) => ({
    name,
    description: action.description,
  }));
};

export const toConnectorItem = (
  connector: Connector,
  options?: {
    oauthStatus?: OAuthStatus;
  }
): ConnectorItem => {
  const selectedActions = connector.config?.selectedActions as SelectedActions;
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
    subActions: getConnectorSubActions(connector.actionTypeId, selectedActions),
  };
};
