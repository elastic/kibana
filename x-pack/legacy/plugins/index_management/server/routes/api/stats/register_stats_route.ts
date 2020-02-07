/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';

function formatHit(hit: { _shards: any; indices: { [key: string]: any } }, indexName: string) {
  const { _shards, indices } = hit;
  const stats = indices[indexName];
  return {
    _shards,
    stats,
  };
}

const handler: RouterRouteHandler = async (request, callWithRequest) => {
  const { indexName } = request.params;
  const params = {
    expand_wildcards: 'none',
    index: indexName,
  };
  const hit = await callWithRequest('indices.stats', params);
  const response = formatHit(hit, indexName);

  return response;
};
export function registerStatsRoute(router: Router) {
  router.get('stats/{indexName}', handler);
}
