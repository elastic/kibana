/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { SimpleQuery } from './types';

/**
 * Default instance of `SimpleQuery` with a wildcard query string.
 */
export const defaultSimpleQuery: SimpleQuery<'*'> = { query_string: { query: '*' } };

/**
 * Type guard verifying if an argument is a `SimpleQuery`.
 * @param {unknown} arg - Argument to check.
 * @returns {boolean} True if `arg` is a `SimpleQuery`, false otherwise.
 */
export function isSimpleQuery(arg: unknown): arg is SimpleQuery {
  return isPopulatedObject(arg, ['query_string']);
}

/**
 * Type guard verifying if an argument is a `SimpleQuery` with a default query.
 * @param {unknown} arg - Argument to check.
 * @returns {boolean} True if `arg` is a `SimpleQuery`, false otherwise.
 */
export function isSimpleDefaultQuery(arg: unknown): arg is SimpleQuery<'*'> {
  return isSimpleQuery(arg) && arg.query_string.query === '*';
}
