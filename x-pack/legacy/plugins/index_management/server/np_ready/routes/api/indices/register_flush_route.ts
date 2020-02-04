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
});

export function registerFlushRoute({ router, license }: RouteDependencies) {
  router.post(
    { path: addBasePath('/indices/flush'), validate: { body: bodySchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const body = req.body as typeof bodySchema.type;
      const { indices = [] } = body;

      const params = {
        expandWildcards: 'none',
        format: 'json',
        index: indices,
      };

      await ctx.core.elasticsearch.dataClient.callAsCurrentUser('indices.flush', params);
      return res.ok();
    })
  );
}
