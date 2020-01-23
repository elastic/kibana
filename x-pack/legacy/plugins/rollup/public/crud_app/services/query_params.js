/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function extractQueryParams(queryString) {
  if (!queryString || queryString.trim().length === 0) {
    return {};
  }

  const extractedQueryParams = {};
  const queryParamPairs = queryString
    .split('?')[1]
    .split('&')
    .map(paramString => paramString.split('='));

  queryParamPairs.forEach(([key, value]) => {
    extractedQueryParams[key] = decodeURIComponent(value);
  });

  return extractedQueryParams;
}
