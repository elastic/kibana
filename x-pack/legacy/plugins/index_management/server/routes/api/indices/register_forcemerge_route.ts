/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';

interface ForceMergeReqPayload {
  maxNumSegments: number;
  indices: string[];
}

interface Params {
  expandWildcards: string;
  index: ForceMergeReqPayload['indices'];
  max_num_segments?: ForceMergeReqPayload['maxNumSegments'];
}

const handler: RouterRouteHandler = async (request, callWithRequest, h) => {
  const { maxNumSegments, indices = [] } = request.payload as ForceMergeReqPayload;
  const params: Params = {
    expandWildcards: 'none',
    index: indices,
  };

  if (maxNumSegments) {
    params.max_num_segments = maxNumSegments;
  }

  await callWithRequest('indices.forcemerge', params);
  return h.response();
};

export function registerForcemergeRoute(router: Router) {
  router.post('indices/forcemerge', handler);
}
