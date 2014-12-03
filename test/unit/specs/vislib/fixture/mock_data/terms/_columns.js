define(function (require) {
  var _ = require('lodash');

  return {
    'columns': [
      {
        'label': 'logstash: index',
        'xAxisLabel': 'Top 5 extension',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'jpg',
                'y': 110710
              },
              {
                'x': 'css',
                'y': 27376
              },
              {
                'x': 'png',
                'y': 16664
              },
              {
                'x': 'gif',
                'y': 11264
              },
              {
                'x': 'php',
                'y': 5448
              }
            ]
          }
        ]
      },
      {
        'label': '2014.11.12: index',
        'xAxisLabel': 'Top 5 extension',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'jpg',
                'y': 110643
              },
              {
                'x': 'css',
                'y': 27350
              },
              {
                'x': 'png',
                'y': 16648
              },
              {
                'x': 'gif',
                'y': 11257
              },
              {
                'x': 'php',
                'y': 5440
              }
            ]
          }
        ]
      },
      {
        'label': '2014.11.11: index',
        'xAxisLabel': 'Top 5 extension',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'jpg',
                'y': 67
              },
              {
                'x': 'css',
                'y': 26
              },
              {
                'x': 'png',
                'y': 16
              },
              {
                'x': 'gif',
                'y': 7
              },
              {
                'x': 'php',
                'y': 8
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
              'field': 'index',
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
                'editor': '<div class=\'vis-editor-agg-form-row\'>\n  ' +
                '<div ng-if=\'aggType.params.byName.order\' ' +
                'class=\'form-group\'>\n    <label>Order</label>\n    ' +
                '<select\n      name=\'order\'\n      ' +
                'ng-model=\'params.order\'\n      required\n      ' +
                'ng-options=\'opt as opt.display for opt in aggParam.options\'\n      ' +
                'class=\'form-control\'>\n    </select>\n  </div>\n  ' +
                '<div class=\'form-group\'>\n    <label>Size</label>\n    ' +
                '<input\n      name=\'size\'\n      ng-model=\'params.size\'\n      ' +
                'required\n      class=\'form-control\'\n      type=\'number\'\n      ' +
                'min=\'0\'\n      >\n  </div>\n</div>',
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
            'name': 'index',
            'count': 0
          },
          'label': 'Top 5 index',
          'params': {
            'row': false,
            'field': 'index',
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
            'type': 'terms',
            'schema': 'segment',
            'params': {
              'field': 'extension',
              'size': 5,
              'order': 'desc'
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
                'editor': '<div class=\'vis-editor-agg-form-row\'>\n  ' +
                '<div ng-if=\'aggType.params.byName.order\' ' +
                'class=\'form-group\'>\n    <label>Order</label>\n    ' +
                '<select\n      name=\'order\'\n      ' +
                'ng-model=\'params.order\'\n      required\n      ' +
                'ng-options=\'opt as opt.display for opt in aggParam.options\'\n      ' +
                'class=\'form-control\'>\n    </select>\n  </div>\n  ' +
                '<div class=\'form-group\'>\n    <label>Size</label>\n    ' +
                '<input\n      name=\'size\'\n      ng-model=\'params.size\'\n      ' +
                'required\n      class=\'form-control\'\n      type=\'number\'\n      ' +
                'min=\'0\'\n      >\n  </div>\n</div>',
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
            'name': 'extension',
            'count': 0
          },
          'label': 'Top 5 extension',
          'params': {
            'field': 'extension',
            'size': 5,
            'order': {
              '_count': 'desc'
            }
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
          'logstash',
          'jpg',
          110710
        ],
        [
          'logstash',
          'css',
          27376
        ],
        [
          'logstash',
          'png',
          16664
        ],
        [
          'logstash',
          'gif',
          11264
        ],
        [
          'logstash',
          'php',
          5448
        ],
        [
          '2014.11.12',
          'jpg',
          110643
        ],
        [
          '2014.11.12',
          'css',
          27350
        ],
        [
          '2014.11.12',
          'png',
          16648
        ],
        [
          '2014.11.12',
          'gif',
          11257
        ],
        [
          '2014.11.12',
          'php',
          5440
        ],
        [
          '2014.11.11',
          'jpg',
          67
        ],
        [
          '2014.11.11',
          'css',
          26
        ],
        [
          '2014.11.11',
          'png',
          16
        ],
        [
          '2014.11.11',
          'gif',
          7
        ],
        [
          '2014.11.11',
          'php',
          8
        ]
      ]
    },
    'hits': 171462,
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
