/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { SimpleQuery } from './types';

export const defaultSimpleQuery: SimpleQuery = { query_string: { query: '*' } };

export function isSimpleQuery(arg: unknown): arg is SimpleQuery {
  return isPopulatedObject(arg, ['query_string']);
}
