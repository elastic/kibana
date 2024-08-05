/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramsMock } from './__mocks__/params_match_all';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { fetchTopCategories } from './fetch_top_categories';

const esClientMock = {
  msearch: jest.fn().mockImplementation(() => ({
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
  })),
} as unknown as ElasticsearchClient;

const loggerMock = {} as unknown as Logger;

describe('fetchTopCategories', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch top categories successfully', async () => {
    const abortSignal = new AbortController().signal;

    const result = await fetchTopCategories({
      esClient: esClientMock,
      logger: loggerMock,
      emitError: jest.fn(),
      abortSignal,
      arguments: { ...paramsMock, fieldNames: ['message'] },
    });
    expect(result).toEqual([
      {
        bg_count: 0,
        doc_count: 1642,
        fieldName: 'message',
        fieldValue:
          '71.231.222.196 - - [2018-08-13T05:04:08.731Z] "GET /kibana/kibana-6.3.2-windows-x86_64.zip HTTP/1.1" 200 15139 "-" "Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1"',
        key: 'GET HTTP/1.1 Mozilla/5.0 X11 Linux x86_64 rv Gecko/20110421 Firefox/6.0a1',
        normalizedScore: 0,
        pValue: 1,
        score: 0,
        total_bg_count: 0,
        total_doc_count: 0,
        type: 'log_pattern',
      },
      {
        bg_count: 0,
        doc_count: 1488,
        fieldName: 'message',
        fieldValue:
          '7.210.210.41 - - [2018-08-13T04:20:49.558Z] "GET /elasticsearch/elasticsearch-6.3.2.deb HTTP/1.1" 404 6699 "-" "Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24"',
        key: 'GET HTTP/1.1 Mozilla/5.0 X11 Linux i686 AppleWebKit/534.24 KHTML like Gecko Chrome/11.0.696.50 Safari/534.24',
        normalizedScore: 0,
        pValue: 1,
        score: 0,
        total_bg_count: 0,
        total_doc_count: 0,
        type: 'log_pattern',
      },
    ]);
    expect(esClientMock.msearch).toHaveBeenCalledWith(
      {
        searches: [
          { index: 'the-index' },
          {
            aggs: {
              categories: {
                aggs: {
                  examples: {
                    top_hits: { _source: 'message', size: 4, sort: ['the-time-field-name'] },
                  },
                },
                categorize_text: { field: 'message', size: 1000 },
              },
            },
            query: {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [
                        {
                          range: {
                            'the-time-field-name': {
                              format: 'epoch_millis',
                              gte: 10,
                              lte: 20,
                            },
                          },
                        },
                        {
                          range: {
                            'the-time-field-name': {
                              format: 'epoch_millis',
                              gte: 30,
                              lte: 40,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            size: 0,
          },
        ],
      },
      { maxRetries: 0, signal: abortSignal }
    );
  });
});
