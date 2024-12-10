/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Query } from '@kbn/es-query';
import { buildBaseFilterCriteria } from '@kbn/ml-query-utils';

export const buildFilterCriteria = (
  timeFieldName?: string,
  earliestMs?: number | string,
  latestMs?: number | string,
  query?: Query['query']
): estypes.QueryDslQueryContainer[] => {
  return buildBaseFilterCriteria(
    timeFieldName,
    earliestMs,
    latestMs,
    query,
    'epoch_millis||strict_date_optional_time'
  );
};
