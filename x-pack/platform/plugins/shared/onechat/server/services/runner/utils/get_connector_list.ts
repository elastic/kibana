/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import {
  isSupportedConnector,
  connectorToInference,
  InferenceConnector,
} from '@kbn/inference-common';

export const getConnectorList = async ({
  actions,
  request,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
}): Promise<InferenceConnector[]> => {
  const actionClient = await actions.getActionsClientWithRequest(request);

  const allConnectors = await actionClient.getAll({
    includeSystemActions: false,
  });

  return allConnectors
    .filter((connector) => isSupportedConnector(connector))
    .map(connectorToInference);
};
