define(function (require) {
  var _ = require('lodash');

  return {
    'columns': [
      {
        'label': 'apache: _type',
        'xAxisLabel': 'bytes ranges',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': '0.0-1000.0',
                'y': 13309
              },
              {
                'x': '1000.0-2000.0',
                'y': 7196
              }
            ]
          }
        ]
      },
      {
        'label': 'nginx: _type',
        'xAxisLabel': 'bytes ranges',
        'yAxisLabel': 'Count of documents',
        'series': [
          {
            'values': [
              {
                'x': '0.0-1000.0',
                'y': 3278
              },
              {
                'x': '1000.0-2000.0',
                'y': 1804
              }
            ]
          }
        ]
      }
    ],
    'hits': 171499,
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
