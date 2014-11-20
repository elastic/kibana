define(function (require) {
  var _ = require('lodash');

  return {
    'label': '',
    'xAxisLabel': 'machine.ram',
    'ordered': {
      'interval': 100
    },
    'yAxisLabel': 'Count of documents',
    'series': [
      {
        'values': [
          {
            'x': 3221225400,
            'y': 5
          },
          {
            'x': 4294967200,
            'y': 2
          },
          {
            'x': 5368709100,
            'y': 5
          },
          {
            'x': 6442450900,
            'y': 4
          },
          {
            'x': 7516192700,
            'y': 1
          },
          {
            'x': 9663676400,
            'y': 9
          },
          {
            'x': 10737418200,
            'y': 5
          },
          {
            'x': 11811160000,
            'y': 5
          },
          {
            'x': 12884901800,
            'y': 2
          },
          {
            'x': 13958643700,
            'y': 3
          },
          {
            'x': 15032385500,
            'y': 3
          },
          {
            'x': 16106127300,
            'y': 3
          },
          {
            'x': 17179869100,
            'y': 1
          },
          {
            'x': 18253611000,
            'y': 6
          },
          {
            'x': 19327352800,
            'y': 3
          },
          {
            'x': 20401094600,
            'y': 3
          },
          {
            'x': 21474836400,
            'y': 7
          },
          {
            'x': 32212254700,
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
                'editor': '<div class=\'form-group\'>\n  <label>Interval</label>\n  <select\n    ' +
                'ng-if=\'aggParam.options\'\n    ng-model=\'params.interval\'\n    ' +
                'required\n    ng-options=\'opt as opt.display for opt in aggParam.options.raw | ' +
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
                'Show empty buckets&nbsp;\n    <kbn-info\n      info=\'Show all buckets, ' +
                'not only the buckets with results.\'\n      placement=\'right\'>\n      ' +
                '</kbn-info>\n  </label>\n</div>'
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
                'class=\'form-control\'\n      name=\'extended_bounds.max\' />\n  ' +
                '</div>\n</div>'
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
          3221225400,
          5
        ],
        [
          4294967200,
          2
        ],
        [
          5368709100,
          5
        ],
        [
          6442450900,
          4
        ],
        [
          7516192700,
          1
        ],
        [
          9663676400,
          9
        ],
        [
          10737418200,
          5
        ],
        [
          11811160000,
          5
        ],
        [
          12884901800,
          2
        ],
        [
          13958643700,
          3
        ],
        [
          15032385500,
          3
        ],
        [
          16106127300,
          3
        ],
        [
          17179869100,
          1
        ],
        [
          18253611000,
          6
        ],
        [
          19327352800,
          3
        ],
        [
          20401094600,
          3
        ],
        [
          21474836400,
          7
        ],
        [
          32212254700,
          4
        ]
      ]
    },
    'hits': 71,
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
