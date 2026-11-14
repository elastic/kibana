/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server';
import type { ConnectorSpecSummaryProvider } from '@kbn/agent-builder-server';
import { filterSpecActionsBySelection } from '@kbn/agent-builder-server';
import type { SelectedActions } from '@kbn/connector-specs';
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

export const getConnectorSubActions = async ({
  actionTypeId,
  selectedActions,
  specProvider,
}: {
  actionTypeId: string;
  selectedActions?: SelectedActions;
  specProvider: ConnectorSpecSummaryProvider;
}): Promise<ConnectorSubAction[]> => {
  const spec = await specProvider.getSpec(actionTypeId);
  if (!spec) return [];

  return filterSpecActionsBySelection(spec.actions, selectedActions).map(
    ({ name, description }) => ({ name, description })
  );
};

export const toConnectorItem = async (
  connector: Connector,
  options: {
    specProvider: ConnectorSpecSummaryProvider;
    oauthStatus?: OAuthStatus;
  }
): Promise<ConnectorItem> => {
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
    oauthStatus: options.oauthStatus,
    subActions: await getConnectorSubActions({
      actionTypeId: connector.actionTypeId,
      selectedActions,
      specProvider: options.specProvider,
    }),
  };
};
