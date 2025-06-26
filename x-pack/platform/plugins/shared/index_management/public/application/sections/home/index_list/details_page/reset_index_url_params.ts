/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import qs from 'query-string';

export const resetIndexUrlParams = (search: string): string => {
  const indicesListParams = qs.parse(search);
  delete indicesListParams.indexName;
  delete indicesListParams.tab;
  return qs.stringify(indicesListParams);
};
