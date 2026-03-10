/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FindActionResult } from '@kbn/actions-plugin/server';
import { isSupportedConnector } from '@kbn/inference-common';
import { createGenAiSettingsServerRoute } from '../create_gen_ai_settings_server_route';

const listConnectorsRoute = createGenAiSettingsServerRoute({
  endpoint: 'GET /internal/gen_ai_settings/connectors',
  security: {
    authz: {
      enabled: false,
      reason: 'The route is protected by the actions plugin',
    },
  },
  handler: async (resources): Promise<FindActionResult[]> => {
    const { request, plugins } = resources;

    const actionsClient = await (
      await plugins.actions.start()
    ).getActionsClientWithRequest(request);

    const [availableTypes, connectors] = await Promise.all([
      actionsClient
        .listTypes({
          includeSystemActionTypes: false,
        })
        .then((types) =>
          types
            .filter((type) => type.enabled && type.enabledInLicense && type.enabledInConfig)
            .map((type) => type.id)
        ),
      actionsClient.getAll(),
    ]);

    return connectors.filter(
      (connector) =>
        availableTypes.includes(connector.actionTypeId) && isSupportedConnector(connector)
    );
  },
});

export const connectorRoutes = {
  ...listConnectorsRoute,
};
