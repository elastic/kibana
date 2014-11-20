define(function (require) {
  var _ = require('lodash');

  return {
    'columns': [
      {
        'label': 'http: links',
        'xAxisLabel': 'Top 5 unusual terms in @tags',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'success',
                'y': 144000
              },
              {
                'x': 'info',
                'y': 128237
              },
              {
                'x': 'security',
                'y': 34518
              },
              {
                'x': 'error',
                'y': 10258
              },
              {
                'x': 'warning',
                'y': 17188
              }
            ]
          }
        ]
      },
      {
        'label': 'info: links',
        'xAxisLabel': 'Top 5 unusual terms in @tags',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'success',
                'y': 108148
              },
              {
                'x': 'info',
                'y': 96242
              },
              {
                'x': 'security',
                'y': 25889
              },
              {
                'x': 'error',
                'y': 7673
              },
              {
                'x': 'warning',
                'y': 12842
              }
            ]
          }
        ]
      },
      {
        'label': 'www.slate.com: links',
        'xAxisLabel': 'Top 5 unusual terms in @tags',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'success',
                'y': 98056
              },
              {
                'x': 'info',
                'y': 87344
              },
              {
                'x': 'security',
                'y': 23577
              },
              {
                'x': 'error',
                'y': 7004
              },
              {
                'x': 'warning',
                'y': 11759
              }
            ]
          }
        ]
      },
      {
        'label': 'twitter.com: links',
        'xAxisLabel': 'Top 5 unusual terms in @tags',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'success',
                'y': 74154
              },
              {
                'x': 'info',
                'y': 65963
              },
              {
                'x': 'security',
                'y': 17832
              },
              {
                'x': 'error',
                'y': 5258
              },
              {
                'x': 'warning',
                'y': 8906
              }
            ]
          }
        ]
      },
      {
        'label': 'www.www.slate.com: links',
        'xAxisLabel': 'Top 5 unusual terms in @tags',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'success',
                'y': 62591
              },
              {
                'x': 'info',
                'y': 55822
              },
              {
                'x': 'security',
                'y': 15100
              },
              {
                'x': 'error',
                'y': 4564
              },
              {
                'x': 'warning',
                'y': 7498
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
          'id': 'agg_18',
          'aggConfig': {
            'type': 'terms',
            'schema': 'split',
            'params': {
              'field': 'links',
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
            'analyzed': true,
            'doc_values': false,
            'name': 'links',
            'count': 0
          },
          'label': 'Top 5 links',
          'params': {
            'row': false,
            'field': 'links',
            'size': 5,
            'order': {
              '_count': 'desc'
            }
          }
        },
        {
          'categoryName': 'segment',
          'id': 'agg_17',
          'aggConfig': {
            'type': 'significant_terms',
            'schema': 'segment',
            'params': {
              'field': '@tags',
              'size': 5
            }
          },
          'aggType': {
            'name': 'significant_terms',
            'title': 'Significant Terms',
            'hasNoDsl': false,
            'params': [
              {
                'name': 'field',
                'filterFieldTypes': 'string'
              },
              {
                'name': 'size'
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
            'analyzed': true,
            'doc_values': false,
            'name': '@tags',
            'count': 0
          },
          'label': 'Top 5 unusual terms in @tags',
          'params': {
            'field': '@tags',
            'size': 5
          }
        },
        {
          'categoryName': 'metric',
          'id': 'agg_16',
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
          'http',
          'success',
          144000
        ],
        [
          'http',
          'info',
          128237
        ],
        [
          'http',
          'security',
          34518
        ],
        [
          'http',
          'error',
          10258
        ],
        [
          'http',
          'warning',
          17188
        ],
        [
          'info',
          'success',
          108148
        ],
        [
          'info',
          'info',
          96242
        ],
        [
          'info',
          'security',
          25889
        ],
        [
          'info',
          'error',
          7673
        ],
        [
          'info',
          'warning',
          12842
        ],
        [
          'www.slate.com',
          'success',
          98056
        ],
        [
          'www.slate.com',
          'info',
          87344
        ],
        [
          'www.slate.com',
          'security',
          23577
        ],
        [
          'www.slate.com',
          'error',
          7004
        ],
        [
          'www.slate.com',
          'warning',
          11759
        ],
        [
          'twitter.com',
          'success',
          74154
        ],
        [
          'twitter.com',
          'info',
          65963
        ],
        [
          'twitter.com',
          'security',
          17832
        ],
        [
          'twitter.com',
          'error',
          5258
        ],
        [
          'twitter.com',
          'warning',
          8906
        ],
        [
          'www.www.slate.com',
          'success',
          62591
        ],
        [
          'www.www.slate.com',
          'info',
          55822
        ],
        [
          'www.www.slate.com',
          'security',
          15100
        ],
        [
          'www.www.slate.com',
          'error',
          4564
        ],
        [
          'www.www.slate.com',
          'warning',
          7498
        ]
      ]
    },
    'hits': 171446,
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
