/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchIndices } from '../../../lib/fetch_indices';
const handler = async (request, callWithRequest) => {
  const { indexNames = [] } = request.payload;
  return fetchIndices(callWithRequest, indexNames);
};
export function registerReloadRoute(router) {
  router.post('indices/reload', handler);
}
