/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ConnectorSkillsService } from '@kbn/agent-builder-server/runner';
import { getConnectorSkillRegistryIds } from '@kbn/connector-specs';

export const createConnectorSkillsService = ({
  actions,
  request,
  logger,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  logger: Logger;
}): ConnectorSkillsService => {
  return {
    resolveSkillIds: async (connectorIds: string[]): Promise<string[]> => {
      if (connectorIds.length === 0) return [];
      try {
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const connectors = await actionsClient.getAll();
        const connectorTypes = new Set(
          connectors
            .filter((connector) => connectorIds.includes(connector.id))
            .map((connector) => connector.actionTypeId)
        );
        return [...new Set([...connectorTypes].flatMap(getConnectorSkillRegistryIds))];
      } catch (error) {
        // Connector skills are an optional extra: never fail the run because they cannot be resolved.
        logger.warn(`Could not resolve connector skills: ${(error as Error).message}`);
        return [];
      }
    },
  };
};
