/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const PLUGIN_ID = 'lens';
export const NOT_INTERNATIONALIZED_PRODUCT_NAME = 'Lens Visualizations';
export const BASE_APP_URL = '/app/kibana';
export const BASE_API_URL = '/api/lens';

export function getBasePath() {
  return `${BASE_APP_URL}#/lens`;
}

export function getEditPath(id: string) {
  return `${BASE_APP_URL}#/lens/edit/${encodeURIComponent(id)}`;
}
