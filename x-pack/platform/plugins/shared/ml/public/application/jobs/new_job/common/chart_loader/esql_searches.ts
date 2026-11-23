/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLResults } from '@kbn/esql-utils';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import { ES_AGGREGATION, EVENT_RATE_FIELD_ID } from '@kbn/ml-anomaly-utils';
import {
  escapeEsqlIdentifier,
  buildEsqlMetricRequest,
  buildEsqlTopValuesRequest,
  parseEsqlMetricResponse,
  parseEsqlTopValuesResponse,
  type EsqlEntityField,
  type EsqlRequest,
} from '../../../../../../common/util/esql_metric_query';

export type EsqlSearch = DataPublicPluginStart['search']['search'];

export interface EsqlChartSource {
  readonly search: EsqlSearch;
  readonly esqlQuery: string;
  readonly timeField: string;
  readonly projectRouting?: string;
  /** Column holding each row's document count when the query aggregates with STATS. */
  readonly summaryCountField?: string | null;
}

export interface EsqlChartMetric {
  readonly agg: string;
  readonly field: string | null;
}

export interface EsqlChartPoint {
  time: number;
  value: number;
}

const runEsqlRequest = async (
  { search, projectRouting }: EsqlChartSource,
  { query, params = [] }: Pick<EsqlRequest, 'query'> & Partial<EsqlRequest>,
  timeRange?: { from: string; to: string }
) => {
  const variables: ESQLControlVariable[] = params.flatMap((param) =>
    Object.entries(param).map(([key, value]) => ({ key, value, type: ESQLVariableType.VALUES }))
  );
  const { response } = await getESQLResults({
    esqlQuery: query,
    search,
    variables,
    timeRange,
    projectRouting,
  });
  return response;
};

/**
 * Runs the ES|QL query re-bucketed to the chart interval, returning one series per metric.
 * Metrics that cannot be expressed in ES|QL return an empty series.
 */
export const loadEsqlLineCharts = async (
  source: EsqlChartSource,
  start: number,
  end: number,
  intervalMs: number,
  metrics: readonly EsqlChartMetric[],
  splitFieldName: string | null,
  splitFieldValue: string | null
): Promise<Record<number, EsqlChartPoint[]>> => {
  const entityFields: EsqlEntityField[] =
    splitFieldName !== null && splitFieldValue !== null
      ? [{ fieldName: splitFieldName, fieldValue: splitFieldValue }]
      : [];

  const timeField = escapeEsqlIdentifier(source.timeField);
  const timeRange = { from: new Date(start).toISOString(), to: new Date(end).toISOString() };

  const series = await Promise.all(
    metrics.map(async ({ agg, field }) => {
      const metricFieldName = field === null || field === EVENT_RATE_FIELD_ID ? undefined : field;
      // each row of an aggregated query stands for many documents, so count by summing its count column
      const sumDocCounts =
        agg === ES_AGGREGATION.COUNT &&
        metricFieldName === undefined &&
        typeof source.summaryCountField === 'string';
      const options = {
        // filter on the query's output time column, which might not exist in the source indices
        esqlQuery: `${source.esqlQuery.trim()}\n| WHERE ${timeField} >= ?_tstart AND ${timeField} <= ?_tend`,
        sourceTimeField: source.timeField,
        timeField: source.timeField,
        entityFields,
        metricFunction: sumDocCounts ? ES_AGGREGATION.SUM : agg,
        metricFieldName: sumDocCounts ? source.summaryCountField ?? undefined : metricFieldName,
        earliestMs: start,
        latestMs: end,
        intervalMs,
      };
      const request = buildEsqlMetricRequest(options);
      if (request === undefined) {
        return [];
      }
      const response = await runEsqlRequest(source, request, timeRange);
      return Object.entries(parseEsqlMetricResponse(response, options)).map(([time, value]) => ({
        time: Number(time),
        // an empty bucket has no documents, so show 0 rather than a gap, as for COUNT(*)
        value: (sumDocCounts && value === null ? 0 : value) as number,
      }));
    })
  );

  return series.reduce<Record<number, EsqlChartPoint[]>>((acc, points, index) => {
    acc[index] = points;
    return acc;
  }, {});
};

/** Runs the ES|QL query and counts its output rows in each chart interval. */
export const loadEsqlEventRate = async (
  source: EsqlChartSource,
  start: number,
  end: number,
  intervalMs: number
): Promise<EsqlChartPoint[]> => {
  const { 0: points = [] } = await loadEsqlLineCharts(
    source,
    start,
    end,
    intervalMs,
    [{ agg: ES_AGGREGATION.COUNT, field: null }],
    null,
    null
  );
  return points;
};

/** Returns the most frequent values of an output column of the ES|QL query. */
export const loadEsqlFieldValues = async (
  source: EsqlChartSource,
  fieldName: string,
  size: number
): Promise<string[]> => {
  const request = buildEsqlTopValuesRequest({ esqlQuery: source.esqlQuery, fieldName, size });
  const response = await runEsqlRequest(source, request);
  return parseEsqlTopValuesResponse(response, fieldName);
};
