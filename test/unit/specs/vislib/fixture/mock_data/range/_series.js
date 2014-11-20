define(function (require) {
  var _ = require('lodash');

  return {
    'label': '',
    'xAxisLabel': 'bytes ranges',
    'yAxisLabel': 'Count of documents',
    'series': [
      {
        'values': [
          {
            'x': '0.0-1000.0',
            'y': 16576
          },
          {
            'x': '1000.0-2000.0',
            'y': 9005
          }
        ]
      }
    ],
    'raw': {
      'splitColumns': [],
      'splitValStack': [],
      'columns': [
        {
          'categoryName': 'segment',
          'id': 'agg_15',
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
                'editor': '<table ' +
                'class=\'vis-editor-agg-editor-ranges form-group\'>\n  ' +
                '<tr>\n    <th>\n      <label>From</label>\n    </th>\n    ' +
                '<th colspan=\'2\'>\n      <label>To</label>\n    </th>\n  ' +
                '</tr>\n\n  <tr\n    ' +
                'ng-repeat=\'range in params.ranges track by $index\'>\n    ' +
                '<td>\n      <input\n        ng-model=\'range.from\'\n        ' +
                'type=\'number\'\n        class=\'form-control\'\n        ' +
                'name=\'range.from\' />\n    </td>\n    <td>\n      ' +
                '<input\n        ng-model=\'range.to\'\n        ' +
                'type=\'number\'\n        class=\'form-control\'\n        ' +
                'name=\'range.to\' />\n    </td>\n    <td>\n      ' +
                '<button ng-click=\'params.ranges.splice($index, 1)\'\n        ' +
                'class=\'btn btn-danger btn-xs\'>\n        ' +
                '<i class=\'fa fa-ban\' ></i>\n      </button>\n    ' +
                '</td>\n  </tr>\n</table>\n\n<div\n  ' +
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
          'id': 'agg_14',
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
          16576
        ],
        [
          '1000.0-2000.0',
          9005
        ]
      ]
    },
    'hits': 171500,
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
