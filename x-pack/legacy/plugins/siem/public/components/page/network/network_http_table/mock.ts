/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkHttpData } from '../../../../graphql/types';

export const mockData: { NetworkHttp: NetworkHttpData } = {
  NetworkHttp: {
    edges: [
      {
        node: {
          _id: '/computeMetadata/v1/instance/virtual-clock/drift-token',
          domains: ['metadata.google.internal'],
          methods: ['get'],
          statuses: [],
          lastHost: 'suricata-iowa',
          lastSourceIp: '10.128.0.21',
          path: '/computeMetadata/v1/instance/virtual-clock/drift-token',
          requestCount: 1440,
        },
        cursor: {
          value: '/computeMetadata/v1/instance/virtual-clock/drift-token',
          tiebreaker: null,
        },
      },
      {
        node: {
          _id: '/computeMetadata/v1/',
          domains: ['metadata.google.internal'],
          methods: ['get'],
          statuses: ['200'],
          lastHost: 'suricata-iowa',
          lastSourceIp: '10.128.0.21',
          path: '/computeMetadata/v1/',
          requestCount: 1020,
        },
        cursor: {
          value: '/computeMetadata/v1/',
          tiebreaker: null,
        },
      },
      {
        node: {
          _id: '/computeMetadata/v1/instance/network-interfaces/',
          domains: ['metadata.google.internal'],
          methods: ['get'],
          statuses: [],
          lastHost: 'suricata-iowa',
          lastSourceIp: '10.128.0.21',
          path: '/computeMetadata/v1/instance/network-interfaces/',
          requestCount: 960,
        },
        cursor: {
          value: '/computeMetadata/v1/instance/network-interfaces/',
          tiebreaker: null,
        },
      },
      {
        node: {
          _id: '/downloads/ca_setup.exe',
          domains: ['www.oxid.it'],
          methods: ['get'],
          statuses: ['200'],
          lastHost: 'jessie',
          lastSourceIp: '10.0.2.15',
          path: '/downloads/ca_setup.exe',
          requestCount: 3,
        },
        cursor: {
          value: '/downloads/ca_setup.exe',
          tiebreaker: null,
        },
      },
    ],
    inspect: {
      dsl: [
        '{\n  "allowNoIndices": true,\n  "index": [\n    "auditbeat-*",\n    "endgame-*",\n    "filebeat-*",\n    "packetbeat-*",\n    "winlogbeat-*"\n  ],\n  "ignoreUnavailable": true,\n  "body": {\n    "aggregations": {\n      "http_count": {\n        "cardinality": {\n          "field": "url.path"\n        }\n      },\n      "url": {\n        "terms": {\n          "field": "url.path",\n          "size": 10\n        },\n        "aggs": {\n          "methods": {\n            "terms": {\n              "field": "http.request.method",\n              "size": 4\n            }\n          },\n          "domains": {\n            "terms": {\n              "field": "url.domain",\n              "size": 4\n            }\n          },\n          "status": {\n            "terms": {\n              "field": "http.response.status_code",\n              "size": 4\n            }\n          },\n          "source": {\n            "top_hits": {\n              "size": 1,\n              "_source": {\n                "includes": [\n                  "host.name",\n                  "source.ip"\n                ]\n              }\n            }\n          }\n        }\n      }\n    },\n    "query": {\n      "bool": {\n        "filter": [\n          {\n            "bool": {\n              "must": [],\n              "filter": [\n                {\n                  "match_all": {}\n                }\n              ],\n              "should": [],\n              "must_not": []\n            }\n          },\n          {\n            "range": {\n              "@timestamp": {\n                "gte": 1572475385644,\n                "lte": 1572561785644\n              }\n            }\n          },\n          {\n            "exists": {\n              "field": "http.request.method"\n            }\n          }\n        ]\n      }\n    }\n  },\n  "size": 0,\n  "track_total_hits": false\n}',
      ],
      response: [
        '{\n  "took": 188,\n  "timed_out": false,\n  "_shards": {\n    "total": 64,\n    "successful": 64,\n    "skipped": 0,\n    "failed": 0\n  },\n  "hits": {\n    "max_score": null,\n    "hits": []\n  },\n  "aggregations": {\n    "http_count": {\n      "value": 4\n    },\n    "url": {\n      "doc_count_error_upper_bound": 0,\n      "sum_other_doc_count": 0,\n      "buckets": [\n        {\n          "key": "/computeMetadata/v1/instance/virtual-clock/drift-token",\n          "doc_count": 1440,\n          "methods": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": [\n              {\n                "key": "get",\n                "doc_count": 1440\n              }\n            ]\n          },\n          "domains": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": [\n              {\n                "key": "metadata.google.internal",\n                "doc_count": 1440\n              }\n            ]\n          },\n          "source": {\n            "hits": {\n              "total": {\n                "value": 1440,\n                "relation": "eq"\n              },\n              "max_score": 0,\n              "hits": [\n                {\n                  "_index": "packetbeat-8.0.0-2019.08.29-000010",\n                  "_id": "X7XbHm4BHe9nqdOibTy7",\n                  "_score": 0,\n                  "_source": {\n                    "host": {\n                      "name": "suricata-iowa"\n                    },\n                    "source": {\n                      "ip": "10.128.0.21"\n                    }\n                  }\n                }\n              ]\n            }\n          },\n          "status": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": []\n          }\n        },\n        {\n          "key": "/computeMetadata/v1/",\n          "doc_count": 1020,\n          "methods": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": [\n              {\n                "key": "get",\n                "doc_count": 1020\n              }\n            ]\n          },\n          "domains": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": [\n              {\n                "key": "metadata.google.internal",\n                "doc_count": 1020\n              }\n            ]\n          },\n          "source": {\n            "hits": {\n              "total": {\n                "value": 1020,\n                "relation": "eq"\n              },\n              "max_score": 0,\n              "hits": [\n                {\n                  "_index": "packetbeat-8.0.0-2019.08.29-000010",\n                  "_id": "6rbjHm4BHe9nqdOid5u7",\n                  "_score": 0,\n                  "_source": {\n                    "host": {\n                      "name": "suricata-iowa"\n                    },\n                    "source": {\n                      "ip": "10.128.0.21"\n                    }\n                  }\n                }\n              ]\n            }\n          },\n          "status": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": [\n              {\n                "key": 200,\n                "doc_count": 2\n              }\n            ]\n          }\n        },\n        {\n          "key": "/computeMetadata/v1/instance/network-interfaces/",\n          "doc_count": 960,\n          "methods": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": [\n              {\n                "key": "get",\n                "doc_count": 960\n              }\n            ]\n          },\n          "domains": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": [\n              {\n                "key": "metadata.google.internal",\n                "doc_count": 960\n              }\n            ]\n          },\n          "source": {\n            "hits": {\n              "total": {\n                "value": 960,\n                "relation": "eq"\n              },\n              "max_score": 0,\n              "hits": [\n                {\n                  "_index": "packetbeat-8.0.0-2019.08.29-000010",\n                  "_id": "rrXbHm4BHe9nqdOiOTa7",\n                  "_score": 0,\n                  "_source": {\n                    "host": {\n                      "name": "suricata-iowa"\n                    },\n                    "source": {\n                      "ip": "10.128.0.21"\n                    }\n                  }\n                }\n              ]\n            }\n          },\n          "status": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": []\n          }\n        },\n        {\n          "key": "/downloads/ca_setup.exe",\n          "doc_count": 3,\n          "methods": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": [\n              {\n                "key": "get",\n                "doc_count": 3\n              }\n            ]\n          },\n          "domains": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": [\n              {\n                "key": "www.oxid.it",\n                "doc_count": 3\n              }\n            ]\n          },\n          "source": {\n            "hits": {\n              "total": {\n                "value": 3,\n                "relation": "eq"\n              },\n              "max_score": 0,\n              "hits": [\n                {\n                  "_index": "packetbeat-8.0.0-2019.08.29-000010",\n                  "_id": "Ls9mIG4BHe9nqdOimsuF",\n                  "_score": 0,\n                  "_source": {\n                    "host": {\n                      "name": "jessie"\n                    },\n                    "source": {\n                      "ip": "10.0.2.15"\n                    }\n                  }\n                }\n              ]\n            }\n          },\n          "status": {\n            "doc_count_error_upper_bound": 0,\n            "sum_other_doc_count": 0,\n            "buckets": [\n              {\n                "key": 200,\n                "doc_count": 3\n              }\n            ]\n          }\n        }\n      ]\n    }\n  }\n}',
      ],
    },
    pageInfo: {
      activePage: 0,
      fakeTotalCount: 4,
      showMorePagesIndicator: false,
    },
    totalCount: 4,
  },
};
