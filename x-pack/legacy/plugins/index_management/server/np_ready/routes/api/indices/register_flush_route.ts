/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

interface ReqBody {
  indices: string[];
}

const bodySchema = schema.object({
  indices: schema.arrayOf(schema.string()),
});

export function registerFlushRoute({ router }: RouteDependencies) {
  router.post(
    { path: addBasePath('/indices/flush'), validate: { body: bodySchema } },
    async (ctx, req, res) => {
      const body = req.body as ReqBody;
      const { indices = [] } = body;

      const params = {
        expandWildcards: 'none',
        format: 'json',
        index: indices,
      };

      await ctx.core.elasticsearch.dataClient.callAsCurrentUser('indices.flush', params);
      return res.ok();
    }
  );
}
