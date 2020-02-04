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

// response comes back as { [indexName]: { ... }}
// so plucking out the embedded object
function formatHit(hit: { [key: string]: {} }) {
  const key = Object.keys(hit)[0];
  return hit[key];
}

export function registerLoadRoute({ router }: RouteDependencies) {
  router.get(
    { path: addBasePath('/settings/{indexName}'), validate: { params: paramsSchema } },
    async (ctx, req, res) => {
      const { indexName } = req.params;
      const params = {
        expandWildcards: 'none',
        flatSettings: false,
        local: false,
        includeDefaults: true,
        index: indexName,
      };

      const hit = await ctx.core.elasticsearch.dataClient.callAsCurrentUser(
        'indices.getSettings',
        params
      );
      return res.ok({ body: formatHit(hit) });
    }
  );
}
