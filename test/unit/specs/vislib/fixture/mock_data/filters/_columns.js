define(function (require) {
  var _ = require('lodash');

  return {
    'columns': [
      {
        'label': 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1: agent.raw',
        'xAxisLabel': 'filters',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'css',
                'y': 10379
              },
              {
                'x': 'png',
                'y': 6395
              }
            ]
          }
        ]
      },
      {
        'label': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24: agent.raw',
        'xAxisLabel': 'filters',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'css',
                'y': 9253
              },
              {
                'x': 'png',
                'y': 5571
              }
            ]
          }
        ]
      },
      {
        'label': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322): agent.raw',
        'xAxisLabel': 'filters',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'css',
                'y': 7740
              },
              {
                'x': 'png',
                'y': 4697
              }
            ]
          }
        ]
      }
    ],
    'raw': {
      'splitColumns': [],
      'splitValStack': [],
      'columns': [
        {
          'categoryName': 'split',
          'id': 'agg_11',
          'aggConfig': {
            'type': 'terms',
            'schema': 'split',
            'params': {
              'field': 'agent.raw',
              'size': 5,
              'order': 'desc',
              'row': false
            }
          },
          'aggType': {
            'name': 'terms',
            'title': 'Terms',
            'hasNoDsl': false,
            'params': [
              {
                'name': 'field'
              },
              {
                'name': 'size',
                'default': 5
              },
              {
                'name': 'order',
                'type': 'optioned',
                'options': [
                  {
                    'display': 'Top',
                    'val': 'desc'
                  },
                  {
                    'display': 'Bottom',
                    'val': 'asc'
                  }
                ],
                'default': 'desc'
              },
              {
                'name': 'exclude',
                'type': 'regex',
                'advanced': true,
                'pattern': '',
                'flags': [
                  'CANON_EQ',
                  'CASE_INSENSITIVE',
                  'COMMENTS',
                  'DOTALL',
                  'LITERAL',
                  'MULTILINE',
                  'UNICODE_CASE',
                  'UNICODE_CHARACTER_CLASS',
                  'UNIX_LINES'
                ]
              },
              {
                'name': 'include',
                'type': 'regex',
                'advanced': true,
                'pattern': '',
                'flags': [
                  'CANON_EQ',
                  'CASE_INSENSITIVE',
                  'COMMENTS',
                  'DOTALL',
                  'LITERAL',
                  'MULTILINE',
                  'UNICODE_CASE',
                  'UNICODE_CHARACTER_CLASS',
                  'UNIX_LINES'
                ]
              },
              {
                'name': 'json',
                'type': 'json',
                'advanced': true
              }
            ],
            'type': 'buckets'
          },
          'field': {
            'type': 'string',
            'indexed': true,
            'analyzed': false,
            'doc_values': false,
            'name': 'agent.raw',
            'count': 0
          },
          'label': 'Top 5 agent.raw',
          'params': {
            'row': false,
            'field': 'agent.raw',
            'size': 5,
            'order': {
              '_count': 'desc'
            }
          }
        },
        {
          'categoryName': 'segment',
          'id': 'agg_10',
          'aggConfig': {
            'type': 'filters',
            'schema': 'segment',
            'params': {
              'filters': [
                {
                  '$$hashKey': '04M',
                  'input': {
                    'query': {
                      'query_string': {
                        'query': 'css'
                      }
                    }
                  }
                },
                {
                  '$$hashKey': '051',
                  'input': {
                    'query': {
                      'query_string': {
                        'query': 'html'
                      }
                    }
                  }
                },
                {
                  '$$hashKey': '054',
                  'input': {
                    'query': {
                      'query_string': {
                        'query': 'png'
                      }
                    }
                  }
                }
              ]
            }
          },
          'aggType': {
            'name': 'filters',
            'title': 'Filters',
            'hasNoDsl': false,
            'params': [
              {
                'name': 'filters',
                'default': [
                  {
                    'input': {}
                  }
                ]
              },
              {
                'name': 'json',
                'type': 'json',
                'advanced': true
              }
            ],
            'type': 'buckets'
          },
          'label': 'filters',
          'params': {
            'filters': {
              'css': {
                'query': {
                  'query_string': {
                    'query': 'css'
                  }
                }
              },
              'html': {
                'query': {
                  'query_string': {
                    'query': 'html'
                  }
                }
              },
              'png': {
                'query': {
                  'query_string': {
                    'query': 'png'
                  }
                }
              }
            }
          }
        },
        {
          'categoryName': 'metric',
          'id': 'agg_9',
          'aggConfig': {
            'type': 'count',
            'schema': 'metric',
            'params': {}
          },
          'aggType': {
            'name': 'count',
            'title': 'Count',
            'hasNoDsl': true,
            'params': [
              {
                'name': 'json',
                'type': 'json',
                'advanced': true
              }
            ],
            'type': 'metrics'
          },
          'label': 'Count of documents',
          'params': {}
        }
      ],
      'rows': [
        [
          'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
          'css',
          10379
        ],
        [
          'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
          'png',
          6395
        ],
        [
          'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
          'css',
          9253
        ],
        [
          'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
          'png',
          5571
        ],
        [
          'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
          'css',
          7740
        ],
        [
          'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
          'png',
          4697
        ]
      ]
    },
    'hits': 171443,
    'xAxisFormatter': function (val) {
      if (_.isObject(val)) {
        return JSON.stringify(val);
      }
      else if (val == null) {
        return '';
      }
      else {
        return '' + val;
      }
    },
    'tooltipFormatter': function (d) {
      return d;
    }
  };
});
