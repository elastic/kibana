import { has } from 'lodash';

/**
 * Creates a standardized query object from old queries that were either strings or pure ES query DSL
 *
 * @param query - a legacy query, what used to be stored in SearchSource's query property
 * @return Object
 */
export function migrateLegacyQuery(query) {

  // Lucene was the only option before, so language-less queries are all lucene
  if (!has(query, 'language')) {
    return { query: query, language: 'lucene' };
  }

  return query;
}
