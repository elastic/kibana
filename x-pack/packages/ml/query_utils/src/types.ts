/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
