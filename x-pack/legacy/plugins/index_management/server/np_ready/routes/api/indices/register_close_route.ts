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

export function registerCloseRoute({ router }: RouteDependencies) {
  router.post(
    { path: addBasePath('/indices/close'), validate: { body: bodySchema } },
    async (ctx, req, res) => {
      const payload = req.body as ReqBody;
      const { indices = [] } = payload;

      const params = {
        expandWildcards: 'none',
        format: 'json',
        index: indices,
      };

      await ctx.core.elasticsearch.dataClient.callAsCurrentUser('indices.close', params);
      return res.ok();
    }
  );
}
