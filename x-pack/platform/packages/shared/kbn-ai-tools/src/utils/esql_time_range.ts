/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';

const TIME_FIELD = '@timestamp';

/**
 * Builds an inline ES|QL `@timestamp` range predicate for `[start, end]` (epoch millis).
 *
 * Prefer this over sending the time range as the `_query` request-level
 * `filter`. For ES|QL views (`$.<name>`), a request `filter` is applied above
 * the view's output, which prevents `SAMPLE`, `LIMIT` and `STATS` from being
 * pushed down into the view's source scan, so every matching row is streamed
 * to the coordinator first. An inline predicate is pushed to Lucene together
 * with the view's own `WHERE`.
 */
export function esqlTimeRange(start: number, end: number): ESQLAstExpression {
  const timeField = esql.col(TIME_FIELD);
  const rangeStart = esql.str(new Date(start).toISOString());
  const rangeEnd = esql.str(new Date(end).toISOString());
  return esql.exp`${timeField} >= ${rangeStart} AND ${timeField} <= ${rangeEnd}`;
}
