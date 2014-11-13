define(function (require) {
  var moment = require('moment');

  return {
    'columns': [
      {
        'label': '200: response',
        'xAxisLabel': '@timestamp per 30 sec',
        'ordered': {
          'date': true,
          'interval': 30000,
          'min': 1415826608440,
          'max': 1415827508440
        },
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 1415826600000,
                'y': 4
              },
              {
                'x': 1415826630000,
                'y': 8
              },
              {
                'x': 1415826660000,
                'y': 7
              },
              {
                'x': 1415826690000,
                'y': 5
              },
              {
                'x': 1415826720000,
                'y': 5
              },
              {
                'x': 1415826750000,
                'y': 4
              },
              {
                'x': 1415826780000,
                'y': 10
              },
              {
                'x': 1415826810000,
                'y': 7
              },
              {
                'x': 1415826840000,
                'y': 9
              },
              {
                'x': 1415826870000,
                'y': 8
              },
              {
                'x': 1415826900000,
                'y': 9
              },
              {
                'x': 1415826930000,
                'y': 8
              },
              {
                'x': 1415826960000,
                'y': 3
              },
              {
                'x': 1415826990000,
                'y': 9
              },
              {
                'x': 1415827020000,
                'y': 6
              },
              {
                'x': 1415827050000,
                'y': 8
              },
              {
                'x': 1415827080000,
                'y': 7
              },
              {
                'x': 1415827110000,
                'y': 4
              },
              {
                'x': 1415827140000,
                'y': 6
              },
              {
                'x': 1415827170000,
                'y': 10
              },
              {
                'x': 1415827200000,
                'y': 2
              },
              {
                'x': 1415827230000,
                'y': 8
              },
              {
                'x': 1415827260000,
                'y': 5
              },
              {
                'x': 1415827290000,
                'y': 6
              },
              {
                'x': 1415827320000,
                'y': 6
              },
              {
                'x': 1415827350000,
                'y': 10
              },
              {
                'x': 1415827380000,
                'y': 6
              },
              {
                'x': 1415827410000,
                'y': 6
              },
              {
                'x': 1415827440000,
                'y': 12
              },
              {
                'x': 1415827470000,
                'y': 9
              },
              {
                'x': 1415827500000,
                'y': 1
              }
            ]
          }
        ]
      },
      {
        'label': '503: response',
        'xAxisLabel': '@timestamp per 30 sec',
        'ordered': {
          'date': true,
          'interval': 30000,
          'min': 1415826608440,
          'max': 1415827508440
        },
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 1415826630000,
                'y': 1
              },
              {
                'x': 1415826660000,
                'y': 1
              },
              {
                'x': 1415826720000,
                'y': 1
              },
              {
                'x': 1415826780000,
                'y': 1
              },
              {
                'x': 1415826900000,
                'y': 1
              },
              {
                'x': 1415827020000,
                'y': 1
              },
              {
                'x': 1415827080000,
                'y': 1
              },
              {
                'x': 1415827110000,
                'y': 2
              }
            ]
          }
        ]
      },
      {
        'label': '404: response',
        'xAxisLabel': '@timestamp per 30 sec',
        'ordered': {
          'date': true,
          'interval': 30000,
          'min': 1415826608440,
          'max': 1415827508440
        },
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': 1415826660000,
                'y': 1
              },
              {
                'x': 1415826720000,
                'y': 1
              },
              {
                'x': 1415826810000,
                'y': 1
              },
              {
                'x': 1415826960000,
                'y': 1
              },
              {
                'x': 1415827050000,
                'y': 1
              },
              {
                'x': 1415827260000,
                'y': 1
              },
              {
                'x': 1415827380000,
                'y': 1
              },
              {
                'x': 1415827410000,
                'y': 1
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
          'id': 'agg_24',
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
          'id': 'agg_23',
          'aggConfig': {
            'type': 'date_histogram',
            'schema': 'segment',
            'params': {
              'field': '@timestamp',
              'interval': 'auto',
              'min_doc_count': 1,
              'extended_bounds': {}
            }
          },
          'aggType': {
            'name': 'date_histogram',
            'title': 'Date Histogram',
            'ordered': {
              'date': true
            },
            'hasNoDsl': false,
            'params': [
              {
                'name': 'field',
                'filterFieldTypes': 'date'
              },
              {
                'name': 'interval',
                'type': 'optioned',
                'default': 'auto',
                'options': [
                  {
                    'display': 'Auto',
                    'val': 'auto'
                  },
                  {
                    'display': 'Second',
                    'val': 'second',
                    'ms': 1000
                  },
                  {
                    'display': 'Minute',
                    'val': 'minute',
                    'ms': 60000
                  },
                  {
                    'display': 'Hourly',
                    'val': 'hour',
                    'ms': 3600000
                  },
                  {
                    'display': 'Daily',
                    'val': 'day',
                    'ms': 86400000
                  },
                  {
                    'display': 'Weekly',
                    'val': 'week',
                    'ms': 604800000
                  },
                  {
                    'display': 'Monthly',
                    'val': 'month',
                    'ms': 2592000000
                  },
                  {
                    'display': 'Yearly',
                    'val': 'year',
                    'ms': 31536000000
                  }
                ],
                'editor': '<div class=\'form-group\'>\n  <label>Interval</label>\n  ' +
                '<select\n    ng-if=\'aggParam.options\'\n    ng-model=\'params.interval\'\n    ' +
                'required\n    ng-options=\'opt as opt.display for opt in ' +
                'aggParam.options.raw | filter:optionEnabled\'\n    ' +
                'class=\'form-control\'\n    name=\'interval\'>\n    ' +
                '<option value=\'\'>-- select a valid interval --</option>\n  ' +
                '</select>\n  <input\n    ng-if=\'!aggParam.options\'\n    ' +
                'ng-model=\'params.interval\'\n    required\n    ' +
                'type=\'number\'\n    class=\'form-control\'\n    ' +
                'name=\'interval\'\n    min=\'0\'\n    >\n</div>\n'
              },
              {
                'name': 'format'
              },
              {
                'name': 'min_doc_count',
                'default': 1
              },
              {
                'name': 'extended_bounds',
                'default': {}
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
            'type': 'date',
            'indexed': true,
            'analyzed': false,
            'doc_values': false,
            'name': '@timestamp',
            'count': 0
          },
          'label': '@timestamp per 30 sec',
          'params': {
            'field': '@timestamp',
            'interval': '30000ms',
            'min_doc_count': 1,
            'extended_bounds': {
              'min': '2014-11-12T21:10:08.439Z',
              'max': '2014-11-12T21:25:08.439Z'
            }
          },
          'metricScaleText': '30 sec'
        },
        {
          'categoryName': 'metric',
          'id': 'agg_22',
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
          1415826600000,
          4
        ],
        [
          '200',
          1415826630000,
          8
        ],
        [
          '200',
          1415826660000,
          7
        ],
        [
          '200',
          1415826690000,
          5
        ],
        [
          '200',
          1415826720000,
          5
        ],
        [
          '200',
          1415826750000,
          4
        ],
        [
          '200',
          1415826780000,
          10
        ],
        [
          '200',
          1415826810000,
          7
        ],
        [
          '200',
          1415826840000,
          9
        ],
        [
          '200',
          1415826870000,
          8
        ],
        [
          '200',
          1415826900000,
          9
        ],
        [
          '200',
          1415826930000,
          8
        ],
        [
          '200',
          1415826960000,
          3
        ],
        [
          '200',
          1415826990000,
          9
        ],
        [
          '200',
          1415827020000,
          6
        ],
        [
          '200',
          1415827050000,
          8
        ],
        [
          '200',
          1415827080000,
          7
        ],
        [
          '200',
          1415827110000,
          4
        ],
        [
          '200',
          1415827140000,
          6
        ],
        [
          '200',
          1415827170000,
          10
        ],
        [
          '200',
          1415827200000,
          2
        ],
        [
          '200',
          1415827230000,
          8
        ],
        [
          '200',
          1415827260000,
          5
        ],
        [
          '200',
          1415827290000,
          6
        ],
        [
          '200',
          1415827320000,
          6
        ],
        [
          '200',
          1415827350000,
          10
        ],
        [
          '200',
          1415827380000,
          6
        ],
        [
          '200',
          1415827410000,
          6
        ],
        [
          '200',
          1415827440000,
          12
        ],
        [
          '200',
          1415827470000,
          9
        ],
        [
          '200',
          1415827500000,
          1
        ],
        [
          '503',
          1415826630000,
          1
        ],
        [
          '503',
          1415826660000,
          1
        ],
        [
          '503',
          1415826720000,
          1
        ],
        [
          '503',
          1415826780000,
          1
        ],
        [
          '503',
          1415826900000,
          1
        ],
        [
          '503',
          1415827020000,
          1
        ],
        [
          '503',
          1415827080000,
          1
        ],
        [
          '503',
          1415827110000,
          2
        ],
        [
          '404',
          1415826660000,
          1
        ],
        [
          '404',
          1415826720000,
          1
        ],
        [
          '404',
          1415826810000,
          1
        ],
        [
          '404',
          1415826960000,
          1
        ],
        [
          '404',
          1415827050000,
          1
        ],
        [
          '404',
          1415827260000,
          1
        ],
        [
          '404',
          1415827380000,
          1
        ],
        [
          '404',
          1415827410000,
          1
        ]
      ]
    },
    'hits': 225,
    'xAxisFormatter': function (thing) {
      return moment(thing);
    },
    'tooltipFormatter': function (d) {
      return d;
    }
  };
});
