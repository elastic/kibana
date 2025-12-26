/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';

export function registerGetIndexDocCountRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: addInternalBasePath('/index_doc_count/{indexName}'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { indexName } = request.params;

      try {
        const { count } = await client.count({ index: indexName });
        return response.ok({ body: { count } });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
