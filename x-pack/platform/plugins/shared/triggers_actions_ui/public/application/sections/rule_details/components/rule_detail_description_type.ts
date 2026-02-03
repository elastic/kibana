/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULE_PREBUILD_DESCRIPTION_FIELDS = {
  INDEX_PATTERN: 'indexPattern',
  CUSTOM_QUERY: 'customQuery',
  ESQL_QUERY: 'esqlQuery',
  DATA_VIEW_ID: 'dataViewId',
  DATA_VIEW_INDEX_PATTERN: 'dataViewIndexPattern',
  QUERY_FILTERS: 'queryFilters',
  KQL_FILTERS: 'kqlFilters',
} as const;
