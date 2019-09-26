/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { getJobId } from '../../../common/log_analysis';
import { throwErrors, createPlainError } from '../../../common/runtime_types';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../adapters/framework';
import { NoLogRateResultsIndexError } from './errors';

const ML_ANOMALY_INDEX_PREFIX = '.ml-anomalies-';
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
    const mlModelPlotResponse = await this.libs.framework.callWithRequest(request, 'search', {
      allowNoIndices: true,
      body: {
        query: {
          bool: {
            filter: [
              {
                range: {
                  timestamp: {
                    gte: startTime,
                    lt: endTime,
                  },
                },
              },
              {
                terms: {
                  result_type: ['model_plot', 'record'],
                },
              },
              {
                term: {
                  detector_index: {
                    value: 0,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          timestamp_data_set_buckets: {
            composite: {
              size: COMPOSITE_AGGREGATION_BATCH_SIZE,
              sources: [
                {
                  timestamp: {
                    date_histogram: {
                      field: 'timestamp',
                      fixed_interval: `${bucketDuration}ms`,
                      order: 'asc',
                    },
                  },
                },
                {
                  data_set: {
                    terms: {
                      field: 'partition_field_value',
                      order: 'asc',
                    },
                  },
                },
              ],
            },
            aggs: {
              filter_model_plot: {
                filter: {
                  term: {
                    result_type: 'model_plot',
                  },
                },
                aggs: {
                  average_actual: {
                    avg: {
                      field: 'actual',
                    },
                  },
                },
              },
              filter_records: {
                filter: {
                  term: {
                    result_type: 'record',
                  },
                },
                aggs: {
                  top_hits_record: {
                    top_hits: {
                      _source: Object.keys(logRateMlRecordRT.props),
                      size: 100,
                      sort: [
                        {
                          timestamp: 'asc',
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
      ignoreUnavailable: true,
      index: `${ML_ANOMALY_INDEX_PREFIX}${logRateJobId}`,
      size: 0,
      trackScores: false,
      trackTotalHits: false,
    });

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

const logRateMlRecordRT = rt.type({
  actual: rt.array(rt.number),
  bucket_span: rt.number,
  record_score: rt.number,
  timestamp: rt.number,
  typical: rt.array(rt.number),
});

const metricAggregationRT = rt.type({
  value: rt.number,
});

const compositeTimestampDataSetKeyRT = rt.type({
  data_set: rt.string,
  timestamp: rt.number,
});

const logRateModelPlotResponseRT = rt.type({
  aggregations: rt.type({
    timestamp_data_set_buckets: rt.type({
      after_key: compositeTimestampDataSetKeyRT,
      buckets: rt.array(
        rt.type({
          key: compositeTimestampDataSetKeyRT,
          filter_records: rt.type({
            doc_count: rt.number,
            top_hits_record: rt.type({
              hits: rt.type({
                hits: rt.array(
                  rt.type({
                    _source: logRateMlRecordRT,
                  })
                ),
              }),
            }),
          }),
          filter_model_plot: rt.type({
            doc_count: rt.number,
            average_actual: metricAggregationRT,
          }),
        })
      ),
    }),
  }),
});
