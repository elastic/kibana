/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Walker, parse } from '@kbn/esql-ast';
import type { AggregateQuery } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';

/**
 * Analyzes an ES|QL query to determine if it contains STATS operations with AVG() functions
 * combined with BY BUCKET(@timestamp, ...) groupings.
 * 
 * This is used to suggest line charts instead of the default bar charts for time series
 * aggregations that are not simple COUNT(*) operations.
 * 
 * @param query - The query to analyze (can be ES|QL or regular query)
 * @returns true if the query matches the pattern for line chart preference
 */
export function shouldPreferLineChartForESQLQuery(
  query: AggregateQuery | { [key: string]: any } | undefined | null
): boolean {
  if (!query || !isOfAggregateQueryType(query)) {
    return false;
  }

  try {
    const { root } = parse(query.esql);
    
    // Find all STATS commands
    const statsCommands = Walker.matchAll(root, { type: 'command', name: 'stats' });
    
    if (statsCommands.length === 0) {
      return false;
    }

    for (const statsCommand of statsCommands) {
      // Check if this STATS command has the pattern we're looking for
      let hasNonCountAggregation = false;
      let hasBucketTimestamp = false;

      Walker.walk(statsCommand, {
        visitFunction: (fn) => {
          // Check for aggregation functions that are not COUNT(*)
          if (['avg', 'sum', 'min', 'max', 'median', 'percentile'].includes(fn.name.toLowerCase())) {
            hasNonCountAggregation = true;
          }
          
          // Check for BUCKET function with @timestamp
          if (fn.name.toLowerCase() === 'bucket') {
            // Check if first argument is @timestamp or a timestamp field
            if (fn.args && fn.args.length > 0) {
              const firstArg = fn.args[0];
              if (firstArg && typeof firstArg === 'object' && 'type' in firstArg && 
                  firstArg.type === 'column' && 'name' in firstArg && typeof firstArg.name === 'string' &&
                  (firstArg.name === '@timestamp' || firstArg.name.includes('timestamp'))) {
                hasBucketTimestamp = true;
              }
            }
          }
        },
      });

      // If we found both conditions in this STATS command, prefer line chart
      if (hasNonCountAggregation && hasBucketTimestamp) {
        return true;
      }
    }

    return false;
  } catch (error) {
    // If parsing fails, fall back to default behavior
    return false;
  }
}

/**
 * Extended analysis that also checks for specific patterns in BY clauses
 * to detect time-series aggregations more accurately.
 */
export function analyzeESQLTimeSeriesPattern(
  query: AggregateQuery | { [key: string]: any } | undefined | null
): {
  isTimeSeries: boolean;
  hasNonCountAggregation: boolean;
  aggregationTypes: string[];
  timestampFields: string[];
} {
  const result = {
    isTimeSeries: false,
    hasNonCountAggregation: false,
    aggregationTypes: [] as string[],
    timestampFields: [] as string[],
  };

  if (!query || !isOfAggregateQueryType(query)) {
    return result;
  }

  try {
    const { root } = parse(query.esql);
    const statsCommands = Walker.matchAll(root, { type: 'command', name: 'stats' });

    for (const statsCommand of statsCommands) {
      Walker.walk(statsCommand, {
        visitFunction: (fn) => {
          const functionName = fn.name.toLowerCase();
          
          // Track aggregation functions
          if (['avg', 'sum', 'min', 'max', 'median', 'percentile', 'count'].includes(functionName)) {
            result.aggregationTypes.push(functionName);
            
            // Mark as non-count aggregation if it's not count(*)
            if (functionName !== 'count') {
              result.hasNonCountAggregation = true;
            }
          }
          
          // Track BUCKET functions with timestamp fields
          if (functionName === 'bucket' && fn.args && fn.args.length > 0) {
            const firstArg = fn.args[0];
            if (firstArg && typeof firstArg === 'object' && 'type' in firstArg && 
                firstArg.type === 'column' && 'name' in firstArg && typeof firstArg.name === 'string') {
              const fieldName = firstArg.name;
              if (fieldName === '@timestamp' || fieldName.includes('timestamp') || fieldName.includes('time')) {
                result.timestampFields.push(fieldName);
                result.isTimeSeries = true;
              }
            }
          }
        },
      });
    }

    return result;
  } catch (error) {
    return result;
  }
}
