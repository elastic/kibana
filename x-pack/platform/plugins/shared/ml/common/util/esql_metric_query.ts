/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { ES_AGGREGATION } from '@kbn/ml-anomaly-utils';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';

/** Column name holding the re-bucketed chart time in the generated ES|QL query. */
export const ESQL_CHART_TIME_COLUMN = '__ml_chart_time';
/** Column name holding the metric value in the generated ES|QL query. */
export const ESQL_CHART_METRIC_COLUMN = '__ml_metric';

/** Maximum number of chart buckets returned for an ES|QL datafeed source data chart. */
export const ESQL_MAX_CHART_BUCKETS = 10000;

const ESQL_CARDINALITY_COLUMN_PREFIX = '__ml_cardinality_';

export interface EsqlEntityField {
  readonly fieldName: string;
  readonly fieldValue?: string | number | null;
}

export interface EsqlRequest {
  readonly query: string;
  readonly params: Array<Record<string, string>>;
  readonly filter: estypes.QueryDslQueryContainer;
}

export interface EsqlMetricQueryOptions {
  readonly esqlQuery: string;
  readonly sourceTimeField: string;
  readonly timeField: string;
  readonly entityFields: readonly EsqlEntityField[];
  readonly metricFunction: string | null;
  readonly metricFieldName?: string;
  readonly earliestMs: number;
  readonly latestMs: number;
  readonly intervalMs: number;
}

export interface EsqlCardinalityQueryOptions {
  readonly esqlQuery: string;
  readonly sourceTimeField: string;
  readonly fieldNames: readonly string[];
  readonly earliestMs: number;
  readonly latestMs: number;
}

/** Returns true when the datafeed runs an ES|QL query rather than a Query DSL search. */
export const isEsqlDatafeed = (
  datafeed: Partial<Datafeed> | undefined | null
): datafeed is Datafeed & { esql_query: string; source_time_field: string } =>
  typeof datafeed?.esql_query === 'string' &&
  datafeed.esql_query.length > 0 &&
  typeof datafeed.source_time_field === 'string' &&
  datafeed.source_time_field.length > 0;

const getChartInterval = (intervalMs: number): number => Math.max(1, Math.trunc(intervalMs));

const getFirstChartBucket = (earliestMs: number, interval: number): number =>
  Math.floor(earliestMs / interval) * interval;

/** Returns the number of chart buckets between earliestMs and latestMs, or 0 if latestMs is before earliestMs. */
export const getEsqlChartBucketCount = (
  earliestMs: number,
  latestMs: number,
  intervalMs: number
): number => {
  const interval = getChartInterval(intervalMs);
  const firstBucket = getFirstChartBucket(earliestMs, interval);
  if (latestMs < firstBucket) {
    return 0;
  }
  return Math.floor((latestMs - firstBucket) / interval) + 1;
};

/** Quotes an ES|QL identifier with backticks, escaping any backticks it contains. */
export const escapeEsqlIdentifier = (name: string): string => `\`${name.replace(/`/g, '``')}\``;

/**
 * Maps the ES aggregation name used for source data charts to an ES|QL aggregate expression.
 * Returns undefined when the aggregation cannot be expressed against the ES|QL output columns.
 */
export const getEsqlMetricExpression = (
  metricFunction: string | null,
  metricFieldName: string | undefined
): string | undefined => {
  const hasField = metricFieldName !== undefined && metricFieldName !== '';

  if (metricFunction === ES_AGGREGATION.COUNT && hasField === false) {
    return 'COUNT(*)';
  }
  if (hasField === false) {
    return undefined;
  }

  const field = escapeEsqlIdentifier(metricFieldName);
  switch (metricFunction) {
    case ES_AGGREGATION.AVG:
      return `AVG(${field})`;
    case ES_AGGREGATION.SUM:
      return `SUM(${field})`;
    case ES_AGGREGATION.MIN:
      return `MIN(${field})`;
    case ES_AGGREGATION.MAX:
      return `MAX(${field})`;
    case ES_AGGREGATION.PERCENTILES:
      return `MEDIAN(${field})`;
    case ES_AGGREGATION.CARDINALITY:
      return `COUNT_DISTINCT(${field})`;
    case ES_AGGREGATION.COUNT:
      return `COUNT(${field})`;
    default:
      return undefined;
  }
};

const buildSourceTimeFilter = (
  sourceTimeField: string,
  earliestMs: number,
  latestMs: number
): estypes.QueryDslQueryContainer => ({
  range: {
    [sourceTimeField]: {
      gte: earliestMs,
      lte: latestMs,
      format: 'epoch_millis',
    },
  },
});

const buildEntityWhereClauses = (
  entityFields: readonly EsqlEntityField[]
): { clauses: string[]; params: Array<Record<string, string>> } => {
  const clauses: string[] = [];
  const params: Array<Record<string, string>> = [];

  entityFields.forEach(({ fieldName, fieldValue }) => {
    const field = escapeEsqlIdentifier(fieldName);
    const value = fieldValue === null || fieldValue === undefined ? '' : String(fieldValue);
    if (value.length === 0) {
      // Match the DSL path: a blank entity value means an empty string or a missing field.
      clauses.push(`| WHERE (${field} IS NULL OR TO_STRING(${field}) == "")`);
      return;
    }
    const paramName = `ml_entity_${params.length}`;
    params.push({ [paramName]: value });
    clauses.push(`| WHERE TO_STRING(${field}) == ?${paramName}`);
  });

  return { clauses, params };
};

/**
 * Builds an ES|QL request that re-runs an ES|QL datafeed query for a time window, filters it to
 * the given entities and re-buckets the output to the chart interval.
 * Returns undefined when the metric function cannot be charted from the ES|QL output.
 */
export const buildEsqlMetricRequest = ({
  esqlQuery,
  sourceTimeField,
  timeField,
  entityFields,
  metricFunction,
  metricFieldName,
  earliestMs,
  latestMs,
  intervalMs,
}: EsqlMetricQueryOptions): EsqlRequest | undefined => {
  const metricExpression = getEsqlMetricExpression(metricFunction, metricFieldName);
  if (metricExpression === undefined) {
    return undefined;
  }

  const interval = getChartInterval(intervalMs);
  const rowLimit = Math.min(
    ESQL_MAX_CHART_BUCKETS,
    getEsqlChartBucketCount(earliestMs, latestMs, interval)
  );
  const { clauses, params } = buildEntityWhereClauses(entityFields);

  const query = [
    esqlQuery.trim(),
    ...clauses,
    `| STATS ${escapeEsqlIdentifier(
      ESQL_CHART_METRIC_COLUMN
    )} = ${metricExpression} BY ${escapeEsqlIdentifier(
      ESQL_CHART_TIME_COLUMN
    )} = BUCKET(${escapeEsqlIdentifier(timeField)}, ${interval} milliseconds)`,
    `| SORT ${escapeEsqlIdentifier(ESQL_CHART_TIME_COLUMN)}`,
    `| LIMIT ${Math.max(1, rowLimit)}`,
  ].join('\n');

  return {
    query,
    params,
    filter: buildSourceTimeFilter(sourceTimeField, earliestMs, latestMs),
  };
};

/** Name of the output column holding the cardinality of the field at the given index. */
export const getEsqlCardinalityColumn = (index: number): string =>
  `${ESQL_CARDINALITY_COLUMN_PREFIX}${index}`;

/**
 * Builds an ES|QL request that counts the distinct values of output columns of an ES|QL
 * datafeed query over a time window.
 */
export const buildEsqlCardinalityRequest = ({
  esqlQuery,
  sourceTimeField,
  fieldNames,
  earliestMs,
  latestMs,
}: EsqlCardinalityQueryOptions): EsqlRequest => {
  const aggregates = fieldNames
    .map(
      (fieldName, index) =>
        `${escapeEsqlIdentifier(
          getEsqlCardinalityColumn(index)
        )} = COUNT_DISTINCT(${escapeEsqlIdentifier(fieldName)})`
    )
    .join(', ');

  return {
    query: [esqlQuery.trim(), `| STATS ${aggregates}`, '| LIMIT 1'].join('\n'),
    params: [],
    filter: buildSourceTimeFilter(sourceTimeField, earliestMs, latestMs),
  };
};

/**
 * Converts ES|QL chart rows to the epoch-ms keyed results used by the source data charts.
 * Empty chart buckets are filled with 0 for count charts and null otherwise, matching the
 * date_histogram response with min_doc_count: 0.
 */
export const parseEsqlMetricResponse = (
  response: { columns: ReadonlyArray<{ name: string }>; values: ReadonlyArray<readonly unknown[]> },
  { metricFunction, metricFieldName, earliestMs, latestMs, intervalMs }: EsqlMetricQueryOptions
): Record<string, number | null> => {
  const timeIndex = response.columns.findIndex(({ name }) => name === ESQL_CHART_TIME_COLUMN);
  const metricIndex = response.columns.findIndex(({ name }) => name === ESQL_CHART_METRIC_COLUMN);
  const interval = getChartInterval(intervalMs);
  const isCount =
    metricFunction === ES_AGGREGATION.COUNT &&
    (metricFieldName === undefined || metricFieldName === '');
  const emptyValue = isCount ? 0 : null;

  const results: Record<string, number | null> = {};
  const firstBucket = getFirstChartBucket(earliestMs, interval);
  // Cap the gap filling so a very long range or tiny interval cannot block the event loop.
  const bucketCount = Math.min(
    ESQL_MAX_CHART_BUCKETS,
    getEsqlChartBucketCount(earliestMs, latestMs, interval)
  );
  for (let bucket = 0; bucket < bucketCount; bucket++) {
    results[firstBucket + bucket * interval] = emptyValue;
  }

  if (timeIndex === -1 || metricIndex === -1) {
    return results;
  }

  response.values.forEach((row) => {
    const rawTime = row[timeIndex];
    const time = typeof rawTime === 'number' ? rawTime : Date.parse(String(rawTime));
    if (Number.isNaN(time)) {
      return;
    }
    const rawValue = row[metricIndex];
    results[time] =
      typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : emptyValue;
  });

  return results;
};
