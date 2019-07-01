/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const dataResponse = {
  took: 8,
  timed_out: false,
  _shards: {
    total: 85,
    successful: 85,
    skipped: 0,
    failed: 0
  },
  hits: {
    total: {
      value: 6,
      relation: 'eq'
    },
    max_score: null,
    hits: []
  },
  aggregations: {
    types: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'app',
          doc_count: 2,
          subtypes: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '',
                doc_count: 2,
                total_self_time_per_subtype: {
                  value: 400.0
                },
                total_span_count_per_subtype: {
                  value: 15.0
                }
              }
            ]
          }
        },
        {
          key: 'db',
          doc_count: 2,
          subtypes: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'mysql',
                doc_count: 2,
                total_self_time_per_subtype: {
                  value: 200.0
                },
                total_span_count_per_subtype: {
                  value: 175.0
                }
              },
              {
                key: 'elasticsearch',
                doc_count: 3,
                total_self_time_per_subtype: {
                  value: 100.0
                },
                total_span_count_per_subtype: {
                  value: 225.0
                }
              }
            ]
          }
        }
      ]
    },
    total_transaction_breakdown_count: {
      value: 15.0
    },
    sum_all_self_times: {
      value: 600.0
    }
  }
};
