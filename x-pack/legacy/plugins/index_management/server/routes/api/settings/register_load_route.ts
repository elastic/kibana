/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';

// response comes back as { [indexName]: { ... }}
// so plucking out the embedded object
function formatHit(hit: { [key: string]: {} }) {
  const key = Object.keys(hit)[0];
  return hit[key];
}

const handler: RouterRouteHandler = async (request, callWithRequest) => {
  const { indexName } = request.params;
  const params = {
    expandWildcards: 'none',
    flatSettings: false,
    local: false,
    includeDefaults: true,
    index: indexName,
  };

  const hit = await callWithRequest('indices.getSettings', params);
  return formatHit(hit);
};
export function registerLoadRoute(router: Router) {
  router.get('settings/{indexName}', handler);
}
