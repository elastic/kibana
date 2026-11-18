/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ConnectorSkillsService } from '@kbn/agent-builder-server/runner';
import { getConnectorSkillRegistryIds } from '@kbn/connector-specs';

const MAX_CONCURRENT_CONNECTOR_LOOKUPS = 5;

type ActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

/** Reads the connector types with one bulk request, or one at a time when an id is stale. */
const getActionTypeIds = async (
  actionsClient: ActionsClient,
  ids: string[]
): Promise<Array<string | undefined>> => {
  try {
    const connectors = await actionsClient.getBulk({ ids, throwIfSystemAction: false });
    return connectors.map(({ actionTypeId }) => actionTypeId);
  } catch (error) {
    // The bulk call fails as a whole on a missing id. Nothing removes a deleted connector from an
    // agent's `connector_ids`, so a stale id is possible: skip only the ids that cannot be read.
    return pMap(
      ids,
      (id) =>
        actionsClient.get({ id }).then(
          ({ actionTypeId }) => actionTypeId,
          () => undefined
        ),
      { concurrency: MAX_CONCURRENT_CONNECTOR_LOOKUPS }
    );
  }
};

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
        const ids = [...new Set(connectorIds)];
        const actionTypeIds = await getActionTypeIds(actionsClient, ids);
        const connectorTypes = new Set(
          actionTypeIds.filter((id): id is string => id !== undefined)
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
