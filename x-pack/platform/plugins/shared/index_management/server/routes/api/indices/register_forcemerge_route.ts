/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDependencies } from '../../../types';
import { addBasePath } from '..';
import { executeAsyncByChunks } from './helpers';

const bodySchema = schema.object({
  indices: schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 }),
  maxNumSegments: schema.maybe(schema.number()),
});

export function registerForcemergeRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/indices/forcemerge'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        body: bodySchema,
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { maxNumSegments, indices = [] } = request.body as typeof bodySchema.type;
      const params = {
        expand_wildcards: 'none' as const,
        index: indices,
      };

      if (maxNumSegments) {
        (params as any).max_num_segments = maxNumSegments;
      }

      try {
        await executeAsyncByChunks(params, client, 'forcemerge');

        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
