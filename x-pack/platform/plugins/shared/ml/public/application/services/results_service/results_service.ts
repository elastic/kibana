/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, get } from 'lodash';

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { aggregationTypeTransform } from '@kbn/ml-anomaly-utils';
import type { CriteriaField } from '@kbn/ml-common-types/results';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { IndicesOptions } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';

import type { MlApi } from '../ml_api_service';
import type { ResultResponse } from './result_service_rx';

export interface ScoresByBucketResults extends ResultResponse {
  cardinality: number;
  results: Record<string, Record<string, number>>;
}

export interface OverallBucketScoresResults extends ResultResponse {
  results: Record<string, number>;
}

export interface EventRateDataResults extends ResultResponse {
  total: number;
  results: Record<string, number>;
}

export interface RecordMaxScoreByTimeResults extends ResultResponse {
  results: Record<string, { score: number | undefined }>;
}

/**
 * Service for carrying out Elasticsearch queries to obtain data for the Ml Results dashboards.
 */
export function resultsServiceProvider(mlApi: MlApi, isMlCpsEnabled: boolean) {
  return {
    // Obtains the maximum bucket anomaly scores by job ID and time.
    // Pass an empty array or ['*'] to search over all job IDs.
    // Returned response contains a results property, with a key for job
    // which has results for the specified time range.
    // TODO: Remove once all occurencies are refactored to use the new API
    getScoresByBucket(
      jobIds: string[],
      earliestMs: number,
      latestMs: number,
      intervalMs: number,
      perPage = 10,
      fromPage = 1,
      swimLaneSeverity: Array<{ min: number; max?: number }> = [{ min: 0 }]
    ): Promise<ScoresByBucketResults> {
      return new Promise((resolve, reject) => {
        const obj: ScoresByBucketResults = {
          success: true,
          cardinality: 0,
          results: {},
        };

        // Build the criteria to use in the bool filter part of the request.
        // Adds criteria for the time range plus any specified job IDs.
        const boolCriteria: any[] = [
          {
            range: {
              timestamp: {
                gte: earliestMs,
                lte: latestMs,
                format: 'epoch_millis',
              },
            },
          },
        ];

        const thresholdCriteria = swimLaneSeverity.map((t) => ({
          range: {
            anomaly_score: {
              gte: t.min,
              ...(t.max !== undefined && { lte: t.max }),
            },
          },
        }));

        boolCriteria.push({
          bool: {
            should: thresholdCriteria,
            minimum_should_match: 1,
          },
        });

        if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
          let jobIdFilterStr = '';
          each(jobIds, (jobId, i) => {
            if (i > 0) {
              jobIdFilterStr += ' OR ';
            }
            jobIdFilterStr += 'job_id:';
            jobIdFilterStr += jobId;
          });
          boolCriteria.push({
            query_string: {
              analyze_wildcard: false,
              query: jobIdFilterStr,
            },
          });
        }

        mlApi.results
          .anomalySearch(
            {
              size: 0,
              query: {
                bool: {
                  filter: [
                    {
                      query_string: {
                        query: 'result_type:bucket',
                        analyze_wildcard: false,
                      },
                    },
                    {
                      bool: {
                        must: boolCriteria,
                      },
                    },
                  ],
                },
              },
              aggs: {
                jobsCardinality: {
                  cardinality: {
                    field: 'job_id',
                  },
                },
                jobId: {
                  terms: {
                    field: 'job_id',
                    size: jobIds?.length ?? 1,
                    order: {
                      anomalyScore: 'desc',
                    },
                  },
                  aggs: {
                    anomalyScore: {
                      max: {
                        field: 'anomaly_score',
                      },
                    },
                    bucketTruncate: {
                      bucket_sort: {
                        from: (fromPage - 1) * perPage,
                        size: perPage === 0 ? 1 : perPage,
                      },
                    },
                    byTime: {
                      date_histogram: {
                        field: 'timestamp',
                        fixed_interval: `${intervalMs}ms`,
                        min_doc_count: 1,
                        extended_bounds: {
                          min: earliestMs,
                          max: latestMs,
                        },
                      },
                      aggs: {
                        anomalyScore: {
                          max: {
                            field: 'anomaly_score',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            jobIds
          )
          .then((resp) => {
            const dataByJobId = get(resp, ['aggregations', 'jobId', 'buckets'], []);
            each(dataByJobId, (dataForJob: any) => {
              const jobId = dataForJob.key;

              const resultsForTime: Record<string, number> = {};

              const dataByTime = get(dataForJob, ['byTime', 'buckets'], []);
              each(dataByTime, (dataForTime: any) => {
                const value = get(dataForTime, ['anomalyScore', 'value']);
                if (value !== undefined) {
                  const time = dataForTime.key;
                  resultsForTime[time] = get(dataForTime, ['anomalyScore', 'value']);
                }
              });
              obj.results[jobId] = resultsForTime;
            });
            obj.cardinality = get(resp, ['aggregations', 'jobsCardinality', 'value'], 0);

            resolve(obj);
          })
          .catch((resp) => {
            reject(resp);
          });
      });
    },

    // Obtains the overall bucket scores for the specified job ID(s).
    // Pass ['*'] to search over all job IDs.
    // Returned response contains a results property as an object of max score by time.
    getOverallBucketScores(
      jobIds: string[],
      topN: number,
      earliestMs: number,
      latestMs: number,
      interval: string,
      overallScore?: number
    ): Promise<OverallBucketScoresResults> {
      return new Promise((resolve, reject) => {
        const obj: OverallBucketScoresResults = { success: true, results: {} };

        mlApi
          .overallBuckets({
            jobId: jobIds,
            topN,
            bucketSpan: interval,
            start: earliestMs,
            end: latestMs,
            overallScore,
          })
          .then((resp) => {
            const dataByTime = get(resp, ['overall_buckets'], []);
            each(dataByTime, (dataForTime: any) => {
              const value = get(dataForTime, ['overall_score']);
              if (value !== undefined) {
                obj.results[dataForTime.timestamp] = value;
              }
            });

            resolve(obj);
          })
          .catch((resp) => {
            reject(resp);
          });
      });
    },

    // Queries Elasticsearch to obtain event rate data i.e. the count
    // of documents over time.
    // index can be a String, or String[], of index names to search.
    // Extra query object can be supplied, or pass null if no additional query.
    // Returned response contains a results property, which is an object
    // of document counts against time (epoch millis).
    getEventRateData(
      index: string | string[],
      query: object | undefined,
      timeFieldName: string,
      earliestMs: number,
      latestMs: number,
      intervalMs: number,
      runtimeMappings?: RuntimeMappings,
      indicesOptions?: IndicesOptions,
      projectRouting?: string
    ): Promise<EventRateDataResults> {
      return new Promise((resolve, reject) => {
        const obj: EventRateDataResults = { success: true, total: 0, results: {} };

        // Build the criteria to use in the bool filter part of the request.
        // Add criteria for the time range, entity fields,
        // plus any additional supplied query.
        const mustCriteria: object[] = [
          {
            range: {
              [timeFieldName]: {
                gte: earliestMs,
                lte: latestMs,
                format: 'epoch_millis',
              },
            },
          },
        ];

        if (query) {
          mustCriteria.push(query);
        }

        mlApi
          .esSearch({
            index,
            size: 0,
            body: {
              query: {
                bool: {
                  must: mustCriteria,
                },
              },
              _source: {
                excludes: [],
              },
              aggs: {
                eventRate: {
                  date_histogram: {
                    field: timeFieldName,
                    fixed_interval: `${intervalMs}ms`,
                    min_doc_count: 0,
                    extended_bounds: {
                      min: earliestMs,
                      max: latestMs,
                    },
                  },
                },
              },
              // Runtime fields only needed to support when query includes a runtime field
              // even though the default timeField can be a search time runtime field
              // because currently Kibana doesn't support that
              ...(isPopulatedObject(runtimeMappings) && query
                ? { runtime_mappings: runtimeMappings }
                : {}),
            },
            ...(indicesOptions ?? {}),
            ...(isMlCpsEnabled && projectRouting ? { project_routing: projectRouting } : {}),
          })
          .then((resp: any) => {
            const dataByTimeBucket = get(resp, ['aggregations', 'eventRate', 'buckets'], []);
            each(dataByTimeBucket, (dataForTime: any) => {
              const time = dataForTime.key;
              obj.results[time] = dataForTime.doc_count;
            });
            obj.total = resp.hits.total.value;

            resolve(obj);
          })
          .catch((resp) => {
            reject(resp);
          });
      });
    },

    // Queries Elasticsearch to obtain the max record score over time for the specified job,
    // criteria, time range, and aggregation interval.
    // criteriaFields parameter must be an array, with each object in the array having 'fieldName'
    // 'fieldValue' properties.
    getRecordMaxScoreByTime(
      jobId: string,
      criteriaFields: CriteriaField[],
      earliestMs: number,
      latestMs: number,
      intervalMs: number,
      actualPlotFunctionIfMetric?: string
    ): Promise<RecordMaxScoreByTimeResults> {
      return new Promise((resolve, reject) => {
        const obj: RecordMaxScoreByTimeResults = {
          success: true,
          results: {},
        };

        // Build the criteria to use in the bool filter part of the request.
        const mustCriteria: object[] = [
          {
            range: {
              timestamp: {
                gte: earliestMs,
                lte: latestMs,
                format: 'epoch_millis',
              },
            },
          },
          { term: { job_id: jobId } },
        ];

        each(criteriaFields, (criteria) => {
          mustCriteria.push({
            term: {
              [criteria.fieldName]: criteria.fieldValue,
            },
          });
        });
        if (actualPlotFunctionIfMetric !== undefined) {
          const mlFunctionToPlotIfMetric =
            actualPlotFunctionIfMetric !== undefined
              ? aggregationTypeTransform.toML(actualPlotFunctionIfMetric)
              : actualPlotFunctionIfMetric;

          mustCriteria.push({
            term: {
              function_description: mlFunctionToPlotIfMetric,
            },
          });
        }
        mlApi.results
          .anomalySearch(
            {
              size: 0,
              query: {
                bool: {
                  filter: [
                    {
                      query_string: {
                        query: 'result_type:record',
                        analyze_wildcard: true,
                      },
                    },
                    {
                      bool: {
                        must: mustCriteria,
                      },
                    },
                  ],
                },
              },
              aggs: {
                times: {
                  date_histogram: {
                    field: 'timestamp',
                    fixed_interval: `${intervalMs}ms`,
                    min_doc_count: 1,
                  },
                  aggs: {
                    recordScore: {
                      max: {
                        field: 'record_score',
                      },
                    },
                  },
                },
              },
            },
            [jobId]
          )
          .then((resp) => {
            const aggregationsByTime = get(resp, ['aggregations', 'times', 'buckets'], []);
            each(aggregationsByTime, (dataForTime: any) => {
              const time = dataForTime.key;
              obj.results[time] = {
                score: get(dataForTime, ['recordScore', 'value']),
              };
            });

            resolve(obj);
          })
          .catch((resp) => {
            reject(resp);
          });
      });
    },
  };
}
