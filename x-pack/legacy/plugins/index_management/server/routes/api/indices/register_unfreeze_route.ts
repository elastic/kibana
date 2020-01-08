/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';

interface ReqPayload {
  indices: string[];
}

const handler: RouterRouteHandler = async (request, callWithRequest, h) => {
  const { indices = [] } = request.payload as ReqPayload;
  const params = {
    path: `/${encodeURIComponent(indices.join(','))}/_unfreeze`,
    method: 'POST',
  };

  await callWithRequest('transport.request', params);
  return h.response();
};

export function registerUnfreezeRoute(router: Router) {
  router.post('indices/unfreeze', handler);
}
