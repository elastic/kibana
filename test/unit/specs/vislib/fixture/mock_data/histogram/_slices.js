define(function () {
  var _ = require('lodash');

  return {
    'label': '',
    'slices': {
      'children': [
        {
          'name': 0,
          'size': 378611,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': {
                name: 'bytes',
                format: {
                  convert: function (val) {
                    if (_.isObject(val)) {
                      return JSON.stringify(val);
                    }
                    else if (val == null) {
                      return '';
                    }
                    else {
                      return '' + val;
                    }
                  }
                }
              },
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 1000,
          'size': 205997,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': {
                name: 'bytes',
                format: {
                  convert: function (val) {
                    if (_.isObject(val)) {
                      return JSON.stringify(val);
                    }
                    else if (val == null) {
                      return '';
                    }
                    else {
                      return '' + val;
                    }
                  }
                }
              },
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 2000,
          'size': 397189,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': {
                name: 'bytes',
                format: {
                  convert: function (val) {
                    if (_.isObject(val)) {
                      return JSON.stringify(val);
                    }
                    else if (val == null) {
                      return '';
                    }
                    else {
                      return '' + val;
                    }
                  }
                }
              },
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 3000,
          'size': 397195,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': {
                name: 'bytes',
                format: {
                  convert: function (val) {
                    if (_.isObject(val)) {
                      return JSON.stringify(val);
                    }
                    else if (val == null) {
                      return '';
                    }
                    else {
                      return '' + val;
                    }
                  }
                }
              },
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 4000,
          'size': 398429,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': {
                name: 'bytes',
                format: {
                  convert: function (val) {
                    if (_.isObject(val)) {
                      return JSON.stringify(val);
                    }
                    else if (val == null) {
                      return '';
                    }
                    else {
                      return '' + val;
                    }
                  }
                }
              },
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 5000,
          'size': 397843,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 6000,
          'size': 398140,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 7000,
          'size': 398076,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 8000,
          'size': 396746,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 9000,
          'size': 397418,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 10000,
          'size': 20222,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 11000,
          'size': 20173,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 12000,
          'size': 20026,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 13000,
          'size': 19986,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 14000,
          'size': 20091,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 15000,
          'size': 20052,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 16000,
          'size': 20349,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 17000,
          'size': 20290,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 18000,
          'size': 20399,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 19000,
          'size': 20133,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        },
        {
          'name': 20000,
          'size': 9,
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
              'extended_bounds': {}
            }
          }
        }
      ]
    },
    'names': [
      0,
      1000,
      2000,
      3000,
      4000,
      5000,
      6000,
      7000,
      8000,
      9000,
      10000,
      11000,
      12000,
      13000,
      14000,
      15000,
      16000,
      17000,
      18000,
      19000,
      20000
    ],
    'hits': 3967374,
    'raw': {
      'rows': [
        [
          0,
          378611
        ],
        [
          1000,
          205997
        ],
        [
          2000,
          397189
        ],
        [
          3000,
          397195
        ],
        [
          4000,
          398429
        ],
        [
          5000,
          397843
        ],
        [
          6000,
          398140
        ],
        [
          7000,
          398076
        ],
        [
          8000,
          396746
        ],
        [
          9000,
          397418
        ],
        [
          10000,
          20222
        ],
        [
          11000,
          20173
        ],
        [
          12000,
          20026
        ],
        [
          13000,
          19986
        ],
        [
          14000,
          20091
        ],
        [
          15000,
          20052
        ],
        [
          16000,
          20349
        ],
        [
          17000,
          20290
        ],
        [
          18000,
          20399
        ],
        [
          19000,
          20133
        ],
        [
          20000,
          9
        ]
      ],
      'columns': [
        {
          'categoryName': 'segment',
          'id': 'agg_27',
          'aggConfig': {
            'type': 'histogram',
            'schema': 'segment',
            'params': {
              'field': 'bytes',
              'interval': 1000,
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
                'required\n    ng-options=\'opt as opt.display for opt in aggParam.options.raw | ' +
                'filter:optionEnabled\'\n    class=\'form-control\'\n    name=\'interval\'>\n    ' +
                '<option value=\'\'>-- select a valid interval --</option>\n  ' +
                '</select>\n  <input\n    ng-if=\'!aggParam.options\'\n    ' +
                'ng-model=\'params.interval\'\n    required\n    type=\'number\'\n    ' +
                'class=\'form-control\'\n    name=\'interval\'\n    min=\'0\'\n    >\n</div>\n'
              },
              {
                'name': 'min_doc_count',
                'default': null,
                'editor': '<div class=\'checkbox ng-scope\'>\n  <label>\n    ' +
                '<input ng-model=\'params.min_doc_count\' type=\'checkbox\'>\n    ' +
                'Show empty buckets&nbsp;\n    <kbn-info\n      info=\'Show all ' +
                'buckets, not only the buckets with results.\'\n      ' +
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
                '</div>\n  <div class=\'form-group\'>\n    ' +
                '<label>Max <small>(optional)</small></label>\n    <input\n      ' +
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
            'name': 'bytes',
            'count': 0
          },
          'label': 'bytes'
        },
        {
          'categoryName': 'metric',
          'id': 'agg_26',
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
          'label': 'Count of documents'
        }
      ]
    },
    'tooltipFormatter': function (event) {
      return event.point;
    }
  };
});
