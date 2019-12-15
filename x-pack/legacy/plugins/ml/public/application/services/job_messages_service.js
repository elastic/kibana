/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Service for carrying out Elasticsearch queries to obtain data for the
// Ml Results dashboards.
import { ML_NOTIFICATION_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import { ml } from '../services/ml_api_service';

// filter to match job_type: 'anomaly_detector' or no job_type field at all
// if no job_type field exist, we can assume the message is for an anomaly detector job
const anomalyDetectorTypeFilter = {
  bool: {
    should: [
      {
        term: {
          job_type: 'anomaly_detector',
        },
      },
      {
        bool: {
          must_not: {
            exists: {
              field: 'job_type',
            },
          },
        },
      },
    ],
    minimum_should_match: 1,
  },
};

// search for audit messages, jobId is optional.
// without it, all jobs will be listed.
// fromRange should be a string formatted in ES time units. e.g. 12h, 1d, 7d
function getJobAuditMessages(fromRange, jobId) {
  return new Promise((resolve, reject) => {
    let jobFilter = {};
    // if no jobId specified, load all of the messages
    if (jobId !== undefined) {
      jobFilter = {
        bool: {
          should: [
            {
              term: {
                job_id: '', // catch system messages
              },
            },
            {
              term: {
                job_id: jobId, // messages for specified jobId
              },
            },
          ],
        },
      };
    }

    let timeFilter = {};
    if (fromRange !== undefined && fromRange !== '') {
      timeFilter = {
        range: {
          timestamp: {
            gte: `now-${fromRange}`,
            lte: 'now',
          },
        },
      };
    }

    ml.esSearch({
      index: ML_NOTIFICATION_INDEX_PATTERN,
      ignore_unavailable: true,
      rest_total_hits_as_int: true,
      size: 1000,
      body: {
        sort: [{ timestamp: { order: 'asc' } }, { job_id: { order: 'asc' } }],
        query: {
          bool: {
            filter: [
              {
                bool: {
                  must_not: {
                    term: {
                      level: 'activity',
                    },
                  },
                },
              },
              anomalyDetectorTypeFilter,
              jobFilter,
              timeFilter,
            ],
          },
        },
      },
    })
      .then(resp => {
        let messages = [];
        if (resp.hits.total !== 0) {
          messages = resp.hits.hits.map(hit => hit._source);
        }
        resolve({ messages });
      })
      .catch(resp => {
        reject(resp);
      });
  });
}

// search highest, most recent audit messages for all jobs for the last 24hrs.
function getAuditMessagesSummary() {
  return new Promise((resolve, reject) => {
    ml.esSearch({
      index: ML_NOTIFICATION_INDEX_PATTERN,
      ignore_unavailable: true,
      rest_total_hits_as_int: true,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                range: {
                  timestamp: {
                    gte: 'now-1d',
                  },
                },
              },
              anomalyDetectorTypeFilter,
            ],
          },
        },
        aggs: {
          levelsPerJob: {
            terms: {
              field: 'job_id',
            },
            aggs: {
              levels: {
                terms: {
                  field: 'level',
                },
                aggs: {
                  latestMessage: {
                    terms: {
                      field: 'message.raw',
                      size: 1,
                      order: {
                        latestMessage: 'desc',
                      },
                    },
                    aggs: {
                      latestMessage: {
                        max: {
                          field: 'timestamp',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
      .then(resp => {
        let messagesPerJob = [];
        if (
          resp.hits.total !== 0 &&
          resp.aggregations &&
          resp.aggregations.levelsPerJob &&
          resp.aggregations.levelsPerJob.buckets &&
          resp.aggregations.levelsPerJob.buckets.length
        ) {
          messagesPerJob = resp.aggregations.levelsPerJob.buckets;
        }
        resolve({ messagesPerJob });
      })
      .catch(resp => {
        reject(resp);
      });
  });
}

export const jobMessagesService = {
  getJobAuditMessages,
  getAuditMessagesSummary,
};
