/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSelectedActionEnabled } from '@kbn/connector-specs';
import type { SelectedActions } from '@kbn/connector-specs';
import type { ConnectorSpecProvider } from './connector_spec_provider';
import { createPackageConnectorSpecProvider } from './connector_spec_provider';
import { formatJsonSchemaForLlm } from './tools';

/** Minimal actions-client interface needed by the connector helpers below. */
interface MinimalActionsClient {
  getAll(): Promise<Array<{ id: string; name: string; actionTypeId: string }>>;
  get(opts: { id: string }): Promise<{
    id: string;
    name: string;
    actionTypeId: string;
    config?: Record<string, unknown>;
  }>;
}

export interface ConnectorSummary {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface ConnectorSubActionDetail {
  name: string;
  description: string;
  params: string;
}

export interface ConnectorDetail {
  id: string;
  name: string;
  type: string;
  description: string;
  subActions: ConnectorSubActionDetail[];
}

/**
 * Resolves the connector allow-list for a run. When an agent configuration is present,
 * an unset `connector_ids` means no connectors are assigned; with no agent context
 * there is no scoping (undefined). Mirrors `execute_connector_sub_action` and `sml_search`.
 */
export const resolveAllowedConnectorIds = (
  agentConfiguration?: { connector_ids?: string[] } | undefined
): string[] | undefined =>
  agentConfiguration ? agentConfiguration.connector_ids ?? [] : undefined;

/**
 * Returns connectors that have a ConnectorSpec and, when allowedIds is provided,
 * are within that set. Pass undefined to allow all connectors; pass [] to block all.
 */
export const listAgentConnectors = async (
  actionsClient: MinimalActionsClient,
  {
    allowedIds,
    specProvider = createPackageConnectorSpecProvider(),
  }: { allowedIds?: string[]; specProvider?: ConnectorSpecProvider }
): Promise<ConnectorSummary[]> => {
  const allConnectors = await actionsClient.getAll();
  const allowedSet = allowedIds !== undefined ? new Set(allowedIds) : null;

  const inScope = allConnectors.filter((c) => allowedSet === null || allowedSet.has(c.id));
  const specs = await Promise.all(inScope.map((c) => specProvider.getSpec(c.actionTypeId)));

  return inScope.flatMap((c, index) => {
    const spec = specs[index];
    return spec
      ? [{ id: c.id, name: c.name, type: c.actionTypeId, description: spec.description ?? c.name }]
      : [];
  });
};

/**
 * Returns the full detail (sub-actions + param schemas) for a connector, or null
 * if the connector type has no ConnectorSpec or is not in allowedIds.
 * Pass undefined to allow all connectors; pass [] to block all.
 */
export const getAgentConnectorDetail = async (
  actionsClient: MinimalActionsClient,
  connectorId: string,
  {
    allowedIds,
    specProvider = createPackageConnectorSpecProvider(),
  }: { allowedIds?: string[]; specProvider?: ConnectorSpecProvider } = {}
): Promise<ConnectorDetail | null> => {
  if (allowedIds !== undefined && !allowedIds.includes(connectorId)) return null;

  const connector = await actionsClient.get({ id: connectorId });
  const spec = await specProvider.getSpecDetail(connector.actionTypeId);
  if (!spec) return null;

  const selectedActions = connector.config?.selectedActions as SelectedActions;

  const subActions: ConnectorSubActionDetail[] = spec.actions
    .filter(({ name, isTool }) => isTool && isSelectedActionEnabled(name, selectedActions))
    .map(({ name, description, inputSchema }) => ({
      name,
      description: description ?? name,
      params: formatJsonSchemaForLlm(inputSchema),
    }));

  return {
    id: connector.id,
    name: connector.name,
    type: connector.actionTypeId,
    description: spec.description ?? connector.name,
    subActions,
  };
};
