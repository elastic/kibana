/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';

export function extractQueryParams(queryString) {
  const hrefSplit = queryString.split('?');
  if (!hrefSplit.length) {
    return {};
  }

  return parse(hrefSplit[1], { sort: false });
}
