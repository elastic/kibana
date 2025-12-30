/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';

interface Bucket {
  key: string;
  doc_count: number;
}

export function registerGetIndexDocCountRoute({
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
          indexNames: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 1000 }),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { indexNames } = request.body;

      try {
        const result = await client.search({
          index: indexNames,
          size: 0,
          aggs: {
            by_index: {
              terms: {
                field: '_index',
              },
            },
          },
        });

        // @ts-expect-error incorrect types in package
        const values = ((result.aggregations?.by_index.buckets as Bucket[]) || []).reduce(
          (col, bucket) => {
            col[bucket.key] = bucket.doc_count;
            return col;
          },
          {} as Record<string, number>
        );

        return response.ok({ body: values });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
