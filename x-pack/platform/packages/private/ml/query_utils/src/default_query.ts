/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolFilterBasedSimpleQuery } from './bool_filter_based_simple_query';
import { isMatchAllQuery } from './match_all_query';
import { isSimpleDefaultQuery } from './simple_query';
import type { SearchQueryVariant } from './types';

/**
 * Checks if the provided query is a default query. A default query is considered as one that matches all documents,
 * either directly through a `match_all` query, a `SimpleQuery` with a wildcard query string, or a `BoolFilterBasedSimpleQuery`
 * that contains a filter with a wildcard query or a `match_all` condition.
 *
 * @param query - The query to check.
 * @returns True if the query is a default query, false otherwise.
 */
export function isDefaultQuery(query: SearchQueryVariant): boolean {
  return (
    isMatchAllQuery(query) ||
    isSimpleDefaultQuery(query) ||
    (isBoolFilterBasedSimpleQuery(query) &&
      (query.bool.filter[0].query_string.query === '*' || isMatchAllQuery(query.bool.filter[0])))
  );
}
