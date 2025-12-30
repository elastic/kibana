/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';

interface DocCountsResponse {
  counts: Record<string, number>;
  errors: Record<string, { message: string }>;
}

async function mapWithLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  const maxWorkers = Math.min(limit, items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: maxWorkers }, async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) return;
      await fn(items[idx]);
    }
  });

  await Promise.all(workers);
}

export function registerGetIndexDocCountsRoute({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
  router.post(
    {
      path: addInternalBasePath('/index_doc_counts'),
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

      const body: DocCountsResponse = {
        counts: {},
        errors: {},
      };

      try {
        await mapWithLimit(indexNames, 10, async (indexName) => {
          try {
            const { count } = await client.count({ index: indexName });
            body.counts[indexName] = count;
          } catch (error) {
            // Keep the batch request successful and return a per-index error.
            body.errors[indexName] = { message: (error as Error)?.message ?? String(error) };
          }
        });

        return response.ok({ body });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
