/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { esqlTimeRange } from './esql_time_range';

/**
 * Builds an ES|QL query string that counts documents in one or more indices,
 * optionally restricted to a `[start, end]` time range and a KQL expression.
 */
export function buildCountQuery({
  index,
  start,
  end,
  kql,
}: {
  index: string | string[];
  start?: number;
  end?: number;
  kql?: string;
}): string {
  let query = esql.from(Array.isArray(index) ? index : [index]);

  if (start !== undefined && end !== undefined) {
    query = query.where`${esqlTimeRange(start, end)}`;
  }

  if (kql) {
    query = query.where`KQL(${esql.str(kql)})`;
  }

  return query.pipe`STATS total = COUNT(*)`.print('basic');
}
