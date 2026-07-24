/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildMatchMetricBase } from './can_compile_match_metric';
import {
  METRIC_SERIES_BUCKET_FIELD,
  METRIC_SERIES_LIMIT,
  METRIC_SERIES_VALUE_FIELD,
} from './metric_series_contract';

/**
 * Compiles a filter-only MATCH KI into an Alerting v2 breach query that emits
 * closed-minute `{ bucket, metric_value }` rows (COUNT(*)).
 *
 * Time scoping for source docs comes from the rule engine lookback filter on
 * `time_field`. The in-query `DATE_TRUNC(NOW())` drops the open current minute.
 */
export function compileMatchCountBreachQuery(esqlQuery: string, timestampField: string): string {
  // Parse once: assert filter-only eligibility and peel trailing SORT/LIMIT/KEEP
  // via AST source-slicing (never a text regex).
  const base = buildMatchMetricBase(esqlQuery);

  // Keep `bucket` as a datetime (no TO_LONG here). Alerting persists the ES|QL
  // date value; readers project with TO_DATETIME(TO_LONG(FIELD_EXTRACT(...))).
  // SORT DESC + LIMIT N takes the newest N closed minutes. With EVERY=5m,
  // LOOKBACK=7m and LIMIT=6 the newest closed minutes include a 1m intentional
  // overlap with the previous run (see metric_series_contract.ts).
  return [
    base,
    `STATS ${METRIC_SERIES_VALUE_FIELD} = COUNT(*) BY ${METRIC_SERIES_BUCKET_FIELD} = BUCKET(${timestampField}, 1 minute)`,
    `WHERE ${METRIC_SERIES_BUCKET_FIELD} < DATE_TRUNC(1 minute, NOW())`,
    `KEEP ${METRIC_SERIES_BUCKET_FIELD}, ${METRIC_SERIES_VALUE_FIELD}`,
    `SORT ${METRIC_SERIES_BUCKET_FIELD} DESC`,
    `LIMIT ${METRIC_SERIES_LIMIT}`,
  ].join('\n| ');
}
