/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Query } from '@kbn/es-query';

/**
 * Builds the base filter criteria used in queries,
 * adding criteria for the time range and an optional query.
 *
 * @param timeFieldName - optional time field name of the data view
 * @param earliestMs - optional earliest timestamp of the selected time range
 * @param latestMs - optional latest timestamp of the selected time range
 * @param query - optional query
 * @returns filter criteria
 */
export function buildBaseFilterCriteria(
  timeFieldName?: string,
  earliestMs?: number,
  latestMs?: number,
  query?: Query['query']
): estypes.QueryDslQueryContainer[] {
  const filterCriteria = [];

  if (timeFieldName && earliestMs && latestMs) {
    filterCriteria.push({
      range: {
        [timeFieldName]: {
          gte: earliestMs,
          lte: latestMs,
          format: 'epoch_millis',
        },
      },
    });
  }

  if (query && typeof query === 'object') {
    filterCriteria.push(query);
  }

  return filterCriteria;
}
