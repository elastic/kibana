/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const noDataResponse = {
  took: 1,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0
  },
  hits: {
    total: {
      value: 0,
      relation: 'eq'
    },
    max_score: null,
    hits: []
  },
  aggregations: {
    by_date: {
      buckets: []
    },
    types: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: []
    },
    total_transaction_breakdown_count: {
      value: 0.0
    },
    sum_all_self_times: {
      value: 0.0
    }
  }
};
