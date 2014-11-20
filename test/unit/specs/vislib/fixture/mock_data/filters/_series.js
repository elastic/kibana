define(function (require) {
  var _ = require('lodash');

  return {
    'label': '',
    'xAxisLabel': 'filters',
    'yAxisLabel': 'Count of documents',
    'series': [
      {
        'values': [
          {
            'x': 'css',
            'y': 27374
          },
          {
            'x': 'html',
            'y': 0
          },
          {
            'x': 'png',
            'y': 16663
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
          'id': 'agg_28',
          'aggConfig': {
            'type': 'filters',
            'schema': 'segment',
            'params': {
              'filters': [
                {
                  'input': {
                    'query': {
                      'query_string': {
                        'query': 'css'
                      }
                    }
                  },
                  '$$hashKey': '04M'
                },
                {
                  'input': {
                    'query': {
                      'query_string': {
                        'query': 'html'
                      }
                    }
                  },
                  '$$hashKey': '051'
                },
                {
                  'input': {
                    'query': {
                      'query_string': {
                        'query': 'png'
                      }
                    }
                  },
                  '$$hashKey': '054'
                }
              ]
            }
          },
          'aggType': {
            'name': 'filters',
            'title': 'Filters',
            'hasNoDsl': false,
            'type': 'buckets'
          },
          'label': 'filters',
          'params': {
            'filters': {
              'css': {
                'query': {
                  'query_string': {
                    'query': 'css'
                  }
                }
              },
              'html': {
                'query': {
                  'query_string': {
                    'query': 'html'
                  }
                }
              },
              'png': {
                'query': {
                  'query_string': {
                    'query': 'png'
                  }
                }
              }
            }
          }
        },
        {
          'categoryName': 'metric',
          'id': 'agg_27',
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
          'css',
          27374
        ],
        [
          'html',
          0
        ],
        [
          'png',
          16663
        ]
      ]
    },
    'hits': 171454,
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
