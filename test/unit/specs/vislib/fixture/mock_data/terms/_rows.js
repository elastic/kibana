define(function (require) {
  var _ = require('lodash');

  return {
    'rows': [
      {
        'label': '0.0-1000.0: bytes',
        'xAxisLabel': 'Top 5 extension',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'jpg',
                'y': 3378
              },
              {
                'x': 'css',
                'y': 762
              },
              {
                'x': 'png',
                'y': 527
              },
              {
                'x': 'gif',
                'y': 11258
              },
              {
                'x': 'php',
                'y': 653
              }
            ]
          }
        ]
      },
      {
        'label': '1000.0-2000.0: bytes',
        'xAxisLabel': 'Top 5 extension',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 'jpg',
                'y': 6422
              },
              {
                'x': 'css',
                'y': 1591
              },
              {
                'x': 'png',
                'y': 430
              },
              {
                'x': 'gif',
                'y': 8
              },
              {
                'x': 'php',
                'y': 561
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
          'id': 'agg_17',
          'aggConfig': {
            'type': 'range',
            'schema': 'split',
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
              'row': true
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
                '<tr>\n    <th>\n      <label>From</label>\n    </th>\n    ' +
                '<th colspan=\'2\'>\n      <label>To</label>\n    </th>\n  ' +
                '</tr>\n\n  <tr\n    ng-repeat=\'range in params.ranges track ' +
                'by $index\'>\n    <td>\n      <input\n        ' +
                'ng-model=\'range.from\'\n        type=\'number\'\n        ' +
                'class=\'form-control\'\n        name=\'range.from\' />\n    ' +
                '</td>\n    <td>\n      <input\n        ' +
                'ng-model=\'range.to\'\n        type=\'number\'\n        ' +
                'class=\'form-control\'\n        ' +
                'name=\'range.to\' />\n    </td>\n    <td>\n      ' +
                '<button ng-click=\'params.ranges.splice($index, 1)\'\n        ' +
                'class=\'btn btn-danger btn-xs\'>\n        ' +
                '<i class=\'fa fa-ban\' ></i>\n      </button>\n    </td>\n  ' +
                '</tr>\n</table>\n\n<div\n  ng-click=\'params.ranges.push({})\'\n  ' +
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
            'row': true,
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
          'categoryName': 'segment',
          'id': 'agg_16',
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
                'ng-options=\'opt as opt.display for opt in ' +
                'aggParam.options\'\n      class=\'form-control\'>\n    ' +
                '</select>\n  </div>\n  <div class=\'form-group\'>\n    ' +
                '<label>Size</label>\n    <input\n      name=\'size\'\n      ' +
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
          'id': 'agg_15',
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
          '0.0-1000.0',
          'jpg',
          3378
        ],
        [
          '0.0-1000.0',
          'css',
          762
        ],
        [
          '0.0-1000.0',
          'png',
          527
        ],
        [
          '0.0-1000.0',
          'gif',
          11258
        ],
        [
          '0.0-1000.0',
          'php',
          653
        ],
        [
          '1000.0-2000.0',
          'jpg',
          6422
        ],
        [
          '1000.0-2000.0',
          'css',
          1591
        ],
        [
          '1000.0-2000.0',
          'png',
          430
        ],
        [
          '1000.0-2000.0',
          'gif',
          8
        ],
        [
          '1000.0-2000.0',
          'php',
          561
        ]
      ]
    },
    'hits': 171458,
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
