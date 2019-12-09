/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// Service for carrying out requests to run ML forecasts and to obtain
// data on forecasts that have been performed.
import _ from 'lodash';
import { map } from 'rxjs/operators';

import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import { ml } from './ml_api_service';

// Gets a basic summary of the most recently run forecasts for the specified
// job, with results at or later than the supplied timestamp.
// Extra query object can be supplied, or pass null if no additional query.
// Returned response contains a forecasts property, which is an array of objects
// containing id, earliest and latest keys.
function getForecastsSummary(
  job,
  query,
  earliestMs,
  maxResults
) {
  return new Promise((resolve, reject) => {
    const obj = {
      success: true,
      forecasts: []
    };

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the job ID, result type and earliest time, plus
    // the additional query if supplied.
    const filterCriteria = [
      {
        term: { result_type: 'model_forecast_request_stats' }
      },
      {
        term: { job_id: job.job_id }
      },
      {
        range: {
          timestamp: {
            gte: earliestMs,
            format: 'epoch_millis'
          }
        }
      }
    ];

    if (query) {
      filterCriteria.push(query);
    }

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: maxResults,
      rest_total_hits_as_int: true,
      body: {
        query: {
          bool: {
            filter: filterCriteria
          }
        },
        sort: [
          { forecast_create_timestamp: { 'order': 'desc' } }
        ]
      }
    })
      .then((resp) => {
        if (resp.hits.total !== 0) {
          obj.forecasts = resp.hits.hits.map(hit => hit._source);
        }

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

// Obtains the earliest and latest timestamps for the forecast data from
// the forecast with the specified ID.
// Returned response contains earliest and latest properties which are the
// timestamps of the first and last model_forecast results.
function getForecastDateRange(job, forecastId) {

  return new Promise((resolve, reject) => {
    const obj = {
      success: true,
      earliest: null,
      latest: null
    };

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the job ID, forecast ID, result type and time range.
    const filterCriteria = [{
      query_string: {
        query: 'result_type:model_forecast',
        analyze_wildcard: true
      }
    },
    {
      term: { job_id: job.job_id }
    },
    {
      term: { forecast_id: forecastId }
    }];

    // TODO - add in criteria for detector index and entity fields (by, over, partition)
    // once forecasting with these parameters is supported.

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: filterCriteria
          }
        },
        aggs: {
          earliest: {
            min: {
              field: 'timestamp'
            }
          },
          latest: {
            max: {
              field: 'timestamp'
            }
          }
        }
      }
    })
      .then((resp) => {
        obj.earliest = _.get(resp, 'aggregations.earliest.value', null);
        obj.latest = _.get(resp, 'aggregations.latest.value', null);
        if (obj.earliest ===  null || obj.latest === null) {
          reject(resp);
        } else {
          resolve(obj);
        }
      })
      .catch((resp) => {
        reject(resp);
      });

  });
}

// Obtains the requested forecast model data for the forecast with the specified ID.
function getForecastData(
  job,
  detectorIndex,
  forecastId,
  entityFields,
  earliestMs,
  latestMs,
  interval,
  aggType) {
  // Extract the partition, by, over fields on which to filter.
  const criteriaFields = [];
  const detector = job.analysis_config.detectors[detectorIndex];
  if (_.has(detector, 'partition_field_name')) {
    const partitionEntity = _.find(entityFields, { 'fieldName': detector.partition_field_name });
    if (partitionEntity !== undefined) {
      criteriaFields.push(
        { fieldName: 'partition_field_name', fieldValue: partitionEntity.fieldName },
        { fieldName: 'partition_field_value', fieldValue: partitionEntity.fieldValue });
    }
  }

  if (_.has(detector, 'over_field_name')) {
    const overEntity = _.find(entityFields, { 'fieldName': detector.over_field_name });
    if (overEntity !== undefined) {
      criteriaFields.push(
        { fieldName: 'over_field_name', fieldValue: overEntity.fieldName },
        { fieldName: 'over_field_value', fieldValue: overEntity.fieldValue });
    }
  }

  if (_.has(detector, 'by_field_name')) {
    const byEntity = _.find(entityFields, { 'fieldName': detector.by_field_name });
    if (byEntity !== undefined) {
      criteriaFields.push(
        { fieldName: 'by_field_name', fieldValue: byEntity.fieldName },
        { fieldName: 'by_field_value', fieldValue: byEntity.fieldValue });
    }
  }

  const obj = {
    success: true,
    results: {}
  };

  // Build the criteria to use in the bool filter part of the request.
  // Add criteria for the job ID, forecast ID, detector index, result type and time range.
  const filterCriteria = [{
    query_string: {
      query: 'result_type:model_forecast',
      analyze_wildcard: true
    }
  },
  {
    term: { job_id: job.job_id }
  },
  {
    term: { forecast_id: forecastId }
  },
  {
    term: { detector_index: detectorIndex }
  },
  {
    range: {
      timestamp: {
        gte: earliestMs,
        lte: latestMs,
        format: 'epoch_millis'
      }
    }
  }];


  // Add in term queries for each of the specified criteria.
  _.each(criteriaFields, (criteria) => {
    filterCriteria.push({
      term: {
        [criteria.fieldName]: criteria.fieldValue
      }
    });
  });



  // If an aggType object has been passed in, use it.
  // Otherwise default to avg, min and max aggs for the
  // forecast prediction, upper and lower
  const forecastAggs = (aggType === undefined) ?
    { avg: 'avg', max: 'max', min: 'min' } :
    {
      avg: aggType.avg,
      max: aggType.max,
      min: aggType.min
    };

  return ml.esSearch$({
    index: ML_RESULTS_INDEX_PATTERN,
    size: 0,
    body: {
      query: {
        bool: {
          filter: filterCriteria
        }
      },
      aggs: {
        times: {
          date_histogram: {
            field: 'timestamp',
            interval: interval,
            min_doc_count: 1
          },
          aggs: {
            prediction: {
              [forecastAggs.avg]: {
                field: 'forecast_prediction'
              }
            },
            forecastUpper: {
              [forecastAggs.max]: {
                field: 'forecast_upper'
              }
            },
            forecastLower: {
              [forecastAggs.min]: {
                field: 'forecast_lower'
              }
            }
          }
        }
      }
    }
  }).pipe(
    map(resp => {
      const aggregationsByTime = _.get(resp, ['aggregations', 'times', 'buckets'], []);
      _.each(aggregationsByTime, (dataForTime) => {
        const time = dataForTime.key;
        obj.results[time] = {
          prediction: _.get(dataForTime, ['prediction', 'value']),
          forecastUpper: _.get(dataForTime, ['forecastUpper', 'value']),
          forecastLower: _.get(dataForTime, ['forecastLower', 'value'])
        };
      });

      return obj;
    })
  );
}

// Runs a forecast
function runForecast(jobId, duration) {
  console.log('ML forecast service run forecast with duration:', duration);
  return new Promise((resolve, reject) => {

    ml.forecast({
      jobId,
      duration
    })
      .then((resp) => {
        resolve(resp);
      }).catch((err) => {
        reject(err);
      });
  });
}

// Gets stats for a forecast that has been run on the specified job.
// Returned response contains a stats property, including
// forecast_progress (a value from 0 to 1),
// and forecast_status ('finished' when complete) properties.
function getForecastRequestStats(job, forecastId) {
  return new Promise((resolve, reject) => {
    const obj = {
      success: true,
      stats: {}
    };

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the job ID, result type and earliest time.
    const filterCriteria = [{
      query_string: {
        query: 'result_type:model_forecast_request_stats',
        analyze_wildcard: true
      }
    },
    {
      term: { job_id: job.job_id }
    },
    {
      term: { forecast_id: forecastId }
    }];

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 1,
      rest_total_hits_as_int: true,
      body: {
        query: {
          bool: {
            filter: filterCriteria
          }
        }
      }
    })
      .then((resp) => {
        if (resp.hits.total !== 0) {
          obj.stats = _.first(resp.hits.hits)._source;
        }
        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });

  });
}

export const mlForecastService = {
  getForecastsSummary,
  getForecastDateRange,
  getForecastData,
  runForecast,
  getForecastRequestStats
};
