/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import type {
  MappingRuntimeFields,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import {
  METRIC_SERIES_BUCKET_FIELD,
  METRIC_SERIES_VALUE_FIELD,
} from '../rules/metric_series_contract';

/** Alerting v2 signal events index used by Significant Events readers. */
export const RULE_EVENTS_INDEX = '.rule-events';

/**
 * Canonical ES|QL projection of MATCH metric-series leaves from flattened `data`.
 *
 * `.rule-events.data` is `flattened`, so `data.bucket` / `data.metric_value` are
 * not columns. Every ES|QL read path must go through {@link projectMetricSeriesColumns}:
 *
 * ```esql
 * | EVAL metric_value = TO_INTEGER(FIELD_EXTRACT(data, "metric_value"))
 * | EVAL bucket = TO_DATETIME(TO_LONG(FIELD_EXTRACT(data, "bucket")))
 * ```
 *
 * `data.bucket` is the ES|QL date from `BUCKET` (epoch millis under flattened
 * storage); `data.metric_value` is an integer count. Do not `TO_LONG` on write.
 */
export function projectMetricSeriesColumns(query: ComposerQuery): ComposerQuery {
  const dataCol = esql.col('data');
  const bucketKey = esql.str(METRIC_SERIES_BUCKET_FIELD);
  const valueKey = esql.str(METRIC_SERIES_VALUE_FIELD);

  return query
    .pipe`EVAL metric_value = TO_INTEGER(FIELD_EXTRACT(${dataCol}, ${valueKey}))`
    .pipe`EVAL bucket = TO_DATETIME(TO_LONG(FIELD_EXTRACT(${dataCol}, ${bucketKey})))`;
}

/** Runtime field names used by DSL aggregations over the projected metric series. */
export const METRIC_SERIES_BUCKET_RUNTIME_FIELD = 'metric_series.bucket';
export const METRIC_SERIES_VALUE_RUNTIME_FIELD = 'metric_series.value';

/**
 * DSL equivalent of {@link projectMetricSeriesColumns}: typed runtime fields over
 * flattened `data` leaves (doc-values first, `_source` fallback).
 */
export const METRIC_SERIES_RUNTIME_MAPPINGS: MappingRuntimeFields = {
  [METRIC_SERIES_BUCKET_RUNTIME_FIELD]: {
    type: 'date',
    script: {
      source: `
        String bucket = null;
        if (doc.containsKey('data.${METRIC_SERIES_BUCKET_FIELD}') && !doc['data.${METRIC_SERIES_BUCKET_FIELD}'].empty) {
          bucket = doc['data.${METRIC_SERIES_BUCKET_FIELD}'].value.toString();
        } else if (params._source != null && params._source.containsKey('data') && params._source.data != null && params._source.data.containsKey('${METRIC_SERIES_BUCKET_FIELD}')) {
          def raw = params._source.data['${METRIC_SERIES_BUCKET_FIELD}'];
          if (raw != null) { bucket = raw.toString(); }
        }
        if (bucket != null && !bucket.isEmpty()) {
          // ES|QL date columns usually land as epoch-millis strings; ISO is possible.
          try {
            emit(Long.parseLong(bucket));
          } catch (NumberFormatException e) {
            emit(ZonedDateTime.parse(bucket).toInstant().toEpochMilli());
          }
        }
      `,
    },
  },
  [METRIC_SERIES_VALUE_RUNTIME_FIELD]: {
    type: 'long',
    script: {
      source: `
        def raw = null;
        if (doc.containsKey('data.${METRIC_SERIES_VALUE_FIELD}') && !doc['data.${METRIC_SERIES_VALUE_FIELD}'].empty) {
          raw = doc['data.${METRIC_SERIES_VALUE_FIELD}'].value;
        } else if (params._source != null && params._source.containsKey('data') && params._source.data != null && params._source.data.containsKey('${METRIC_SERIES_VALUE_FIELD}')) {
          raw = params._source.data['${METRIC_SERIES_VALUE_FIELD}'];
        }
        if (raw != null) {
          emit(Long.parseLong(raw.toString()));
        }
      `,
    },
  },
};

export interface RuleEventsSignalFilterParams {
  spaceId: string;
  lookback: string;
  ruleIds?: string[];
  ruleUuid?: string;
}

/** Shared DSL filter for signal docs in {@link RULE_EVENTS_INDEX}. */
export function buildRuleEventsSignalFilter({
  spaceId,
  lookback,
  ruleIds,
  ruleUuid,
}: RuleEventsSignalFilterParams): QueryDslQueryContainer[] {
  const filter: QueryDslQueryContainer[] = [
    { term: { type: 'signal' } },
    { term: { space_id: spaceId } },
    { range: { '@timestamp': { gte: lookback } } },
  ];
  if (ruleUuid) {
    filter.push({ term: { 'rule.id': ruleUuid } });
  }
  if (ruleIds?.length) {
    filter.push({ terms: { 'rule.id': ruleIds } });
  }
  return filter;
}
