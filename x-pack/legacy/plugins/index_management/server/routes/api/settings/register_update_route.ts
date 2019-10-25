/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';

const handler: RouterRouteHandler = async (request, callWithRequest) => {
  const { indexName } = request.params;
  const params = {
    ignoreUnavailable: true,
    allowNoIndices: false,
    expandWildcards: 'none',
    index: indexName,
    body: request.payload,
  };

  return await callWithRequest('indices.putSettings', params);
};
export function registerUpdateRoute(router: Router) {
  router.put('settings/{indexName}', handler);
}
