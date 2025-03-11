/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { isSimpleQuery } from './simple_query';
import type { BoolFilterBasedSimpleQuery } from './types';

/**
 * Type guard to check if the provided argument is a boolean filter-based simple query.
 *
 * A valid `BoolFilterBasedSimpleQuery` must have a `bool` property, which itself
 * must have a `filter` property. This `filter` must be an array with exactly
 * one element, and that element must satisfy the conditions of a simple query
 * as defined by `isSimpleQuery`.
 *
 * The type guard is useful to identify simple queries within bool filter
 * queries exposed from Kibana/EUI search bars.
 *
 * @param arg - The argument to be checked.
 * @returns `true` if `arg` meets the criteria of a `BoolFilterBasedSimpleQuery`, otherwise `false`.
 */
export function isBoolFilterBasedSimpleQuery(arg: unknown): arg is BoolFilterBasedSimpleQuery {
  return (
    isPopulatedObject(arg, ['bool']) &&
    isPopulatedObject(arg.bool, ['filter']) &&
    Array.isArray(arg.bool.filter) &&
    arg.bool.filter.length === 1 &&
    isSimpleQuery(arg.bool.filter[0])
  );
}
