define(function (require) {
  var _ = require('lodash');

  return {
    'rows': [
      {
        'label': 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1: agent.raw',
        'xAxisLabel': 'bytes ranges',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': '0.0-1000.0',
                'y': 6422,
                'y0': 0
              },
              {
                'x': '1000.0-2000.0',
                'y': 3446,
                'y0': 0
              }
            ]
          }
        ]
      },
      {
        'label': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24: agent.raw',
        'xAxisLabel': 'bytes ranges',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': '0.0-1000.0',
                'y': 5430,
                'y0': 0
              },
              {
                'x': '1000.0-2000.0',
                'y': 3010,
                'y0': 0
              }
            ]
          }
        ]
      },
      {
        'label': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322): agent.raw',
        'xAxisLabel': 'bytes ranges',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': '0.0-1000.0',
                'y': 4735,
                'y0': 0
              },
              {
                'x': '1000.0-2000.0',
                'y': 2542,
                'y0': 0
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
                '<div ng-if=\'aggType.params.byName.order\' class=\'form-group\'>\n    ' +
                '<label>Order</label>\n    <select\n      name=\'order\'\n      ' +
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
            'analyzed': false,
            'doc_values': false,
            'name': 'agent.raw',
            'count': 0
          },
          'label': 'Top 5 agent.raw',
          'params': {
            'row': true,
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
            'type': 'range',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'ranges': [
                {
                  'from': 0,
                  'to': 1000
                },
                {
                  'from': 1000,
                  'to': 2000
                }
              ]
            }
          },
          'aggType': {
            'name': 'range',
            'title': 'Range',
            'hasNoDsl': false,
            'params': [
              {
                'name': 'field',
                'filterFieldTypes': [
                  'number'
                ]
              },
              {
                'name': 'ranges',
                'default': [
                  {
                    'from': 0,
                    'to': 1000
                  },
                  {
                    'from': 1000,
                    'to': 2000
                  }
                ],
                'editor': '<table class=\'vis-editor-agg-editor-ranges form-group\'>\n  ' +
                '<tr>\n    <th>\n      <label>From</label>\n    </th>\n    <th colspan=\'2\'>\n      ' +
                '<label>To</label>\n    </th>\n  </tr>\n\n  <tr\n    ' +
                'ng-repeat=\'range in params.ranges track by $index\'>\n    ' +
                '<td>\n      <input\n        ng-model=\'range.from\'\n        ' +
                'type=\'number\'\n        class=\'form-control\'\n        ' +
                'name=\'range.from\' />\n    </td>\n    <td>\n      <input\n        ' +
                'ng-model=\'range.to\'\n        type=\'number\'\n        ' +
                'class=\'form-control\'\n        name=\'range.to\' />\n    ' +
                '</td>\n    <td>\n      <button ng-click=\'params.ranges.splice($index, 1)\'\n        ' +
                'class=\'btn btn-danger btn-xs\'>\n        <i class=\'fa fa-ban\' ></i>\n      ' +
                '</button>\n    </td>\n  </tr>\n</table>\n\n<div\n  ' +
                'ng-click=\'params.ranges.push({})\'\n  ' +
                'class=\'sidebar-item-button primary\'>\n  Add Range\n</div>\n'
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
            'type': 'number',
            'indexed': true,
            'analyzed': false,
            'doc_values': false,
            'name': 'bytes',
            'count': 0
          },
          'label': 'bytes ranges',
          'params': {
            'field': 'bytes',
            'ranges': [
              {
                'from': 0,
                'to': 1000
              },
              {
                'from': 1000,
                'to': 2000
              }
            ],
            'keyed': true
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
          '0.0-1000.0',
          6422
        ],
        [
          'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
          '1000.0-2000.0',
          3446
        ],
        [
          'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
          '0.0-1000.0',
          5430
        ],
        [
          'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
          '1000.0-2000.0',
          3010
        ],
        [
          'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
          '0.0-1000.0',
          4735
        ],
        [
          'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
          '1000.0-2000.0',
          2542
        ]
      ]
    },
    'hits': 171501,
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
