/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';
import { fetchDocCount } from '../../../lib/fetch_doc_count';

export function registerPostIndexDocCountRoute({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
  router.post(
    {
      path: addInternalBasePath('/index_doc_count'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        body: schema.object({
          indexNames: schema.arrayOf(schema.string({ maxLength: 1000 }), {
            minSize: 1,
            maxSize: 1000,
          }),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { indexNames } = request.body;

      try {
        // use ES since index list is too long for query dsl
        const values = await fetchDocCount(client, indexNames);
        return response.ok({ body: values });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
