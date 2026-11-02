/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';

/**
 * Extracts column names from the BY clause of a STATS command in an ES|QL query.
 *
 * Uses `getESQLStatsQueryMeta` from `@kbn/esql-utils` which parses the query
 * and extracts metadata about STATS commands including the group by fields.
 *
 * @param query - The ES|QL query string
 * @returns Array of column/field names from the BY clause
 *
 * @example
 * getGroupByColumnsFromQuery('FROM logs-* | STATS count() BY host.name')
 * // Returns: ['host.name']
 *
 * @example
 * getGroupByColumnsFromQuery('FROM logs-* | STATS count() BY host.name, service.name')
 * // Returns: ['host.name', 'service.name']
 */
export const getGroupByColumnsFromQuery = (query: string): string[] => {
  if (!query) {
    return [];
  }

  try {
    const { groupByFields } = getESQLStatsQueryMeta(query);
    return groupByFields.map(({ field }) => field);
  } catch {
    return [];
  }
};

interface UseDefaultGroupByProps {
  query: string;
}

export const useDefaultGroupBy = ({ query }: UseDefaultGroupByProps) => {
  const defaultGroupBy = useMemo(() => {
    return getGroupByColumnsFromQuery(query);
  }, [query]);

  return { defaultGroupBy };
};
