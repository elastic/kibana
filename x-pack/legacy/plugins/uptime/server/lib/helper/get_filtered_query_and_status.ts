/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getFilteredQuery } from './get_filtered_query';

/**
 * Returns a boolean representing whether or not the object is a valid status filter.
 * @param clauseToCheck an object that may be a status filter
 */
const isStatusFilter = (clauseToCheck: any): boolean =>
  !!(clauseToCheck.match && clauseToCheck.match['monitor.status']);

/**
 * This function will reduce an array of query clauses to a single boolean value indicating
 * if the clause has a status filter, or not.
 * @param clauseToCheck a list of filter clauses
 */
const hasNestedStatusFilter = (clauseToCheck: any[]): boolean =>
  clauseToCheck
    .map(childClause => isStatusFilter(childClause))
    .reduce((prev, cur) => prev || cur, false);

/**
 * Checks for a status filter object, or if the given parameter is an array with
 * a nested status filter object.
 * @param filterClause an object containing a status filter, or an array with an object
 * containing a filter.
 */
const hasStatusFilter = (filterClause: any): boolean => {
  const mustClause = get<object | undefined>(filterClause, 'bool.must');
  return Array.isArray(mustClause)
    ? hasNestedStatusFilter(mustClause)
    : isStatusFilter(filterClause);
};

/**
 * Finds the monitor.status query value from the supplied object.
 * @param statusFilter the list of objects containing the status filter.
 * @example
 * // returns 'down'
 * extractQueryValue(JSON.parse(`[
 * {
 *   "match": {
 *     "monitor.type": {
 *       "query": "http",
 *       "operator": "and"
 *     }
 *   }
 * },
 * {
 *   "match": {
 *     "observer.geo.name": {
 *       "query": "Philadelphia",
 *       "operator": "and"
 *     }
 *   }
 * },
 * {
 *   "match": {
 *     "monitor.status": {
 *       "query": "down",
 *       "operator": "and"
 *     }
 *   }
 * }
 * ]`))
 */
const extractQueryValue = (statusFilter: any[]) =>
  get<string | undefined>(
    statusFilter.find((clause: any) => get(clause, ['match', 'monitor.status', 'query'])),
    ['match', 'monitor.status', 'query']
  );

/**
 * Sometimes the library that generates our ES filters creates a nested filter object that contains
 * a status filter. We won't be able to supporty deeply-nested status in the short term, and our roadmpa
 * plans to deprecate some features that necessitate all this extra logic.
 *
 * In the meantime, we will support top-level status post-processing. To that end, this function will
 * return the status value like we have in previous versions, and handle the additional nested query.
 * @param filterClauses an object potentially containing a status value
 * @example
 * // returns 'down'
 * getStatusClause(JSON.parse(`
 *   [
 *     {
 *       "match": {
 *         "monitor.status": {
 *           "query": "down",
 *           "operator": "and"
 *         }
 *       }
 *     }
 *  ]`))
 * @example
 * // returns 'up'
 * getStatusClause(JSON.parse(`
 *   [
 *     {
 *       "bool": {
 *         "must": [
 *           {
 *             "match": {
 *               "monitor.status": {
 *                 "query": "up",
 *                 "operator": "and"
 *               }
 *             }
 *           }
 *         ]
 *       }
 *     }
 *   ]
 * `))
 */
const getStatusClause = (filterClauses: any): string | undefined => {
  if (!Array.isArray(filterClauses)) return undefined;
  // the status clause was not nested
  if (filterClauses.some(clause => clause.match && clause.match['monitor.status'])) {
    // search for the status filter and return its query value
    return extractQueryValue(filterClauses);
  }
  /* 
    The status clause was nested, map reduce the status query value.
    There should be only one value, but in the case of multiple this code
    will choose the last one
  */
  return filterClauses
    .map(clause => get<any>(clause, 'bool.must', []))
    .reduce((prev, cur) => extractQueryValue(cur) || prev, undefined);
};

/**
 * This function extracts the status query from the other filters and returns it, if it exists.
 * @param filters the filter string
 */
const getStatusFilter = (filters: any): string | undefined => {
  const statusFilter = get<any[]>(filters, 'bool.must', []).filter((filter: any) =>
    hasStatusFilter(filter)
  );
  return getStatusClause(statusFilter);
};

/**
 * This function exists to parse the filter parameters provided by the client.
 * It also isolates filters targeting the monitor.status field, because we often
 * need to apply that filter in memory after ES returns query results.
 *
 * @param dateRangeStart the beginning of the date range filter
 * @param dateRangeEnd the end of the date range filter
 * @param filters additional filters, if any
 */
export const getFilteredQueryAndStatusFilter = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters?: string | null
) => {
  let statusFilter: string | undefined;
  let filterObject: any;
  let nonStatusFilters;
  if (filters) {
    filterObject = JSON.parse(filters);
    statusFilter = getStatusFilter(filterObject);
    nonStatusFilters = getFilteredQuery(dateRangeStart, dateRangeEnd, {
      bool: {
        must: filterObject.bool.must.filter(
          (filter: any) =>
            // drop monitor.status filter clause
            !get<any | undefined>(filter, ['match', 'monitor.status'], undefined)
        ),
      },
    });
  } else {
    nonStatusFilters = getFilteredQuery(dateRangeStart, dateRangeEnd);
  }

  return {
    query: nonStatusFilters,
    statusFilter,
  };
};
