/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { isDefaultQuery } from './default_query';

const boolRequiredAttributes = ['filter', 'must', 'must_not'];

/**
 * Determines if the provided argument is a filter-based default query within a boolean filter context.
 *
 * A valid filter-based default query must include a `bool` property that contains
 * `filter`, `must`, and `must_not` properties. These properties should either be empty arrays
 * or arrays containing exactly one default query. The function checks for these conditions
 * to identify variants of default queries structured within a boolean filter.
 *
 * Examples of valid structures include:
 * - `{ bool: { filter: [{ match_all: {} }], must: [], must_not: [], should: [] } }`
 * - `{ bool: { filter: [], must: [{ match_all: {} }], must_not: [] } }`
 *
 * Useful to identify simple queries within bool queries
 * exposed from Kibana/EUI search bars.
 *
 * @param arg - The argument to be checked, its structure is unknown upfront.
 * @returns  Returns `true` if `arg` matches the expected structure of a
 * filter-based default query, otherwise `false`.
 */
export function isFilterBasedDefaultQuery(arg: unknown): boolean {
  return (
    isPopulatedObject(arg, ['bool']) &&
    isPopulatedObject(arg.bool, boolRequiredAttributes) &&
    Object.values(arg.bool).every(
      // should be either an empty array or an array with just 1 default query
      (d) => {
        return Array.isArray(d) && (d.length === 0 || (d.length === 1 && isDefaultQuery(d[0])));
      }
    )
  );
}
