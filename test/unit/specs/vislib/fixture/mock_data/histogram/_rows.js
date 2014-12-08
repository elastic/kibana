define(function (require) {
  var _ = require('lodash');

  return {
    'rows': [
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
                'y': 1
              },
              {
                'x': 10737418200,
                'y': 1
              },
              {
                'x': 15032385500,
                'y': 2
              },
              {
                'x': 19327352800,
                'y': 1
              },
              {
                'x': 32212254700,
                'y': 1
              }
            ]
          }
        ],
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
                'x': 3221225400,
                'y': 4
              },
              {
                'x': 4294967200,
                'y': 3
              },
              {
                'x': 5368709100,
                'y': 3
              },
              {
                'x': 6442450900,
                'y': 2
              },
              {
                'x': 7516192700,
                'y': 2
              },
              {
                'x': 8589934500,
                'y': 2
              },
              {
                'x': 9663676400,
                'y': 3
              },
              {
                'x': 11811160000,
                'y': 3
              },
              {
                'x': 12884901800,
                'y': 2
              },
              {
                'x': 13958643700,
                'y': 1
              },
              {
                'x': 15032385500,
                'y': 2
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
                'y': 4
              },
              {
                'x': 19327352800,
                'y': 1
              },
              {
                'x': 20401094600,
                'y': 1
              },
              {
                'x': 21474836400,
                'y': 4
              },
              {
                'x': 32212254700,
                'y': 3
              }
            ]
          }
        ],
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
                'x': 10737418200,
                'y': 1
              }
            ]
          }
        ],
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
      }
    ],
    'hits': 51
  };
});
