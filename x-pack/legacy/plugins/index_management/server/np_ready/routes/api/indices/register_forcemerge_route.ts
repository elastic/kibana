/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const bodySchema = schema.object({
  indices: schema.arrayOf(schema.string()),
  maxNumSegments: schema.number(),
});

export function registerForcemergeRoute({ router, license }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/indices/forcemerge'),
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { maxNumSegments, indices = [] } = req.body as typeof bodySchema.type;
      const params = {
        expandWildcards: 'none',
        index: indices,
      };

      if (maxNumSegments) {
        (params as any).max_num_segments = maxNumSegments;
      }

      await ctx.core.elasticsearch.dataClient.callAsCurrentUser('indices.forcemerge', params);
      return res.ok();
    })
  );
}
