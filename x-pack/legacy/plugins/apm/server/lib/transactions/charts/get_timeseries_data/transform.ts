/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber, round, sortBy } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { Coordinate } from '../../../../../typings/timeseries';
import { ESResponse } from './fetcher';

export type ApmTimeSeriesResponse = ReturnType<typeof timeseriesTransformer>;

export function timeseriesTransformer({
  timeseriesResponse,
  bucketSize
}: {
  timeseriesResponse: ESResponse;
  bucketSize: number;
}) {
  const aggs = timeseriesResponse.aggregations;
  const overallAvgDuration = aggs?.overall_avg_duration.value || null;
  const responseTimeBuckets = aggs?.response_times.buckets || [];
  const { avg, p95, p99 } = getResponseTime(responseTimeBuckets);
  const transactionResultBuckets = aggs?.transaction_results.buckets || [];
  const tpmBuckets = getTpmBuckets(transactionResultBuckets, bucketSize);

  return {
    responseTimes: {
      avg,
      p95,
      p99
    },
    tpmBuckets,
    overallAvgDuration
  };
}

export function getTpmBuckets(
  transactionResultBuckets: Required<
    ESResponse
  >['aggregations']['transaction_results']['buckets'] = [],
  bucketSize: number
) {
  const buckets = transactionResultBuckets.map(
    ({ key: resultKey, timeseries }) => {
      const dataPoints = timeseries.buckets.map(bucket => {
        return {
          x: bucket.key,
          y: round(bucket.doc_count * (60 / bucketSize), 1)
        };
      });

      // Handle empty string result keys
      const key =
        resultKey === '' ? NOT_AVAILABLE_LABEL : (resultKey as string);

      return { key, dataPoints };
    }
  );

  return sortBy(
    buckets,
    bucket => bucket.key.toString().replace(/^HTTP (\d)xx$/, '00$1') // ensure that HTTP 3xx are sorted at the top
  );
}

function getResponseTime(
  responseTimeBuckets: Required<
    ESResponse
  >['aggregations']['response_times']['buckets'] = []
) {
  return responseTimeBuckets.reduce(
    (acc, bucket) => {
      const { '95.0': p95, '99.0': p99 } = bucket.pct.values;

      acc.avg.push({ x: bucket.key, y: bucket.avg.value });
      acc.p95.push({ x: bucket.key, y: isNumber(p95) ? p95 : null });
      acc.p99.push({ x: bucket.key, y: isNumber(p99) ? p99 : null });
      return acc;
    },
    {
      avg: [] as Coordinate[],
      p95: [] as Coordinate[],
      p99: [] as Coordinate[]
    }
  );
}
