/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const bodySchema = schema.any();

const paramsSchema = schema.object({
  indexName: schema.string(),
});

export function registerUpdateRoute({ router }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/settings/{indexName}'),
      validate: { body: bodySchema, params: paramsSchema },
    },
    async (ctx, req, res) => {
      const { indexName } = req.params;
      const params = {
        ignoreUnavailable: true,
        allowNoIndices: false,
        expandWildcards: 'none',
        index: indexName,
        body: req.body,
      };

      const response = await ctx.core.elasticsearch.dataClient.callAsCurrentUser(
        'indices.putSettings',
        params
      );
      return res.ok({ body: response });
    }
  );
}
