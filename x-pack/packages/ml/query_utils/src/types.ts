/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * Constant for kuery and lucene string
 */
export const SEARCH_QUERY_LANGUAGE = {
  KUERY: 'kuery',
  LUCENE: 'lucene',
} as const;

/**
 * Type for SearchQueryLanguage
 */
export type SearchQueryLanguage = typeof SEARCH_QUERY_LANGUAGE[keyof typeof SEARCH_QUERY_LANGUAGE];

/**
 * Placeholder for the structure for a saved search query.
 */
export type SavedSearchQuery = object;

/**
 * Represents a simple query structure for searching documents.
 */
export interface SimpleQuery<Q = string> {
  /**
   * Defines the query string parameters for the search.
   */
  query_string: {
    /**
     * The query text to search for within documents.
     */
    query: Q;

    /**
     * The default logical operator.
     */
    default_operator?: estypes.QueryDslOperator;
  };
}

/**
 * Represents simple queries that are based on a boolean filter.
 */
export interface BoolFilterBasedSimpleQuery {
  /**
   * The container for the boolean filter logic.
   */
  bool: {
    /**
     * An array of `SimpleQuery` objects.
     */
    filter: [SimpleQuery];
    must: [];
    must_not: [];
    should?: [];
  };
}

/**
 * Represents a union of search queries that can be used to fetch documents.
 */
export type SearchQueryVariant = BoolFilterBasedSimpleQuery | SimpleQuery | SavedSearchQuery;
