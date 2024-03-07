/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { isDefaultQuery } from './default_query';

const boolRequiredAttributes = ['filter', 'must', 'must_not'];

// should identify variants of
// `{ bool: { filter: [{ match_all: {} }], must: [], must_not: [], should: [] } }`
// `{ bool: { filter: [], must: [{ match_all: {} }], must_not: [] } }`
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
