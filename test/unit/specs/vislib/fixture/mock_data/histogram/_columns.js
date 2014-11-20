define(function (require) {
  var _ = require('lodash');

  return {
    'columns': [
      {
        'label': '404: response',
        'xAxisLabel': 'machine.ram',
        'ordered': {
          'interval': 100
        },
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 2147483600,
                'y': 1,
                'y0': 0
              },
              {
                'x': 3221225400,
                'y': 0,
                'y0': 0
              },
              {
                'x': 4294967200,
                'y': 0,
                'y0': 0
              },
              {
                'x': 5368709100,
                'y': 0,
                'y0': 0
              },
              {
                'x': 6442450900,
                'y': 0,
                'y0': 0
              },
              {
                'x': 7516192700,
                'y': 0,
                'y0': 0
              },
              {
                'x': 8589934500,
                'y': 0,
                'y0': 0
              },
              {
                'x': 10737418200,
                'y': 0,
                'y0': 0
              },
              {
                'x': 11811160000,
                'y': 0,
                'y0': 0
              },
              {
                'x': 12884901800,
                'y': 1,
                'y0': 0
              },
              {
                'x': 13958643700,
                'y': 0,
                'y0': 0
              },
              {
                'x': 15032385500,
                'y': 0,
                'y0': 0
              },
              {
                'x': 16106127300,
                'y': 0,
                'y0': 0
              },
              {
                'x': 18253611000,
                'y': 0,
                'y0': 0
              },
              {
                'x': 19327352800,
                'y': 0,
                'y0': 0
              },
              {
                'x': 20401094600,
                'y': 0,
                'y0': 0
              },
              {
                'x': 21474836400,
                'y': 0,
                'y0': 0
              }
            ]
          }
        ]
      },
      {
        'label': '200: response',
        'xAxisLabel': 'machine.ram',
        'ordered': {
          'interval': 100
        },
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 2147483600,
                'y': 0,
                'y0': 0
              },
              {
                'x': 3221225400,
                'y': 2,
                'y0': 0
              },
              {
                'x': 4294967200,
                'y': 3,
                'y0': 0
              },
              {
                'x': 5368709100,
                'y': 3,
                'y0': 0
              },
              {
                'x': 6442450900,
                'y': 1,
                'y0': 0
              },
              {
                'x': 7516192700,
                'y': 1,
                'y0': 0
              },
              {
                'x': 8589934500,
                'y': 4,
                'y0': 0
              },
              {
                'x': 10737418200,
                'y': 0,
                'y0': 0
              },
              {
                'x': 11811160000,
                'y': 1,
                'y0': 0
              },
              {
                'x': 12884901800,
                'y': 1,
                'y0': 0
              },
              {
                'x': 13958643700,
                'y': 1,
                'y0': 0
              },
              {
                'x': 15032385500,
                'y': 2,
                'y0': 0
              },
              {
                'x': 16106127300,
                'y': 3,
                'y0': 0
              },
              {
                'x': 18253611000,
                'y': 4,
                'y0': 0
              },
              {
                'x': 19327352800,
                'y': 5,
                'y0': 0
              },
              {
                'x': 20401094600,
                'y': 2,
                'y0': 0
              },
              {
                'x': 21474836400,
                'y': 2,
                'y0': 0
              }
            ]
          }
        ]
      },
      {
        'label': '503: response',
        'xAxisLabel': 'machine.ram',
        'ordered': {
          'interval': 100
        },
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 2147483600,
                'y': 0,
                'y0': 0
              },
              {
                'x': 3221225400,
                'y': 0,
                'y0': 0
              },
              {
                'x': 4294967200,
                'y': 0,
                'y0': 0
              },
              {
                'x': 5368709100,
                'y': 0,
                'y0': 0
              },
              {
                'x': 6442450900,
                'y': 0,
                'y0': 0
              },
              {
                'x': 7516192700,
                'y': 0,
                'y0': 0
              },
              {
                'x': 8589934500,
                'y': 0,
                'y0': 0
              },
              {
                'x': 10737418200,
                'y': 1,
                'y0': 0
              },
              {
                'x': 11811160000,
                'y': 0,
                'y0': 0
              },
              {
                'x': 12884901800,
                'y': 0,
                'y0': 0
              },
              {
                'x': 13958643700,
                'y': 0,
                'y0': 0
              },
              {
                'x': 15032385500,
                'y': 0,
                'y0': 0
              },
              {
                'x': 16106127300,
                'y': 0,
                'y0': 0
              },
              {
                'x': 18253611000,
                'y': 0,
                'y0': 0
              },
              {
                'x': 19327352800,
                'y': 0,
                'y0': 0
              },
              {
                'x': 20401094600,
                'y': 0,
                'y0': 0
              },
              {
                'x': 21474836400,
                'y': 0,
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
              'field': 'response',
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
                '<div ng-if=\'aggType.params.byName.order\' class=\'form-group\'>\n    ' +
                '<label>Order</label>\n    <select\n      name=\'order\'\n      ' +
                'ng-model=\'params.order\'\n      required\n      ' +
                'ng-options=\'opt as opt.display for opt in aggParam.options\'\n      ' +
                'class=\'form-control\'>\n    </select>\n  </div>\n  ' +
                '<div class=\'form-group\'>\n    <label>Size</label>\n    <input\n      ' +
                'name=\'size\'\n      ng-model=\'params.size\'\n      required\n      ' +
                'class=\'form-control\'\n      type=\'number\'\n      min=\'0\'\n      ' +
                '>\n  </div>\n</div>',
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
            'row': false,
            'field': 'response',
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
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'machine.ram',
              'interval': 100,
              'extended_bounds': {}
            }
          },
          'aggType': {
            'name': 'histogram',
            'title': 'Histogram',
            'ordered': {},
            'hasNoDsl': false,
            'params': [
              {
                'name': 'field',
                'filterFieldTypes': 'number'
              },
              {
                'name': 'interval',
                'editor': '<div class=\'form-group\'>\n  <label>Interval</label>\n  ' +
                '<select\n    ng-if=\'aggParam.options\'\n    ng-model=\'params.interval\'\n    ' +
                'required\n    ' +
                'ng-options=\'opt as opt.display for opt in aggParam.options.raw | ' +
                'filter:optionEnabled\'\n    class=\'form-control\'\n    name=\'interval\'>\n    ' +
                '<option value=\'\'>-- select a valid interval --</option>\n  </select>\n  ' +
                '<input\n    ng-if=\'!aggParam.options\'\n    ng-model=\'params.interval\'\n    ' +
                'required\n    type=\'number\'\n    class=\'form-control\'\n    name=\'interval\'\n    min=\'0\'\n    >\n</div>\n'
              },
              {
                'name': 'min_doc_count',
                'default': null,
                'editor': '<div class=\'checkbox ng-scope\'>\n  <label>\n    ' +
                '<input ng-model=\'params.min_doc_count\' type=\'checkbox\'>\n    ' +
                'Show empty buckets&nbsp;\n    <kbn-info\n      ' +
                'info=\'Show all buckets, not only the buckets with results.\'\n      ' +
                'placement=\'right\'>\n      </kbn-info>\n  </label>\n</div>'
              },
              {
                'name': 'extended_bounds',
                'default': {},
                'editor': '<div ng-if=\'aggParam.shouldShow(aggConfig)\' ' +
                'class=\'vis-editor-agg-form-row\'>\n  <div class=\'form-group\'>\n    ' +
                '<label>Min <small>(optional)</small></label>\n    <input\n      ' +
                'ng-model=\'params.extended_bounds.min\'\n      type=\'number\'\n      ' +
                'class=\'form-control\'\n      name=\'extended_bounds.min\' />\n  ' +
                '</div>\n  <div class=\'form-group\'>\n    <label>Max ' +
                '<small>(optional)</small></label>\n    <input\n      ' +
                'ng-model=\'params.extended_bounds.max\'\n      type=\'number\'\n      ' +
                'class=\'form-control\'\n      name=\'extended_bounds.max\' />\n  </div>\n</div>'
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
            'name': 'machine.ram',
            'count': 0
          },
          'label': 'machine.ram',
          'params': {
            'field': 'machine.ram',
            'interval': 100
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
          '404',
          2147483600,
          1
        ],
        [
          '404',
          12884901800,
          1
        ],
        [
          '200',
          3221225400,
          2
        ],
        [
          '200',
          4294967200,
          3
        ],
        [
          '200',
          5368709100,
          3
        ],
        [
          '200',
          6442450900,
          1
        ],
        [
          '200',
          7516192700,
          1
        ],
        [
          '200',
          8589934500,
          4
        ],
        [
          '200',
          11811160000,
          1
        ],
        [
          '200',
          12884901800,
          1
        ],
        [
          '200',
          13958643700,
          1
        ],
        [
          '200',
          15032385500,
          2
        ],
        [
          '200',
          16106127300,
          3
        ],
        [
          '200',
          18253611000,
          4
        ],
        [
          '200',
          19327352800,
          5
        ],
        [
          '200',
          20401094600,
          2
        ],
        [
          '200',
          21474836400,
          2
        ],
        [
          '503',
          10737418200,
          1
        ]
      ]
    },
    'hits': 40,
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
