/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server';
import type { ConnectorItem } from '../../common/http_api/tools';

export const getTechnicalPreviewWarning = (featureName: string) => {
  return `${featureName} is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.`;
};

/**
 * Timeout for agentic HTTP APIs - 15 mins
 */
export const AGENT_SOCKET_TIMEOUT_MS = 15 * 60 * 1000;

export const toConnectorItem = (connector: Connector): ConnectorItem => {
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
  };
};
