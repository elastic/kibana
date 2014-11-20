define(function (require) {
  var _ = require('lodash');

  return {
    'rows': [
      {
        'label': 'h3: headings',
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
                'y': 128235
              },
              {
                'x': 'security',
                'y': 34518
              },
              {
                'x': 'error',
                'y': 10257
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
        'label': 'h5: headings',
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
                'y': 128235
              },
              {
                'x': 'security',
                'y': 34518
              },
              {
                'x': 'error',
                'y': 10257
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
        'label': 'http: headings',
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
                'y': 128235
              },
              {
                'x': 'security',
                'y': 34518
              },
              {
                'x': 'error',
                'y': 10257
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
        'label': 'success: headings',
        'xAxisLabel': 'Top 5 unusual terms in @tags',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'success',
                'y': 120689
              },
              {
                'x': 'info',
                'y': 107621
              },
              {
                'x': 'security',
                'y': 28916
              },
              {
                'x': 'error',
                'y': 8590
              },
              {
                'x': 'warning',
                'y': 14548
              }
            ]
          }
        ]
      },
      {
        'label': 'www.slate.com: headings',
        'xAxisLabel': 'Top 5 unusual terms in @tags',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'success',
                'y': 62292
              },
              {
                'x': 'info',
                'y': 55646
              },
              {
                'x': 'security',
                'y': 14823
              },
              {
                'x': 'error',
                'y': 4441
              },
              {
                'x': 'warning',
                'y': 7539
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
              'field': 'headings',
              'size': 5,
              'order': 'desc',
              'row': true
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
            'name': 'headings',
            'count': 0
          },
          'label': 'Top 5 headings',
          'params': {
            'row': true,
            'field': 'headings',
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
          'h3',
          'success',
          144000
        ],
        [
          'h3',
          'info',
          128235
        ],
        [
          'h3',
          'security',
          34518
        ],
        [
          'h3',
          'error',
          10257
        ],
        [
          'h3',
          'warning',
          17188
        ],
        [
          'h5',
          'success',
          144000
        ],
        [
          'h5',
          'info',
          128235
        ],
        [
          'h5',
          'security',
          34518
        ],
        [
          'h5',
          'error',
          10257
        ],
        [
          'h5',
          'warning',
          17188
        ],
        [
          'http',
          'success',
          144000
        ],
        [
          'http',
          'info',
          128235
        ],
        [
          'http',
          'security',
          34518
        ],
        [
          'http',
          'error',
          10257
        ],
        [
          'http',
          'warning',
          17188
        ],
        [
          'success',
          'success',
          120689
        ],
        [
          'success',
          'info',
          107621
        ],
        [
          'success',
          'security',
          28916
        ],
        [
          'success',
          'error',
          8590
        ],
        [
          'success',
          'warning',
          14548
        ],
        [
          'www.slate.com',
          'success',
          62292
        ],
        [
          'www.slate.com',
          'info',
          55646
        ],
        [
          'www.slate.com',
          'security',
          14823
        ],
        [
          'www.slate.com',
          'error',
          4441
        ],
        [
          'www.slate.com',
          'warning',
          7539
        ]
      ]
    },
    'hits': 171445,
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
