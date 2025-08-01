/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import {
  InferenceConnector,
  isSupportedConnectorType,
  connectorToInference,
} from '@kbn/inference-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InferenceServerStart, InferenceStartDependencies } from '../types';

export async function listConnectors(request: KibanaRequest, actions: ActionsPluginStart) {
  const client = await actions.getActionsClientWithRequest(request);

  const allConnectors = await client.getAll({
    includeSystemActions: false,
  });

  const connectors: InferenceConnector[] = allConnectors
    .filter((connector) => isSupportedConnectorType(connector.actionTypeId))
    .map(connectorToInference);
  return connectors;
}

export function registerConnectorsRoute({
  coreSetup,
  router,
}: {
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  router: IRouter<RequestHandlerContext>;
}) {
  router.get(
    {
      path: '/internal/inference/connectors',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {},
    },
    async (_context, request, response) => {
      const actions = await coreSetup
        .getStartServices()
        .then(([_coreStart, pluginsStart]) => pluginsStart.actions);
      const connectors = await listConnectors(request, actions);
      return response.ok({ body: { connectors } });
    }
  );
}
