/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const paramsSchema = schema.object({
  indexName: schema.string(),
});

function formatHit(hit: { [key: string]: { mappings: any } }, indexName: string) {
  const mapping = hit[indexName].mappings;
  return {
    mapping,
  };
}

export function registerMappingRoute({ router }: RouteDependencies) {
  router.get(
    { path: addBasePath('/mapping/{indexName}'), validate: { params: paramsSchema } },
    async (ctx, req, res) => {
      const { indexName } = req.params;
      const params = {
        expand_wildcards: 'none',
        index: indexName,
      };

      const hit = await ctx.core.elasticsearch.adminClient.callAsCurrentUser(
        'indices.getMapping',
        params
      );
      const response = formatHit(hit, indexName);
      return res.ok({ body: response });
    }
  );
}
