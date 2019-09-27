/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

const ML_ANOMALY_INDEX_PREFIX = '.ml-anomalies-';

export const createLogEntryRateQuery = (
  logRateJobId: string,
  startTime: number,
  endTime: number,
  bucketDuration: number,
  size: number
) => ({
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
          size,
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

export const logRateModelPlotResponseRT = rt.type({
  aggregations: rt.type({
    timestamp_data_set_buckets: rt.intersection([
      rt.type({
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
      rt.partial({
        after_key: compositeTimestampDataSetKeyRT,
      }),
    ]),
  }),
});
