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

export function registerUnfreezeRoute({ router }: RouteDependencies) {
  router.post(
    { path: addBasePath('/indices/unfreeze'), validate: { body: bodySchema } },
    async (ctx, req, res) => {
      const { indices = [] } = req.body as ReqBody;
      const params = {
        path: `/${encodeURIComponent(indices.join(','))}/_unfreeze`,
        method: 'POST',
      };

      await ctx.core.elasticsearch.adminClient.callAsCurrentUser('transport.request', params);
      return res.ok();
    }
  );
}
