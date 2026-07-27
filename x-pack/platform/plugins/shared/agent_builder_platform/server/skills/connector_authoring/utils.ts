/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType } from '@kbn/actions-plugin/common';
import { getConnectorSpec } from '@kbn/connector-specs';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE_ID } from '@kbn/connector-schemas/mcp/constants';

/**
 * Human-readable connector type name, preferring the spec display name when one
 * exists so `list_connector_types` and `propose_connector` stay aligned.
 */
export const getConnectorTypeDisplayName = (actionType: ActionType): string => {
  const spec = getConnectorSpec(actionType.id);
  return spec?.metadata.displayName ?? actionType.name;
};

/**
 * Whether a connector type can actually be *used* by the agent in a chat conversation once created.
 * Connector types that fail this check can still be created (they may be useful in Workflows), but
 * the agent has no way to call them from chat.
 */
export const isChatCallableConnectorType = (connectorTypeId: string): boolean =>
  connectorTypeId === MCP_CONNECTOR_TYPE_ID || !!getConnectorSpec(connectorTypeId);

export interface ConnectorTypeAvailabilityOptions {
  /** Include connector types marked deprecated in the Actions registry. Defaults to `false`. */
  includeDeprecated?: boolean;
  /** Include connector types disabled via Kibana config (`enabledInConfig: false`). Defaults to `false`. */
  includeDisabledInConfig?: boolean;
}

/**
 * Whether a connector type should be offered to the user from chat.
 *
 * System action types are never proposable (they aren't user-creatable
 * connector instances). By default, this also excludes deprecated types,
 * types disabled via config, and types not covered by the current license,
 * since we don't want the agent to steer a user towards creating a connector
 * that's discouraged or that can't actually be configured. `listTypes` does
 * not filter on any of these itself — it returns every type for the feature
 * id, annotated with `enabledInConfig`/`enabledInLicense` for the caller to
 * act on. Shared by `list_connector_types` and `propose_connector` so the two
 * tools can't drift apart.
 */
export const isConnectorTypeAvailable = (
  actionType: ActionType,
  {
    includeDeprecated = false,
    includeDisabledInConfig = false,
  }: ConnectorTypeAvailabilityOptions = {}
): boolean => {
  return (
    !actionType.isSystemActionType &&
    (includeDeprecated || !actionType.isDeprecated) &&
    (includeDisabledInConfig || actionType.enabledInConfig) &&
    actionType.enabledInLicense
  );
};
