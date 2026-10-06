/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface AgentWithConnectorIds {
  configuration?: { connector_ids?: string[] | null } | null;
}

/**
 * Returns true if the given connector is accessible to the agent.
 * undefined/null means no connectors are assigned; access requires an explicit list that includes
 * the connector ID.
 */
export const agentHasConnector = (agent: AgentWithConnectorIds, connectorId: string): boolean => {
  const { connector_ids: connectorIds } = agent.configuration ?? {};
  return connectorIds != null && connectorIds.includes(connectorId);
};

/**
 * Returns the effective connector IDs for an agent. undefined/null means no connectors assigned.
 */
export const getEffectiveConnectorIds = (agent: AgentWithConnectorIds): string[] => {
  const { connector_ids: connectorIds } = agent.configuration ?? {};
  return connectorIds ?? [];
};
