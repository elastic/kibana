/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';

import { fetchIndices } from '../../../lib/fetch_indices';

const handler: RouterRouteHandler = async (request, callWithRequest) => {
  return fetchIndices(callWithRequest);
};

export function registerListRoute(router: Router) {
  router.get('indices', handler);
}
