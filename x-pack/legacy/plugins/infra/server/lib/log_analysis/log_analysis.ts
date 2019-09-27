/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { getJobId } from '../../../common/log_analysis';
import { throwErrors, createPlainError } from '../../../common/runtime_types';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../adapters/framework';
import { NoLogRateResultsIndexError } from './errors';
import { logRateModelPlotResponseRT, createLogEntryRateQuery } from './queries';

const COMPOSITE_AGGREGATION_BATCH_SIZE = 1000;

export class InfraLogAnalysis {
  constructor(
    private readonly libs: {
      framework: InfraBackendFrameworkAdapter;
    }
  ) {}

  public getJobIds(request: InfraFrameworkRequest, sourceId: string) {
    return {
      logEntryRate: getJobId(this.libs.framework.getSpaceId(request), sourceId, 'log-entry-rate'),
    };
  }

  public async getLogEntryRateBuckets(
    request: InfraFrameworkRequest,
    sourceId: string,
    startTime: number,
    endTime: number,
    bucketDuration: number
  ) {
    const logRateJobId = this.getJobIds(request, sourceId).logEntryRate;

    // TODO: fetch all batches
    const mlModelPlotResponse = await this.libs.framework.callWithRequest(
      request,
      'search',
      createLogEntryRateQuery(
        logRateJobId,
        startTime,
        endTime,
        bucketDuration,
        COMPOSITE_AGGREGATION_BATCH_SIZE
      )
    );

    if (mlModelPlotResponse._shards.total === 0) {
      throw new NoLogRateResultsIndexError(
        `Failed to find ml result index for job ${logRateJobId}.`
      );
    }

    const mlModelPlotBuckets = pipe(
      logRateModelPlotResponseRT.decode(mlModelPlotResponse),
      map(response => response.aggregations.timestamp_data_set_buckets.buckets),
      fold(throwErrors(createPlainError), identity)
    );

    return mlModelPlotBuckets.reduce<
      Array<{
        dataSets: Array<{
          analysisBucketCount: number;
          anomalies: Array<{
            actualLogEntryRate: number;
            anomalyScore: number;
            duration: number;
            startTime: number;
            typicalLogEntryRate: number;
          }>;
          averageActualLogEntryRate: number;
          dataSetId: string;
        }>;
        startTime: number;
      }>
    >((histogramBuckets, timestampDataSetBucket) => {
      const previousHistogramBucket = histogramBuckets[histogramBuckets.length - 1];
      const dataSet = {
        analysisBucketCount: timestampDataSetBucket.filter_model_plot.doc_count,
        anomalies: timestampDataSetBucket.filter_records.top_hits_record.hits.hits.map(
          ({ _source: record }) => ({
            actualLogEntryRate: record.actual[0],
            anomalyScore: record.record_score,
            duration: record.bucket_span * 1000,
            startTime: record.timestamp,
            typicalLogEntryRate: record.typical[0],
          })
        ),
        averageActualLogEntryRate: timestampDataSetBucket.filter_model_plot.average_actual.value,
        dataSetId: timestampDataSetBucket.key.data_set,
      };
      if (
        previousHistogramBucket &&
        previousHistogramBucket.startTime === timestampDataSetBucket.key.timestamp
      ) {
        return [
          ...histogramBuckets.slice(0, -1),
          {
            ...previousHistogramBucket,
            dataSets: [...previousHistogramBucket.dataSets, dataSet],
          },
        ];
      } else {
        return [
          ...histogramBuckets,
          {
            dataSets: [dataSet],
            startTime: timestampDataSetBucket.key.timestamp,
          },
        ];
      }
    }, []);
  }
}
