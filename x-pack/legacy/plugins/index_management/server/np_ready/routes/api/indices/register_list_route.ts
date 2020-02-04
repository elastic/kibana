/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchIndices } from '../../../lib/fetch_indices';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

export function registerListRoute({ router, license }: RouteDependencies) {
  router.get(
    { path: addBasePath('/indices'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const indices = await fetchIndices(ctx.core.elasticsearch.dataClient.callAsCurrentUser);
      return res.ok({ body: indices });
    })
  );
}
