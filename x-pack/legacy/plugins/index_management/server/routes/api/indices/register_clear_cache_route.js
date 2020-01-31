/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const handler = async (request, callWithRequest, h) => {
  const indices = request.payload.indices || [];
  const params = {
    expandWildcards: 'none',
    format: 'json',
    index: indices,
  };

  await callWithRequest('indices.clearCache', params);
  return h.response();
};
export function registerClearCacheRoute(router) {
  router.post('indices/clear_cache', handler);
}
