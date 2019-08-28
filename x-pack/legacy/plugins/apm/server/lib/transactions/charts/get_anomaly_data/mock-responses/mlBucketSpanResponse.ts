/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mlBucketSpanResponse = {
  took: 1,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0
  },
  hits: {
    total: 192,
    max_score: 1.0,
    hits: [
      {
        _index: '.ml-anomalies-shared',
        _type: 'doc',
        _id:
          'opbeans-go-request-high_mean_response_time_model_plot_1542636000000_900_0_29791_0',
        _score: 1.0,
        _source: {
          bucket_span: 10
        }
      }
    ]
  }
};
