/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDependencies } from '../../../types';
import { addBasePath } from '..';
import { fetchUserStartPrivileges } from '../../../lib/fetch_indices_status';

const paramsSchema = schema.object({
  indexName: schema.string(),
});

export function registerUserStatusPrivilegeRoutes({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
  router.get(
    {
      path: addBasePath('/start_privileges/{indexName}'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        params: paramsSchema,
      },
    },
    async (context, request, response) => {
      const core = await context.core;
      const client = core.elasticsearch.client.asCurrentUser;
      const { indexName } = request.params as typeof paramsSchema.type;
      try {
        const securityCheck = await fetchUserStartPrivileges(client, indexName);
        return response.ok({
          body: {
            privileges: {
              canManageIndex: securityCheck?.index?.[indexName]?.manage ?? false,
            },
          },
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
