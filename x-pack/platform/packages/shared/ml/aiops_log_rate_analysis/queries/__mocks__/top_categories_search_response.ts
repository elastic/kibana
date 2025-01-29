/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const topCategoriesSearchResponseMock = {
  took: 98,
  responses: [
    {
      took: 98,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 4413, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        categories: {
          buckets: [
            {
              doc_count: 1642,
              key: 'GET HTTP/1.1 Mozilla/5.0 X11 Linux x86_64 rv Gecko/20110421 Firefox/6.0a1',
              regex:
                '.*?GET.+?HTTP/1\\.1.+?Mozilla/5\\.0.+?X11.+?Linux.+?x86_64.+?rv.+?Gecko/20110421.+?Firefox/6\\.0a1.*?',
              max_matching_length: 233,
              examples: {
                hits: {
                  total: { value: 1642, relation: 'eq' },
                  max_score: null,
                  hits: [
                    {
                      _index: '.ds-kibana_sample_data_logs-2024.07.08-000001',
                      _id: 'zpkLk5AB4oRN3GwDmOW1',
                      _score: null,
                      _source: {
                        message:
                          '71.231.222.196 - - [2018-08-13T05:04:08.731Z] "GET /kibana/kibana-6.3.2-windows-x86_64.zip HTTP/1.1" 200 15139 "-" "Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1"',
                      },
                      sort: [1721624648731],
                    },
                  ],
                },
              },
            },
            {
              doc_count: 1488,
              key: 'GET HTTP/1.1 Mozilla/5.0 X11 Linux i686 AppleWebKit/534.24 KHTML like Gecko Chrome/11.0.696.50 Safari/534.24',
              regex:
                '.*?GET.+?HTTP/1\\.1.+?Mozilla/5\\.0.+?X11.+?Linux.+?i686.+?AppleWebKit/534\\.24.+?KHTML.+?like.+?Gecko.+?Chrome/11\\.0\\.696\\.50.+?Safari/534\\.24.*?',
              max_matching_length: 266,
              examples: {
                hits: {
                  total: { value: 1488, relation: 'eq' },
                  max_score: null,
                  hits: [
                    {
                      _index: '.ds-kibana_sample_data_logs-2024.07.08-000001',
                      _id: 'VpkLk5AB4oRN3GwDmOW1',
                      _score: null,
                      _source: {
                        message:
                          '7.210.210.41 - - [2018-08-13T04:20:49.558Z] "GET /elasticsearch/elasticsearch-6.3.2.deb HTTP/1.1" 404 6699 "-" "Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24"',
                      },
                      sort: [1721622049558],
                    },
                  ],
                },
              },
            },
          ],
        },
      },
      status: 200,
    },
  ],
};
