/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function formatHit(hit, indexName) {
  const { _shards, indices } = hit;
  const stats = indices[indexName];
  return {
    _shards,
    stats,
  };
}

const handler = async (request, callWithRequest) => {
  const { indexName } = request.params;
  const params = {
    expand_wildcards: 'none',
    index: indexName,
  };
  const hit = await callWithRequest('indices.stats', params);
  const response = formatHit(hit, indexName);

  return response;
};
export function registerStatsRoute(router) {
  router.get('stats/{indexName}', handler);
}
