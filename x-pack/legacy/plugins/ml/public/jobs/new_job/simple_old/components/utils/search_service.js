/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';

import { ML_RESULTS_INDEX_PATTERN } from '../../../../../../common/constants/index_patterns';
import { escapeForElasticsearchQuery } from '../../../../../util/string_utils';
import { ml } from '../../../../../services/ml_api_service';

// detector swimlane search
function getScoresByRecord(jobId, earliestMs, latestMs, interval, firstSplitField) {
  return new Promise((resolve, reject) => {
    const obj = {
      success: true,
      results: {}
    };

    let jobIdFilterStr = 'job_id: ' + jobId;
    if (firstSplitField && firstSplitField.value !== undefined) {
      // Escape any reserved characters for the query_string query,
      // wrapping the value in quotes to do a phrase match.
      // Backslash is a special character in JSON strings, so doubly escape
      // any backslash characters which exist in the field value.
      jobIdFilterStr += ` AND ${escapeForElasticsearchQuery(firstSplitField.name)}:`;
      jobIdFilterStr += `"${String(firstSplitField.value).replace(/\\/g, '\\\\')}"`;
    }

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [{
              query_string: {
                query: 'result_type:record'
              }
            }, {
              bool: {
                must: [{
                  range: {
                    timestamp: {
                      gte: earliestMs,
                      lte: latestMs,
                      format: 'epoch_millis'
                    }
                  }
                }, {
                  query_string: {
                    query: jobIdFilterStr
                  }
                }]
              }
            }]
          }
        },
        aggs: {
          detector_index: {
            terms: {
              field: 'detector_index',
              order: {
                recordScore: 'desc'
              }
            },
            aggs: {
              recordScore: {
                max: {
                  field: 'record_score'
                }
              },
              byTime: {
                date_histogram: {
                  field: 'timestamp',
                  interval: interval,
                  min_doc_count: 1,
                  extended_bounds: {
                    min: earliestMs,
                    max: latestMs
                  }
                },
                aggs: {
                  recordScore: {
                    max: {
                      field: 'record_score'
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
      .then((resp) => {
        const detectorsByIndex = _.get(resp, ['aggregations', 'detector_index', 'buckets'], []);
        _.each(detectorsByIndex, (dtr) => {
          const dtrResults = {};
          const dtrIndex = +dtr.key;

          const buckets = _.get(dtr, ['byTime', 'buckets'], []);
          for (let j = 0; j < buckets.length; j++) {
            const bkt = buckets[j];
            const time = bkt.key;
            dtrResults[time] = {
              recordScore: _.get(bkt, ['recordScore', 'value']),
            };
          }
          obj.results[dtrIndex] = dtrResults;
        });

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

function getCategoryFields(index, field, size, query) {
  return new Promise((resolve, reject) => {
    const obj = {
      success: true,
      results: {}
    };

    ml.esSearch({
      index,
      size: 0,
      body: {
        query: query,
        aggs: {
          catFields: {
            terms: {
              field: field,
              size: size
            }
          }
        }
      }
    })
      .then((resp) => {
        obj.results.values  = [];
        const catFields = _.get(resp, ['aggregations', 'catFields', 'buckets'], []);
        _.each(catFields, (f) => {
          obj.results.values.push(f.key);
        });

        resolve(obj);
      })
      .catch((resp) => {
        reject(resp);
      });

  });
}

export const mlSimpleJobSearchService = {
  getScoresByRecord,
  getCategoryFields
};
