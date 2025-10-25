/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Walker, Parser } from '@kbn/esql-ast';
import type { AggregateQuery } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';

/**
 * Analyzes an ES|QL query to determine if it contains STATS operations with continuous metric 
 * aggregations (like AVG, SUM, RATE, etc.) combined with BY BUCKET(@timestamp, ...) groupings.
 * 
 * Uses an exclusion-based approach: only histogram-style aggregations (COUNT, COUNT_DISTINCT, 
 * CARDINALITY) keep the default bar chart behavior. All other aggregation functions suggest 
 * line charts as they represent continuous metrics over time.
 * 
 * This approach is future-proof - new aggregation functions automatically get line chart 
 * preference without code changes.
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
    const { root } = Parser.parse(query.esql);
    
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
          const functionName = fn.name.toLowerCase();
          
          // Define histogram-style aggregations that should keep default behavior (bar charts)
          // These are typically counting operations that represent discrete events
          const histogramFunctions = ['count', 'count_distinct', 'cardinality'];
          
          // Define non-aggregation functions to exclude from aggregation detection
          const nonAggregationFunctions = ['bucket', '=', 'and', 'or', 'not', 'like', 'in', 'is', 'null'];
          
          // Check if this is an aggregation function that's NOT histogram-style
          // Only consider functions with arguments that aren't known non-aggregation functions
          const hasArgs = fn.args && fn.args.length > 0;
          const isNotExcludedFunction = !nonAggregationFunctions.includes(functionName);
          const isAggregationFunction = hasArgs && isNotExcludedFunction;
          
          if (isAggregationFunction && !histogramFunctions.includes(functionName)) {
            hasNonCountAggregation = true;
          }
          
          // Check for BUCKET function with @timestamp
          if (functionName === 'bucket') {
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

