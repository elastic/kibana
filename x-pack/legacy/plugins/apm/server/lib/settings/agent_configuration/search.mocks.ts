/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const searchMocks = {
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
      value: 3,
      relation: 'eq'
    },
    max_score: 0.9808292,
    hits: [
      {
        _index: '.apm-agent-configuration',
        _id: '-aQHsm0BxZLczArvNQYW',
        _score: 0.9808292,
        _source: {
          service: {
            environment: 'production'
          },
          settings: {
            transaction_sample_rate: 0.3
          },
          '@timestamp': 1570649879829,
          applied_by_agent: false,
          etag: 'c511f4c1df457371c4446c9c4925662e18726f51'
        }
      },
      {
        _index: '.apm-agent-configuration',
        _id: '-KQHsm0BxZLczArvNAb0',
        _score: 0.18232156,
        _source: {
          service: {
            name: 'my_service'
          },
          settings: {
            transaction_sample_rate: 0.2
          },
          '@timestamp': 1570649879795,
          applied_by_agent: false,
          etag: 'a13cd8fee5a2fcc2ae773a60a4deaf7f76b90a65'
        }
      },
      {
        _index: '.apm-agent-configuration',
        _id: '96QHsm0BxZLczArvNAbD',
        _score: 0.0,
        _source: {
          service: {},
          settings: {
            transaction_sample_rate: 0.1
          },
          '@timestamp': 1570649879743,
          applied_by_agent: false,
          etag: 'c7f4ba16f00a9c9bf3c49024c5b6d4632ff05ff5'
        }
      }
    ]
  }
};
