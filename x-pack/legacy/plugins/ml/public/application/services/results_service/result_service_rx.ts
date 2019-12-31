/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Queries Elasticsearch to obtain metric aggregation results.
// index can be a String, or String[], of index names to search.
// entityFields parameter must be an array, with each object in the array having 'fieldName'
//  and 'fieldValue' properties.
// Extra query object can be supplied, or pass null if no additional query
// to that built from the supplied entity fields.
// Returned response contains a results property containing the requested aggregation.
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import _ from 'lodash';
import { ML_MEDIAN_PERCENTS } from '../../../../common/util/job_utils';
import { ml } from '../ml_api_service';
import { ML_RESULTS_INDEX_PATTERN } from '../../../../common/constants/index_patterns';
import { CriteriaField } from './index';

interface ResultResponse {
  success: boolean;
}

export interface MetricData extends ResultResponse {
  results: Record<string, any>;
}

export function getMetricData(
  index: string,
  entityFields: any[],
  query: object | undefined,
  metricFunction: string, // ES aggregation name
  metricFieldName: string,
  timeFieldName: string,
  earliestMs: number,
  latestMs: number,
  interval: string
): Observable<MetricData> {
  // Build the criteria to use in the bool filter part of the request.
  // Add criteria for the time range, entity fields,
  // plus any additional supplied query.
  const shouldCriteria: object[] = [];
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
    ...(query ? [query] : []),
  ];

  entityFields.forEach(entity => {
    if (entity.fieldValue.length !== 0) {
      mustCriteria.push({
        term: {
          [entity.fieldName]: entity.fieldValue,
        },
      });
    } else {
      // Add special handling for blank entity field values, checking for either
      // an empty string or the field not existing.
      shouldCriteria.push({
        bool: {
          must: [
            {
              term: {
                [entity.fieldName]: '',
              },
            },
          ],
        },
      });
      shouldCriteria.push({
        bool: {
          must_not: [
            {
              exists: { field: entity.fieldName },
            },
          ],
        },
      });
    }
  });

  const body: any = {
    query: {
      bool: {
        must: mustCriteria,
      },
    },
    size: 0,
    _source: {
      excludes: [],
    },
    aggs: {
      byTime: {
        date_histogram: {
          field: timeFieldName,
          interval,
          min_doc_count: 0,
        },
      },
    },
  };

  if (shouldCriteria.length > 0) {
    body.query.bool.should = shouldCriteria;
    body.query.bool.minimum_should_match = shouldCriteria.length / 2;
  }

  if (metricFieldName !== undefined && metricFieldName !== '') {
    body.aggs.byTime.aggs = {};

    const metricAgg: any = {
      [metricFunction]: {
        field: metricFieldName,
      },
    };

    if (metricFunction === 'percentiles') {
      metricAgg[metricFunction].percents = [ML_MEDIAN_PERCENTS];
    }
    body.aggs.byTime.aggs.metric = metricAgg;
  }

  return ml.esSearch$({ index, body }).pipe(
    map((resp: any) => {
      const obj: MetricData = { success: true, results: {} };
      const dataByTime = resp?.aggregations?.byTime?.buckets ?? [];
      dataByTime.forEach((dataForTime: any) => {
        if (metricFunction === 'count') {
          obj.results[dataForTime.key] = dataForTime.doc_count;
        } else {
          const value = dataForTime?.metric?.value;
          const values = dataForTime?.metric?.values;
          if (dataForTime.doc_count === 0) {
            obj.results[dataForTime.key] = null;
          } else if (value !== undefined) {
            obj.results[dataForTime.key] = value;
          } else if (values !== undefined) {
            // Percentiles agg currently returns NaN rather than null when none of the docs in the
            // bucket contain the field used in the aggregation
            // (see elasticsearch issue https://github.com/elastic/elasticsearch/issues/29066).
            // Store as null, so values can be handled in the same manner downstream as other aggs
            // (min, mean, max) which return null.
            const medianValues = values[ML_MEDIAN_PERCENTS];
            obj.results[dataForTime.key] = !isNaN(medianValues) ? medianValues : null;
          } else {
            obj.results[dataForTime.key] = null;
          }
        }
      });

      return obj;
    })
  );
}

export interface ModelPlotOutput extends ResultResponse {
  results: Record<string, any>;
}

export function getModelPlotOutput(
  jobId: string,
  detectorIndex: number,
  criteriaFields: any[],
  earliestMs: number,
  latestMs: number,
  interval: string,
  aggType?: { min: any; max: any }
): Observable<ModelPlotOutput> {
  const obj: ModelPlotOutput = {
    success: true,
    results: {},
  };

  // if an aggType object has been passed in, use it.
  // otherwise default to min and max aggs for the upper and lower bounds
  const modelAggs =
    aggType === undefined
      ? { max: 'max', min: 'min' }
      : {
          max: aggType.max,
          min: aggType.min,
        };

  // Build the criteria to use in the bool filter part of the request.
  // Add criteria for the job ID and time range.
  const mustCriteria: object[] = [
    {
      term: { job_id: jobId },
    },
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

  // Add in term queries for each of the specified criteria.
  _.each(criteriaFields, criteria => {
    mustCriteria.push({
      term: {
        [criteria.fieldName]: criteria.fieldValue,
      },
    });
  });

  // Add criteria for the detector index. Results from jobs created before 6.1 will not
  // contain a detector_index field, so use a should criteria with a 'not exists' check.
  const shouldCriteria = [
    {
      term: { detector_index: detectorIndex },
    },
    {
      bool: {
        must_not: [
          {
            exists: { field: 'detector_index' },
          },
        ],
      },
    },
  ];

  return ml
    .esSearch$({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: 'result_type:model_plot',
                  analyze_wildcard: true,
                },
              },
              {
                bool: {
                  must: mustCriteria,
                  should: shouldCriteria,
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        aggs: {
          times: {
            date_histogram: {
              field: 'timestamp',
              interval,
              min_doc_count: 0,
            },
            aggs: {
              actual: {
                avg: {
                  field: 'actual',
                },
              },
              modelUpper: {
                [modelAggs.max]: {
                  field: 'model_upper',
                },
              },
              modelLower: {
                [modelAggs.min]: {
                  field: 'model_lower',
                },
              },
            },
          },
        },
      },
    })
    .pipe(
      map(resp => {
        const aggregationsByTime = _.get(resp, ['aggregations', 'times', 'buckets'], []);
        _.each(aggregationsByTime, (dataForTime: any) => {
          const time = dataForTime.key;
          const modelUpper: number | undefined = _.get(dataForTime, ['modelUpper', 'value']);
          const modelLower: number | undefined = _.get(dataForTime, ['modelLower', 'value']);
          const actual = _.get(dataForTime, ['actual', 'value']);

          obj.results[time] = {
            actual,
            modelUpper:
              modelUpper === undefined || isFinite(modelUpper) === false ? null : modelUpper,
            modelLower:
              modelLower === undefined || isFinite(modelLower) === false ? null : modelLower,
          };
        });

        return obj;
      })
    );
}

export interface RecordsForCriteria extends ResultResponse {
  records: any[];
}

// Queries Elasticsearch to obtain the record level results matching the given criteria,
// for the specified job(s), time range, and record score threshold.
// criteriaFields parameter must be an array, with each object in the array having 'fieldName'
// 'fieldValue' properties.
// Pass an empty array or ['*'] to search over all job IDs.
export function getRecordsForCriteria(
  jobIds: string[] | undefined,
  criteriaFields: CriteriaField[],
  threshold: any,
  earliestMs: number,
  latestMs: number,
  maxResults: number | undefined
): Observable<RecordsForCriteria> {
  const obj: RecordsForCriteria = { success: true, records: [] };

  // Build the criteria to use in the bool filter part of the request.
  // Add criteria for the time range, record score, plus any specified job IDs.
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
    {
      range: {
        record_score: {
          gte: threshold,
        },
      },
    },
  ];

  if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
    let jobIdFilterStr = '';
    _.each(jobIds, (jobId, i) => {
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

  // Add in term queries for each of the specified criteria.
  _.each(criteriaFields, criteria => {
    boolCriteria.push({
      term: {
        [criteria.fieldName]: criteria.fieldValue,
      },
    });
  });

  return ml
    .esSearch$({
      index: ML_RESULTS_INDEX_PATTERN,
      rest_total_hits_as_int: true,
      size: maxResults !== undefined ? maxResults : 100,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: 'result_type:record',
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
        sort: [{ record_score: { order: 'desc' } }],
      },
    })
    .pipe(
      map(resp => {
        if (resp.hits.total !== 0) {
          _.each(resp.hits.hits, (hit: any) => {
            obj.records.push(hit._source);
          });
        }
        return obj;
      })
    );
}

export interface ScheduledEventsByBucket extends ResultResponse {
  events: Record<string, any>;
}

// Obtains a list of scheduled events by job ID and time.
// Pass an empty array or ['*'] to search over all job IDs.
// Returned response contains a events property, which will only
// contains keys for jobs which have scheduled events for the specified time range.
export function getScheduledEventsByBucket(
  jobIds: string[] | undefined,
  earliestMs: number,
  latestMs: number,
  interval: string,
  maxJobs: number,
  maxEvents: number
): Observable<ScheduledEventsByBucket> {
  const obj: ScheduledEventsByBucket = {
    success: true,
    events: {},
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
    {
      exists: { field: 'scheduled_events' },
    },
  ];

  if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
    let jobIdFilterStr = '';
    _.each(jobIds, (jobId, i) => {
      jobIdFilterStr += `${i > 0 ? ' OR ' : ''}job_id:${jobId}`;
    });
    boolCriteria.push({
      query_string: {
        analyze_wildcard: false,
        query: jobIdFilterStr,
      },
    });
  }

  return ml
    .esSearch$({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
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
          jobs: {
            terms: {
              field: 'job_id',
              min_doc_count: 1,
              size: maxJobs,
            },
            aggs: {
              times: {
                date_histogram: {
                  field: 'timestamp',
                  interval,
                  min_doc_count: 1,
                },
                aggs: {
                  events: {
                    terms: {
                      field: 'scheduled_events',
                      size: maxEvents,
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
    .pipe(
      map(resp => {
        const dataByJobId = _.get(resp, ['aggregations', 'jobs', 'buckets'], []);
        _.each(dataByJobId, (dataForJob: any) => {
          const jobId: string = dataForJob.key;
          const resultsForTime: Record<string, any> = {};
          const dataByTime = _.get(dataForJob, ['times', 'buckets'], []);
          _.each(dataByTime, (dataForTime: any) => {
            const time: string = dataForTime.key;
            const events: object[] = _.get(dataForTime, ['events', 'buckets']);
            resultsForTime[time] = _.map(events, 'key');
          });
          obj.events[jobId] = resultsForTime;
        });

        return obj;
      })
    );
}

export function fetchPartitionFieldsValues(
  searchTerm: Record<string, string>,
  criteriaFields: Array<{ fieldName: string; fieldValue: any }>,
  earliestMs: number,
  latestMs: number
) {
  return ml.results.fetchPartitionFieldsValues(searchTerm, criteriaFields, earliestMs, latestMs);
}
