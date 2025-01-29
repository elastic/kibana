/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const topTermsSearchResponseMock = {
  took: 8,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: 329, relation: 'eq' }, max_score: null, hits: [] },
  aggregations: {
    top_terms_0: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
          doc_count: 179,
        },
        {
          key: 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
          doc_count: 87,
        },
        {
          key: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
          doc_count: 63,
        },
      ],
    },
    top_terms_1: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 207,
      buckets: [
        { key: '30.156.16.164', doc_count: 100 },
        { key: '107.152.89.90', doc_count: 3 },
        { key: '112.106.69.227', doc_count: 3 },
        { key: '160.20.100.193', doc_count: 3 },
        { key: '186.153.168.71', doc_count: 3 },
        { key: '16.241.165.21', doc_count: 2 },
        { key: '20.129.3.8', doc_count: 2 },
        { key: '24.42.142.201', doc_count: 2 },
        { key: '43.86.71.5', doc_count: 2 },
        { key: '50.184.59.162', doc_count: 2 },
      ],
    },
    top_terms_2: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [{ key: 'sample_web_logs', doc_count: 329 }],
    },
    top_terms_3: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        { key: '', doc_count: 196 },
        { key: 'gz', doc_count: 42 },
        { key: 'zip', doc_count: 28 },
        { key: 'css', doc_count: 27 },
        { key: 'deb', doc_count: 26 },
        { key: 'rpm', doc_count: 10 },
      ],
    },
    top_terms_4: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 95,
      buckets: [
        { key: 'IN', doc_count: 135 },
        { key: 'CN', doc_count: 38 },
        { key: 'US', doc_count: 18 },
        { key: 'ID', doc_count: 10 },
        { key: 'BD', doc_count: 7 },
        { key: 'BR', doc_count: 7 },
        { key: 'NG', doc_count: 7 },
        { key: 'AR', doc_count: 4 },
        { key: 'DE', doc_count: 4 },
        { key: 'ET', doc_count: 4 },
      ],
    },
    top_terms_5: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [{ key: 'US', doc_count: 329 }],
    },
    top_terms_6: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 95,
      buckets: [
        { key: 'US:IN', doc_count: 135 },
        { key: 'US:CN', doc_count: 38 },
        { key: 'US:US', doc_count: 18 },
        { key: 'US:ID', doc_count: 10 },
        { key: 'US:BD', doc_count: 7 },
        { key: 'US:BR', doc_count: 7 },
        { key: 'US:NG', doc_count: 7 },
        { key: 'US:AR', doc_count: 4 },
        { key: 'US:DE', doc_count: 4 },
        { key: 'US:ET', doc_count: 4 },
      ],
    },
    top_terms_7: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        { key: 'elastic-elastic-elastic.org', doc_count: 112 },
        { key: 'artifacts.elastic.co', doc_count: 106 },
        { key: 'www.elastic.co', doc_count: 84 },
        { key: 'cdn.elastic-elastic-elastic.org', doc_count: 27 },
      ],
    },
    top_terms_8: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [{ key: 'kibana_sample_data_logs', doc_count: 329 }],
    },
    top_terms_9: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 206,
      buckets: [
        { key: '30.156.16.163', doc_count: 101 },
        { key: '107.152.89.90', doc_count: 3 },
        { key: '112.106.69.227', doc_count: 3 },
        { key: '160.20.100.193', doc_count: 3 },
        { key: '186.153.168.71', doc_count: 3 },
        { key: '16.241.165.21', doc_count: 2 },
        { key: '20.129.3.8', doc_count: 2 },
        { key: '24.42.142.201', doc_count: 2 },
        { key: '43.86.71.5', doc_count: 2 },
        { key: '50.184.59.162', doc_count: 2 },
      ],
    },
    top_terms_10: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        { key: 'win xp', doc_count: 148 },
        { key: 'osx', doc_count: 50 },
        { key: 'ios', doc_count: 44 },
        { key: 'win 7', doc_count: 44 },
        { key: 'win 8', doc_count: 43 },
      ],
    },
    top_terms_11: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 210,
      buckets: [
        { key: 'http://www.elastic-elastic-elastic.com/success/timothy-l-kopra', doc_count: 101 },
        { key: 'http://facebook.com/success/daniel-barry', doc_count: 2 },
        { key: 'http://facebook.com/success/mark-kelly', doc_count: 2 },
        { key: 'http://facebook.com/success/pavel-popovich', doc_count: 2 },
        { key: 'http://facebook.com/success/scott-altman', doc_count: 2 },
        { key: 'http://twitter.com/success/dafydd-williams', doc_count: 2 },
        { key: 'http://twitter.com/success/valentin-lebedev', doc_count: 2 },
        { key: 'http://twitter.com/success/viktor-m-afanasyev', doc_count: 2 },
        { key: 'http://twitter.com/success/y-ng-l-w-i', doc_count: 2 },
        {
          key: 'http://www.elastic-elastic-elastic.com/success/georgi-dobrovolski',
          doc_count: 2,
        },
      ],
    },
    top_terms_12: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 214,
      buckets: [
        { key: '/apm', doc_count: 19 },
        { key: '/beats', doc_count: 13 },
        { key: '/beats/filebeat', doc_count: 11 },
        { key: '/elasticsearch/elasticsearch-6.3.2.tar.gz', doc_count: 11 },
        { key: '/kibana/kibana-6.3.2-darwin-x86_64.tar.gz', doc_count: 11 },
        { key: '/', doc_count: 10 },
        { key: '/apm-server/apm-server-6.3.2-windows-x86.zip', doc_count: 10 },
        { key: '/beats/metricbeat', doc_count: 10 },
        { key: '/beats/metricbeat/metricbeat-6.3.2-i686.rpm', doc_count: 10 },
        { key: '/elasticsearch/elasticsearch-6.3.2.deb', doc_count: 10 },
      ],
    },
    top_terms_13: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        { key: '200', doc_count: 210 },
        { key: '404', doc_count: 110 },
        { key: '503', doc_count: 9 },
      ],
    },
    top_terms_14: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        { key: 'success', doc_count: 295 },
        { key: 'info', doc_count: 279 },
        { key: 'security', doc_count: 37 },
        { key: 'warning', doc_count: 23 },
        { key: 'login', doc_count: 13 },
        { key: 'error', doc_count: 11 },
      ],
    },
    top_terms_15: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 217,
      buckets: [
        { key: 'https://www.elastic.co/downloads/apm', doc_count: 16 },
        { key: 'https://www.elastic.co/downloads/beats', doc_count: 13 },
        {
          key: 'https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-6.3.2.tar.gz',
          doc_count: 11,
        },
        {
          key: 'https://artifacts.elastic.co/downloads/kibana/kibana-6.3.2-darwin-x86_64.tar.gz',
          doc_count: 11,
        },
        { key: 'https://www.elastic.co/downloads/beats/filebeat', doc_count: 11 },
        {
          key: 'https://artifacts.elastic.co/downloads/apm-server/apm-server-6.3.2-windows-x86.zip',
          doc_count: 10,
        },
        {
          key: 'https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-6.3.2-i686.rpm',
          doc_count: 10,
        },
        {
          key: 'https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-6.3.2.deb',
          doc_count: 10,
        },
        { key: 'https://www.elastic.co/downloads/beats/metricbeat', doc_count: 10 },
        { key: 'https://www.elastic.co/downloads/enterprise', doc_count: 10 },
      ],
    },
  },
};
