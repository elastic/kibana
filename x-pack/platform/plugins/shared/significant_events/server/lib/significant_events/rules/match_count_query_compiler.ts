/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripMetadata } from '@kbn/streams-schema';
import { assertCanCompileMatchMetric } from './can_compile_match_metric';
import {
  METRIC_SERIES_BUCKET_FIELD,
  METRIC_SERIES_LIMIT,
  METRIC_SERIES_VALUE_FIELD,
} from './metric_series_contract';

/** Strip all METADATA columns; count series does not need `_id` / `_source`. */
const METADATA_TO_STRIP = ['_id', '_source', '_index', '_version'] as const;

/** Drop trailing author SORT/LIMIT/KEEP so they cannot cap rows before COUNT. */
const TRAILING_PIPE_COMMAND = /\s*\|\s*(?:SORT|LIMIT|KEEP)\b[\s\S]*$/i;

function stripTrailingPipeCommands(query: string): string {
  let result = query.trimEnd();
  while (TRAILING_PIPE_COMMAND.test(result)) {
    result = result.replace(TRAILING_PIPE_COMMAND, '').trimEnd();
  }
  return result;
}

function toFilterOnlyBase(esqlQuery: string): string {
  return stripTrailingPipeCommands(stripMetadata(esqlQuery, [...METADATA_TO_STRIP]));
}

/**
 * Compiles a filter-only MATCH KI into an Alerting v2 breach query that emits
 * closed-minute `{ bucket, metric_value }` rows (COUNT(*)).
 *
 * Time scoping for source docs comes from the rule engine lookback filter on
 * `time_field`. The in-query `DATE_TRUNC(NOW())` drops the open current minute.
 */
export function compileMatchCountBreachQuery(
  esqlQuery: string,
  timestampField: string
): string {
  assertCanCompileMatchMetric(esqlQuery);

  const base = toFilterOnlyBase(esqlQuery);

  // Keep `bucket` as a datetime (no TO_LONG here). Alerting persists the ES|QL
  // date value; readers project with TO_DATETIME(TO_LONG(FIELD_EXTRACT(...))).
  // SORT DESC + LIMIT N takes the newest N closed minutes, dropping the partial
  // oldest minute inside the lookback window (EVERY=5m, LOOKBACK=6m → 5 rows).
  return [
    base,
    `STATS ${METRIC_SERIES_VALUE_FIELD} = COUNT(*) BY ${METRIC_SERIES_BUCKET_FIELD} = BUCKET(${timestampField}, 1 minute)`,
    `WHERE ${METRIC_SERIES_BUCKET_FIELD} < DATE_TRUNC(1 minute, NOW())`,
    `KEEP ${METRIC_SERIES_BUCKET_FIELD}, ${METRIC_SERIES_VALUE_FIELD}`,
    `SORT ${METRIC_SERIES_BUCKET_FIELD} DESC`,
    `LIMIT ${METRIC_SERIES_LIMIT}`,
  ].join('\n| ');
}
