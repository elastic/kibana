/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const drillDownRegex = /\{\{gquery\}\}/g;
const defaultKibanaQuery = /,query:\(language:kuery,query:'.*?'\)/g;

export function isUrlTemplateValid(url: string) {
  return url.search(drillDownRegex) > -1;
}

export function isKibanaUrl(url: string) {
  return url.search(defaultKibanaQuery) > -1;
}

export function replaceKibanaUrlParam(url: string) {
  return url.replace(defaultKibanaQuery, ',query:(language:kuery,query:{{gquery}})');
}
