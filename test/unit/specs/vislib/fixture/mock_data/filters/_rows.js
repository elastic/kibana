define(function (require) {
  var _ = require('lodash');

  return {
    'rows': [
      {
        'label': '200: response',
        'xAxisLabel': 'filters',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'css',
                'y': 25260
              },
              {
                'x': 'png',
                'y': 15311
              }
            ]
          }
        ]
      },
      {
        'label': '404: response',
        'xAxisLabel': 'filters',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'css',
                'y': 1352
              },
              {
                'x': 'png',
                'y': 826
              }
            ]
          }
        ]
      },
      {
        'label': '503: response',
        'xAxisLabel': 'filters',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'css',
                'y': 761
              },
              {
                'x': 'png',
                'y': 527
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
          'id': 'agg_32',
          'aggConfig': {
            'type': 'terms',
            'schema': 'split',
            'params': {
              'field': 'response',
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
                'editor': '<div class=\'vis-editor-agg-form-row\'>\n  ' +
                '<div ng-if=\'aggType.params.byName.order\' ' +
                'class=\'form-group\'>\n    <label>Order</label>\n    ' +
                '<select\n      name=\'order\'\n      ' +
                'ng-model=\'params.order\'\n      required\n      ' +
                'ng-options=\'opt as opt.display for opt in aggParam.options\'\n      ' +
                'class=\'form-control\'>\n    </select>\n  </div>\n  ' +
                '<div class=\'form-group\'>\n    <label>Size</label>\n    ' +
                '<input\n      name=\'size\'\n      ' +
                'ng-model=\'params.size\'\n      required\n      ' +
                'class=\'form-control\'\n      type=\'number\'\n      ' +
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
            'name': 'response',
            'count': 0
          },
          'label': 'Top 5 response',
          'params': {
            'row': true,
            'field': 'response',
            'size': 5,
            'order': {
              '_count': 'desc'
            }
          }
        },
        {
          'categoryName': 'segment',
          'id': 'agg_31',
          'aggConfig': {
            'type': 'filters',
            'schema': 'segment',
            'params': {
              'filters': [
                {
                  'input': {
                    'query': {
                      'query_string': {
                        'query': 'css'
                      }
                    }
                  },
                  '$$hashKey': '04M'
                },
                {
                  'input': {
                    'query': {
                      'query_string': {
                        'query': 'html'
                      }
                    }
                  },
                  '$$hashKey': '051'
                },
                {
                  'input': {
                    'query': {
                      'query_string': {
                        'query': 'png'
                      }
                    }
                  },
                  '$$hashKey': '054'
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
          'id': 'agg_30',
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
          '200',
          'css',
          25260
        ],
        [
          '200',
          'png',
          15311
        ],
        [
          '404',
          'css',
          1352
        ],
        [
          '404',
          'png',
          826
        ],
        [
          '503',
          'css',
          761
        ],
        [
          '503',
          'png',
          527
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
