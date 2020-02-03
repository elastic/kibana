/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { fetchIndices } from '../../../lib/fetch_indices';

interface ReqBody {
  indexNames: string[];
}

const bodySchema = schema.object({
  indexNames: schema.arrayOf(schema.string()),
});

export function registerReloadRoute({ router }: RouteDependencies) {
  router.post(
    { path: addBasePath('/indices/reload'), validate: { body: bodySchema } },
    async (ctx, req, res) => {
      const { indexNames = [] } = req.body as ReqBody;

      const indices = await fetchIndices(
        ctx.core.elasticsearch.adminClient.callAsCurrentUser,
        indexNames
      );
      return res.ok({ body: indices });
    }
  );
}
