/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContextEngineConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { AiIndexSource } from '../../common/http_api/ai_indices';
import { InvalidConnectorSourceError } from './errors';

export const validateConnectorSources = async ({
  sources,
  actions,
  request,
}: {
  sources: AiIndexSource[];
  actions: ActionsPluginStart;
  request: KibanaRequest;
}): Promise<void> => {
  const connectorIds = [
    ...new Set(
      sources.filter((source) => source.type === 'connector').map((source) => source.value)
    ),
  ];

  if (connectorIds.length === 0) {
    return;
  }

  const actionsClient = await actions.getActionsClientWithRequest(request);

  const supportedTypes = await actionsClient.listTypes({
    featureId: ContextEngineConnectorFeatureId,
  });
  const supportedTypeIds = new Set(supportedTypes.map((type) => type.id));

  let connectorTypeById: Map<string, string>;
  try {
    const connectors = await actionsClient.getBulk({ ids: connectorIds });
    connectorTypeById = new Map(
      connectors.map((connector) => [connector.id, connector.actionTypeId])
    );
  } catch (error) {
    // getBulk throws when any id is missing or the caller lacks read access;
    throw new InvalidConnectorSourceError(
      `Unable to resolve connector sources: ${connectorIds.join(', ')}`
    );
  }

  for (const connectorId of connectorIds) {
    const connectorTypeId = connectorTypeById.get(connectorId);

    if (connectorTypeId === undefined) {
      throw new InvalidConnectorSourceError(`Connector [${connectorId}] was not found`);
    }

    if (!supportedTypeIds.has(connectorTypeId)) {
      throw new InvalidConnectorSourceError(
        `Connector [${connectorId}] of type [${connectorTypeId}] cannot be used as an AI index source`
      );
    }
  }
};
