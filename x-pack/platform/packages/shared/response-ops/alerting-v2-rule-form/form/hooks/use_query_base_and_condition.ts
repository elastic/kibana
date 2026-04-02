/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { splitQueryAndCondition } from '../utils/split_query_and_condition';

interface UseQueryBaseAndConditionProps {
  query: string;
}

interface UseQueryBaseAndConditionResult {
  /** The query without the last WHERE clause, or the original query if no WHERE exists */
  baseQuery: string;
  /** The WHERE clause expression (without the "WHERE" keyword), or empty string if none */
  condition: string;
  /** Whether the query was successfully split (i.e., had a WHERE clause) */
  hasSplit: boolean;
}

/**
 * A hook that splits an ES|QL query into a base query and a condition
 * by extracting the last WHERE clause.
 *
 * For alerting purposes, the "condition" is typically the threshold or filter
 * that determines when to trigger an alert, while the "base query" defines
 * what data to analyze.
 *
 * @example
 * const { baseQuery, condition, hasSplit } = useQueryBaseAndCondition({
 *   query: 'FROM logs-* | STATS count() BY host | WHERE count > 100'
 * });
 * // baseQuery: 'FROM logs-* | STATS count() BY host'
 * // condition: 'count > 100'
 * // hasSplit: true
 *
 * @param props.query - The ES|QL query string to split
 * @returns Object containing baseQuery, condition, and hasSplit flag
 */
export const useQueryBaseAndCondition = ({
  query,
}: UseQueryBaseAndConditionProps): UseQueryBaseAndConditionResult => {
  const result = useMemo((): UseQueryBaseAndConditionResult => {
    const splitResult = splitQueryAndCondition(query);

    if (splitResult) {
      return {
        baseQuery: splitResult.baseQuery,
        condition: splitResult.condition,
        hasSplit: true,
      };
    }

    // No WHERE clause found - return original query as base
    return {
      baseQuery: query || '',
      condition: '',
      hasSplit: false,
    };
  }, [query]);

  return result;
};
