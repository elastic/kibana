/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
let httpClient;
export const setHttpClient = client => {
  httpClient = client;
};
const apiPrefix = chrome.addBasePath('/api/rollup');

export async function getRollupIndices() {
  const response = await httpClient.get(`${apiPrefix}/indices`);
  return response.data || {};
}
