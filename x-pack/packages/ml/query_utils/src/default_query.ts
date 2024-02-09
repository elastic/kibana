/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFilterBasedSimpleQuery } from './filter_based_simple_query';
import { isMatchAllQuery } from './match_all_query';
import { isSimpleQuery } from './simple_query';
import type { SearchQueryVariant } from './types';

export function isDefaultQuery(query: SearchQueryVariant): boolean {
  return (
    isMatchAllQuery(query) ||
    (isSimpleQuery(query) && query.query_string.query === '*') ||
    (isFilterBasedSimpleQuery(query) &&
      (query.bool.filter[0].query_string.query === '*' || isMatchAllQuery(query.bool.filter[0])))
  );
}
