/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTracedEsClient } from '@kbn/traced-es-client';
import { createServerRoute } from '../create_server_route';

export const getQueriesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/queries',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  handler: async ({ request, logger, getScopedClients }): Promise<{}> => {
    const { scopedClusterClient } = await getScopedClients({ request });

    return {};
  },
});

export const esqlRoutes = {
  ...getQueriesRoute,
};
