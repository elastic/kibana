/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';

export function registerDeleteDocumentRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.delete(
    {
      path: addInternalBasePath('/indices/{indexName}/documents/{id}'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        params: schema.object({
          indexName: schema.string(),
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { indexName, id } = request.params;

      try {
        await client.delete({ index: indexName, id });
        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
