/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleResponse } from '../get_indices';
import expect from '@kbn/expect';

describe('Get Elasticsearch Indices', () => {
  it('handle an empty response', () => {
    const result = handleResponse();
    expect(result).to.eql([]);
  });

  it('should handle a simple response', () => {
    const resp = {
      hits: {
        hits: [{
          _source: {
            index_stats: { index: 'My Cool Test Index' }
          }
        }]
      }
    };
    const result = handleResponse(resp, 0, 0);
    expect(result).to.eql([
      {
        name: 'My Cool Test Index',
        doc_count: undefined,
        data_size: undefined,
        index_rate: null,
        search_rate: null,
        status: 'Deleted / Closed',
        status_sort: 0,
        unassigned_shards: undefined
      }
    ]);
  });

  it('should handle a multi-hit response with deleted/closed indices', () => {
    const resp = {
      'hits': {
        'hits': [ {
          '_source': {
            'index_stats': {
              'index': 'avocado-tweets-2017.08.08',
              'primaries': { 'docs': { 'count': 381 }, 'indexing': { 'index_total': 15 }
              },
              'total': { 'search': { 'query_total': 19345 }, 'store': { 'size_in_bytes': 3199059 } }
            },
            'timestamp': '2017-08-08T19:16:20.104Z'
          },
          'inner_hits': {
            'earliest': {
              'hits': {
                'hits': [ {
                  '_source': {
                    'index_stats': {
                      'primaries': { 'indexing': { 'index_total': 15 } },
                      'total': { 'search': { 'query_total': 19345 } }
                    },
                    'timestamp': '2017-08-08T18:16:28.898Z'
                  }
                } ]
              }
            }
          }
        }, {
          '_source': {
            'index_stats': {
              'index': 'cat-tweets-2017.08.08',
              'primaries': { 'docs': { 'count': 31375 }, 'indexing': { 'index_total': 31377 } },
              'total': { 'search': { 'query_total': 43155 }, 'store': { 'size_in_bytes': 239591867 } }
            },
            'timestamp': '2017-08-08T19:16:20.104Z'
          },
          'inner_hits': {
            'earliest': {
              'hits': {
                'hits': [ {
                  '_source': {
                    'index_stats': {
                      'primaries': { 'indexing': { 'index_total': 23333 } },
                      'total': { 'search': { 'query_total': 25675 } }
                    },
                    'timestamp': '2017-08-08T18:16:28.898Z'
                  }
                } ]
              }
            }
          }
        } ]
      }
    };
    const result = handleResponse(resp, 0, 604800);
    expect(result).to.eql([
      {
        name: 'avocado-tweets-2017.08.08',
        doc_count: 381,
        data_size: 3199059,
        index_rate: 0,
        search_rate: 0,
        status: 'Deleted / Closed',
        status_sort: 0,
        unassigned_shards: undefined
      },
      {
        name: 'cat-tweets-2017.08.08',
        doc_count: 31375,
        data_size: 239591867,
        index_rate: 13.30026455026455,
        search_rate: 28.902116402116405,
        status: 'Deleted / Closed',
        status_sort: 0,
        unassigned_shards: undefined
      }
    ]);
  });

  it('should handle a multi-hit response with open indices', () => {
    const resp = {
      hits: {
        hits: [
          {
            _source: {
              index_stats: {
                index: 'avocado-tweets-2017.08.08',
                primaries: {
                  docs: { count: 381 },
                  indexing: { index_total: 15 }
                },
                total: {
                  search: { query_total: 19345 },
                  store: { size_in_bytes: 3199059 }
                }
              },
              timestamp: '2017-08-08T19:16:20.104Z'
            },
            inner_hits: {
              earliest: {
                hits: {
                  hits: [
                    {
                      _source: {
                        index_stats: {
                          primaries: { indexing: { index_total: 15 } },
                          total: { search: { query_total: 19345 } }
                        },
                        timestamp: '2017-08-08T18:16:28.898Z'
                      }
                    }
                  ]
                }
              }
            }
          },
          {
            _source: {
              index_stats: {
                index: 'cat-tweets-2017.08.08',
                primaries: {
                  docs: { count: 31375 },
                  indexing: { index_total: 31377 }
                },
                total: {
                  search: { query_total: 43155 },
                  store: { size_in_bytes: 239591867 }
                }
              },
              timestamp: '2017-08-08T19:16:20.104Z'
            },
            inner_hits: {
              earliest: {
                hits: {
                  hits: [
                    {
                      _source: {
                        index_stats: {
                          primaries: { indexing: { index_total: 23333 } },
                          total: { search: { query_total: 25675 } }
                        },
                        timestamp: '2017-08-08T18:16:28.898Z'
                      }
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    };

    const shardStats = {
      indices: {
        'avocado-tweets-2017.08.08': { status: 'green', primary: 5, replica: 5, unassigned: { primary: 0, replica: 0 } },
        'cat-tweets-2017.08.08': { status: 'yellow', primary: 5, replica: 5, unassigned: { primary: 0, replica: 1 } }
      }
    };

    const result = handleResponse(resp, 0, 604800, shardStats);
    expect(result).to.eql([
      {
        name: 'avocado-tweets-2017.08.08',
        doc_count: 381,
        data_size: 3199059,
        index_rate: 0,
        search_rate: 0,
        status: 'green',
        status_sort: 1,
        unassigned_shards: 0
      },
      {
        name: 'cat-tweets-2017.08.08',
        doc_count: 31375,
        data_size: 239591867,
        index_rate: 13.30026455026455,
        search_rate: 28.902116402116405,
        status: 'yellow',
        status_sort: 2,
        unassigned_shards: 1
      }
    ]);
  });
});
