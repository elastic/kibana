/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';
import { formatSchemaForLlm } from './tools';

/** Minimal actions-client interface needed by the connector helpers below. */
interface MinimalActionsClient {
  getAll(): Promise<Array<{ id: string; name: string; actionTypeId: string }>>;
  get(opts: { id: string }): Promise<{ id: string; name: string; actionTypeId: string }>;
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
 * Returns connectors that have a ConnectorSpec and, when allowedIds is provided,
 * are within that set. Pass undefined to allow all connectors; pass [] to block all.
 */
export const listAgentConnectors = async (
  actionsClient: MinimalActionsClient,
  { allowedIds }: { allowedIds?: string[] }
): Promise<ConnectorSummary[]> => {
  const allConnectors = await actionsClient.getAll();
  const allowedSet = allowedIds !== undefined ? new Set(allowedIds) : null;

  return allConnectors
    .filter(
      (c) => !!getConnectorSpec(c.actionTypeId) && (allowedSet === null || allowedSet.has(c.id))
    )
    .map((c) => {
      const spec = getConnectorSpec(c.actionTypeId)!;
      return {
        id: c.id,
        name: c.name,
        type: c.actionTypeId,
        description: spec.metadata.description ?? c.name,
      };
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
  { allowedIds }: { allowedIds?: string[] } = {}
): Promise<ConnectorDetail | null> => {
  if (allowedIds !== undefined && !allowedIds.includes(connectorId)) return null;

  const connector = await actionsClient.get({ id: connectorId });
  const spec = getConnectorSpec(connector.actionTypeId);
  if (!spec) return null;

  const subActions: ConnectorSubActionDetail[] = Object.entries(spec.actions)
    .filter(([name]) => isToolAction(spec, name))
    .map(([name, action]) => ({
      name,
      description: action.description ?? name,
      params: action.input ? formatSchemaForLlm(action.input) : 'No parameters',
    }));

  return {
    id: connector.id,
    name: connector.name,
    type: connector.actionTypeId,
    description: spec.metadata.description ?? connector.name,
    subActions,
  };
};
