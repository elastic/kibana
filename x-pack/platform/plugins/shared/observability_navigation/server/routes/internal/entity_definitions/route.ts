/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createServerRoute } from '../../../create_server_route';
import { EntityDefinitionsResponse } from '../../../../common/types';
import { getEntityDefinitions } from './get_entity_definitions';
import { getNavigationItems } from '../setup/get_navigation_items';
import { enrichEntityDefinitions } from './enrich_entity_definitions';

const entityDefinitionsRoute = createServerRoute({
  endpoint: 'GET /internal/observability/entity_definitions/{namespace}',
  options: {
    access: 'internal',
    summary: 'Get entity definitions',
    description: 'Fetches entity definitions',
    availability: {
      stability: 'experimental',
    },
  },
  params: z.object({
    query: z.object({
      entityId: z.optional(z.string()),
    }),
    path: z.object({
      namespace: z.string(),
    }),
  }),
  security: {
    authz: {
      enabled: false,
      reason: 'The route is opted out of the authorization since it is a POC',
    },
  },
  async handler({ params, request, getScopedClients }): Promise<EntityDefinitionsResponse[]> {
    const { soClient, packageClient, scopedClusterClient } = await getScopedClients({ request });
    const { namespace } = params.path;
    const { entityId } = params.query || {};

    const [entityDefinitions, navigationItems] = await Promise.all([
      getEntityDefinitions({ soClient, namespace }),
      getNavigationItems({
        soClient,
        packageClient,
        scopedClusterClient,
        includeEntityDefinitions: false,
      }),
    ]);

    return enrichEntityDefinitions(
      entityId ? entityDefinitions.filter((def) => def.id === entityId) : entityDefinitions,
      navigationItems
    );
  },
});

export const internalEntityDefinitionRoutes = {
  ...entityDefinitionsRoute,
};
