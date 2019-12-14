/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const handler = async (request, callWithRequest, h) => {
  const { indices = [] } = request.payload;
  const params = {
    path: `/${encodeURIComponent(indices.join(','))}/_unfreeze`,
    method: 'POST',
  };

  await callWithRequest('transport.request', params);
  return h.response();
};
export function registerUnfreezeRoute(router) {
  router.post('indices/unfreeze', handler);
}
