/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const handler = async (request, callWithRequest, h) => {
  const { maxNumSegments, indices = [] } = request.payload;
  const params = {
    expandWildcards: 'none',
    index: indices,
  };
  if (maxNumSegments) {
    params.max_num_segments = maxNumSegments;
  }

  await callWithRequest('indices.forcemerge', params);
  return h.response();
};
export function registerForcemergeRoute(router) {
  router.post('indices/forcemerge', handler);
}
