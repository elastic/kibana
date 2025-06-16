/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';

const bodySchema = schema.object({
  indexName: schema.string(),
  indexMode: schema.string(),
});

export function registerCreateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.put(
    {
      path: addInternalBasePath('/indices/create'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { indexName, indexMode } = request.body as typeof bodySchema.type;

      const params: IndicesCreateRequest = {
        index: indexName,
        settings: {
          mode: indexMode,
        },
      };

      try {
        await client.asCurrentUser.indices.create(params);
        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
