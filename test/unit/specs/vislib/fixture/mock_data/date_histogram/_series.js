define(function (require) {
  var moment = require('moment');

  return {
    'label': '',
    'xAxisLabel': '@timestamp per 30 sec',
    'ordered': {
      'date': true,
      'min': 1411761457636,
      'max': 1411762357636,
      'interval': 30000
    },
    'yAxisLabel': 'Count of documents',
    'series': [
      {
        'values': [
          {
            'x': 1411761450000,
            'y': 21
          },
          {
            'x': 1411761480000,
            'y': 18
          },
          {
            'x': 1411761510000,
            'y': 22
          },
          {
            'x': 1411761540000,
            'y': 17
          },
          {
            'x': 1411761570000,
            'y': 17
          },
          {
            'x': 1411761600000,
            'y': 21
          },
          {
            'x': 1411761630000,
            'y': 16
          },
          {
            'x': 1411761660000,
            'y': 17
          },
          {
            'x': 1411761690000,
            'y': 15
          },
          {
            'x': 1411761720000,
            'y': 19
          },
          {
            'x': 1411761750000,
            'y': 11
          },
          {
            'x': 1411761780000,
            'y': 13
          },
          {
            'x': 1411761810000,
            'y': 24
          },
          {
            'x': 1411761840000,
            'y': 20
          },
          {
            'x': 1411761870000,
            'y': 20
          },
          {
            'x': 1411761900000,
            'y': 21
          },
          {
            'x': 1411761930000,
            'y': 17
          },
          {
            'x': 1411761960000,
            'y': 20
          },
          {
            'x': 1411761990000,
            'y': 13
          },
          {
            'x': 1411762020000,
            'y': 14
          },
          {
            'x': 1411762050000,
            'y': 25
          },
          {
            'x': 1411762080000,
            'y': 17
          },
          {
            'x': 1411762110000,
            'y': 14
          },
          {
            'x': 1411762140000,
            'y': 22
          },
          {
            'x': 1411762170000,
            'y': 14
          },
          {
            'x': 1411762200000,
            'y': 19
          },
          {
            'x': 1411762230000,
            'y': 22
          },
          {
            'x': 1411762260000,
            'y': 17
          },
          {
            'x': 1411762290000,
            'y': 8
          },
          {
            'x': 1411762320000,
            'y': 15
          },
          {
            'x': 1411762350000,
            'y': 4
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
          'id': 'agg_12',
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
                'editor': '<div class=\'form-group\'>\n  <label>Interval</label>\n  <select\n    ' +
                  'ng-if=\'aggParam.options\'\n    ng-model=\'params.interval\'\n    required\n    ' +
                  'ng-options=\'opt as opt.display for opt in aggParam.options\'\n    class=\'form-control\'\n    ' +
                  'name=\'interval\'>\n  </select>\n  <input\n    ng-if=\'!aggParam.options\'\n    ' +
                  'ng-model=\'params.interval\'\n    required\n    type=\'number\'\n    class=\'form-control\'\n    ' +
                  'name=\'interval\' />\n</div>\n'
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
              'min': '2014-09-26T19:57:37.633Z',
              'max': '2014-09-26T20:12:37.633Z'
            }
          },
          'metricScaleText': '30 sec'
        },
        {
          'categoryName': 'metric',
          'id': 'agg_11',
          'aggConfig': {
            'type': 'count',
            'schema': 'metric',
            'params': {}
          },
          'aggType': {
            'name': 'count',
            'title': 'Count',
            'hasNoDsl': true,
            'params': [],
            'type': 'metrics'
          },
          'label': 'Count of documents',
          'params': {}
        }
      ],
      'rows': [
        [
          1411761450000,
          21
        ],
        [
          1411761480000,
          18
        ],
        [
          1411761510000,
          22
        ],
        [
          1411761540000,
          17
        ],
        [
          1411761570000,
          17
        ],
        [
          1411761600000,
          21
        ],
        [
          1411761630000,
          16
        ],
        [
          1411761660000,
          17
        ],
        [
          1411761690000,
          15
        ],
        [
          1411761720000,
          19
        ],
        [
          1411761750000,
          11
        ],
        [
          1411761780000,
          13
        ],
        [
          1411761810000,
          24
        ],
        [
          1411761840000,
          20
        ],
        [
          1411761870000,
          20
        ],
        [
          1411761900000,
          21
        ],
        [
          1411761930000,
          17
        ],
        [
          1411761960000,
          20
        ],
        [
          1411761990000,
          13
        ],
        [
          1411762020000,
          14
        ],
        [
          1411762050000,
          25
        ],
        [
          1411762080000,
          17
        ],
        [
          1411762110000,
          14
        ],
        [
          1411762140000,
          22
        ],
        [
          1411762170000,
          14
        ],
        [
          1411762200000,
          19
        ],
        [
          1411762230000,
          22
        ],
        [
          1411762260000,
          17
        ],
        [
          1411762290000,
          8
        ],
        [
          1411762320000,
          15
        ],
        [
          1411762350000,
          4
        ]
      ]
    },
    'hits': 533,
    'xAxisFormatter': function (thing) {
      return moment(thing);
    },
    'tooltipFormatter': function (d) {
      return d;
    }
  };
});
