/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { WorkplaceConnectorMetadata } from '../types/extended_connector_type';

/**
 * Retrieve workplace metadata for a connector from the actions registry.
 *
 * The actions registry preserves all properties when storing connector types,
 * so our extended metadata is available even though it's not in the official interface.
 *
 * @param actions - Actions plugin start contract
 * @param connectorTypeId - Connector type ID (e.g., '.notion')
 * @returns The workplace metadata if it exists
 */
export function getConnectorMetadata(
  actions: ActionsPluginStart,
  connectorTypeId: string
): WorkplaceConnectorMetadata['workplaceMetadata'] | undefined {
  try {
    // Get the connector type from the registry
    const connectorTypes = actions.listTypes();
    const connectorType = connectorTypes.find((ct) => ct.id === connectorTypeId);

    if (!connectorType) {
      return undefined;
    }

    // The metadata is stored on the connector type object
    // We need to cast to access it since it's not in the official type
    const extendedConnector = connectorType as any;

    return extendedConnector.workplaceMetadata;
  } catch (error) {
    // Connector type not found or not registered
    return undefined;
  }
}

/**
 * Example usage: Generate workflows for a connector instance
 */
export async function generateWorkflowsForConnector(
  actions: ActionsPluginStart,
  connectorTypeId: string,
  stackConnectorId: string
): Promise<Array<{ workflowId: string; yaml: string }>> {
  const metadata = getConnectorMetadata(actions, connectorTypeId);

  if (!metadata?.workflowTemplates) {
    return [];
  }

  return Object.entries(metadata.workflowTemplates).map(([workflowId, generator]) => ({
    workflowId,
    yaml: generator(stackConnectorId),
  }));
}

/**
 * Example usage: Check if connector supports OAuth
 */
export function hasOAuthSupport(
  actions: ActionsPluginStart,
  connectorTypeId: string
): boolean {
  const metadata = getConnectorMetadata(actions, connectorTypeId);
  return metadata?.oauth !== undefined;
}

/**
 * Example usage: Get OAuth configuration
 */
export function getOAuthConfig(actions: ActionsPluginStart, connectorTypeId: string) {
  const metadata = getConnectorMetadata(actions, connectorTypeId);
  return metadata?.oauth;
}

/**
 * Example usage: Check if tool generation is enabled
 */
export function shouldGenerateTools(
  actions: ActionsPluginStart,
  connectorTypeId: string
): boolean {
  const metadata = getConnectorMetadata(actions, connectorTypeId);
  return metadata?.toolGeneration?.enabled === true;
}