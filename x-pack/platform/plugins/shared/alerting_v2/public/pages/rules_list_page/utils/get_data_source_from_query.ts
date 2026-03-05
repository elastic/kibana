/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';

/**
 * Extracts the data source (index pattern) from an ES|QL query string.
 *
 * Parses the FROM clause of the query and returns a comma-separated string
 * of the referenced index patterns. Returns `undefined` when the query is
 * empty or does not contain a recognisable FROM/TS command.
 *
 * @param query - The ES|QL query string (e.g. `"FROM logs-* | LIMIT 10"`)
 * @returns The extracted index pattern string, or `undefined` if none found
 *
 * @example
 * getDataSourceFromQuery('FROM logs-* | LIMIT 10');          // 'logs-*'
 * getDataSourceFromQuery('FROM logs-*, metrics-* | STATS …'); // 'logs-*,metrics-*'
 * getDataSourceFromQuery('');                                  // undefined
 * getDataSourceFromQuery(undefined);                           // undefined
 */
export const getDataSourceFromQuery = (query: string | undefined): string | undefined => {
  const indexPattern = getIndexPatternFromESQLQuery(query);
  return indexPattern || undefined;
};
