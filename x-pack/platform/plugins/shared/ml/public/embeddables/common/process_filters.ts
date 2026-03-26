/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { buildEsQuery, isOfAggregateQueryType } from '@kbn/es-query';
import { getDefaultQuery } from '@kbn/data-plugin/public';

export function processFilters(
  optionalFilters?: Filter[],
  optionalQuery?: Query | AggregateQuery,
  controlledBy?: string
): estypes.QueryDslQueryContainer {
  const allFilters = optionalFilters ?? [];
  // Filter out filters controlled by the specified controlledBy value
  const filters =
    controlledBy !== undefined
      ? allFilters.filter((filter) => filter.meta.controlledBy !== controlledBy)
      : allFilters;

  // We do not support esql yet
  const query = isOfAggregateQueryType(optionalQuery) ? getDefaultQuery() : optionalQuery;
  return buildEsQuery(undefined, query ?? [], filters, {});
}
