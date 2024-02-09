/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { isSimpleQuery } from './simple_query';
import type { FilterBasedSimpleQuery } from './types';

export function isFilterBasedSimpleQuery(arg: unknown): arg is FilterBasedSimpleQuery {
  return (
    isPopulatedObject(arg, ['bool']) &&
    isPopulatedObject(arg.bool, ['filter']) &&
    Array.isArray(arg.bool.filter) &&
    arg.bool.filter.length === 1 &&
    isSimpleQuery(arg.bool.filter[0])
  );
}
