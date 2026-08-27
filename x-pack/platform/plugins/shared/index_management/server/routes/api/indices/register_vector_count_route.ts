/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';
import {
  fetchIndexVectorCount,
  hasIndexMonitorPrivilege,
} from '../../../lib/fetch_index_vector_count';

const INVALID_INDEX_NAME_CHARS = /[\\/*?"<>|,#:\s]/;

// `_stats` expands comma-separated lists and wildcards, but the privilege check treats the same
// string as one literal name, so a multi-target value would read indices the caller was never
// authorized for.
const isSingleIndexName = (indexName: string): boolean =>
  !INVALID_INDEX_NAME_CHARS.test(indexName) && !/^[-_+]/.test(indexName);

export const paramsSchema = schema.object({
  indexName: schema.string({
    minLength: 1,
    maxLength: 255,
    validate: (indexName) =>
      isSingleIndexName(indexName) ? undefined : 'must be a single index name',
  }),
});

export function registerVectorCountRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: addInternalBasePath('/indices/{indexName}/vector_count'),
      security: {
        authz: {
          enabled: false,
          reason:
            'The count comes from `_stats`, which is operator-only in serverless and so cannot be read with the scoped ES client. The handler checks the caller for the index `monitor` privilege itself before reading it as the internal user.',
        },
      },
      validate: {
        params: paramsSchema,
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { indexName } = request.params as typeof paramsSchema.type;

      try {
        if (!(await hasIndexMonitorPrivilege(client, indexName))) {
          return response.ok({ body: { vectorCount: null } });
        }

        return response.ok({
          body: { vectorCount: await fetchIndexVectorCount(client, indexName) },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
