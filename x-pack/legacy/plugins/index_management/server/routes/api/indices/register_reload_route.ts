/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';

import { fetchIndices } from '../../../lib/fetch_indices';

interface ReqPayload {
  indexNames: string[];
}

const handler: RouterRouteHandler = async (request, callWithRequest) => {
  const { indexNames = [] } = request.payload as ReqPayload;
  return fetchIndices(callWithRequest, indexNames);
};

export function registerReloadRoute(router: Router) {
  router.post('indices/reload', handler);
}
