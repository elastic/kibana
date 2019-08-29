/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const drillDownRegex = /\{\{gquery\}\}/g;

export function isUrlTemplateValid(url: string) {
  return url.search(drillDownRegex) > -1;
}
