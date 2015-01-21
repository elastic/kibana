define(function (require) {
  var moment = require('moment');

  return {
    'xAxisLabel': 'DATE per week',
    'ordered': {
      'date': true,
      'interval': 604800000,
      'min': 694436932823,
      'max': 716031239174
    },
    'yAxisLabel': 'Sum of CHANGE',
    'yScale': 1,
    'series': [
      {
        'label': '5',
        'values': [
          {
            'x': 696729600000,
            'y': 3886,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 696729600000,
                  'value': 696729600000,
                  'aggConfig': {
                    'id': '2',
                    'type': 'date_histogram',
                    'schema': 'segment',
                    'params': {
                      'field': 'DATE',
                      'interval': 'week',
                      'min_doc_count': 1,
                      'extended_bounds': {}
                    }
                  },
                  'type': 'bucket'
                },
                'key': 5,
                'value': 5,
                'aggConfig': {
                  'id': '3',
                  'type': 'terms',
                  'schema': 'group',
                  'params': {
                    'field': 'DATE.__weekOfMonth',
                    'size': 5,
                    'order': 'desc',
                    'orderBy': '1'
                  }
                },
                'type': 'bucket'
              },
              'key': 3886,
              'value': 3886,
              'aggConfig': {
                'id': '1',
                'type': 'sum',
                'schema': 'metric',
                'params': {
                  'field': 'CHANGE'
                }
              },
              'type': 'metric'
            },
            'yScale': 1,
            'series': 5,
            'y0': 0
          },
          {
            'x': 697334400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 697939200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 698544000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 699148800000,
            'y': 3968,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 699148800000,
                  'value': 699148800000,
                  'aggConfig': {
                    'id': '2',
                    'type': 'date_histogram',
                    'schema': 'segment',
                    'params': {
                      'field': 'DATE',
                      'interval': 'week',
                      'min_doc_count': 1,
                      'extended_bounds': {}
                    }
                  },
                  'type': 'bucket'
                },
                'key': 5,
                'value': 5,
                'aggConfig': {
                  'id': '3',
                  'type': 'terms',
                  'schema': 'group',
                  'params': {
                    'field': 'DATE.__weekOfMonth',
                    'size': 5,
                    'order': 'desc',
                    'orderBy': '1'
                  }
                },
                'type': 'bucket'
              },
              'key': 3968,
              'value': 3968,
              'aggConfig': {
                'id': '1',
                'type': 'sum',
                'schema': 'metric',
                'params': {
                  'field': 'CHANGE'
                }
              },
              'type': 'metric'
            },
            'yScale': 1,
            'series': 5,
            'y0': 0
          },
          {
            'x': 699753600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 700358400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 700963200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 701568000000,
            'y': 3904,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 701568000000,
                  'value': 701568000000,
                  'aggConfig': {
                    'id': '2',
                    'type': 'date_histogram',
                    'schema': 'segment',
                    'params': {
                      'field': 'DATE',
                      'interval': 'week',
                      'min_doc_count': 1,
                      'extended_bounds': {}
                    }
                  },
                  'type': 'bucket'
                },
                'key': 5,
                'value': 5,
                'aggConfig': {
                  'id': '3',
                  'type': 'terms',
                  'schema': 'group',
                  'params': {
                    'field': 'DATE.__weekOfMonth',
                    'size': 5,
                    'order': 'desc',
                    'orderBy': '1'
                  }
                },
                'type': 'bucket'
              },
              'key': 3904,
              'value': 3904,
              'aggConfig': {
                'id': '1',
                'type': 'sum',
                'schema': 'metric',
                'params': {
                  'field': 'CHANGE'
                }
              },
              'type': 'metric'
            },
            'yScale': 1,
            'series': 5,
            'y0': 0
          },
          {
            'x': 702172800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 702777600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 703382400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 703987200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 704592000000,
            'y': -617,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 704592000000,
                  'value': 704592000000,
                  'aggConfig': {
                    'id': '2',
                    'type': 'date_histogram',
                    'schema': 'segment',
                    'params': {
                      'field': 'DATE',
                      'interval': 'week',
                      'min_doc_count': 1,
                      'extended_bounds': {}
                    }
                  },
                  'type': 'bucket'
                },
                'key': 5,
                'value': 5,
                'aggConfig': {
                  'id': '3',
                  'type': 'terms',
                  'schema': 'group',
                  'params': {
                    'field': 'DATE.__weekOfMonth',
                    'size': 5,
                    'order': 'desc',
                    'orderBy': '1'
                  }
                },
                'type': 'bucket'
              },
              'key': -617,
              'value': -617,
              'aggConfig': {
                'id': '1',
                'type': 'sum',
                'schema': 'metric',
                'params': {
                  'field': 'CHANGE'
                }
              },
              'type': 'metric'
            },
            'yScale': 1,
            'series': 5,
            'y0': 0
          },
          {
            'x': 705196800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 705801600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 706406400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 707011200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 707616000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 708220800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 708825600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 709430400000,
            'y': -5287,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 709430400000,
                  'value': 709430400000,
                  'aggConfig': {
                    'id': '2',
                    'type': 'date_histogram',
                    'schema': 'segment',
                    'params': {
                      'field': 'DATE',
                      'interval': 'week',
                      'min_doc_count': 1,
                      'extended_bounds': {}
                    }
                  },
                  'type': 'bucket'
                },
                'key': 5,
                'value': 5,
                'aggConfig': {
                  'id': '3',
                  'type': 'terms',
                  'schema': 'group',
                  'params': {
                    'field': 'DATE.__weekOfMonth',
                    'size': 5,
                    'order': 'desc',
                    'orderBy': '1'
                  }
                },
                'type': 'bucket'
              },
              'key': -5287,
              'value': -5287,
              'aggConfig': {
                'id': '1',
                'type': 'sum',
                'schema': 'metric',
                'params': {
                  'field': 'CHANGE'
                }
              },
              'type': 'metric'
            },
            'yScale': 1,
            'series': 5,
            'y0': 0
          },
          {
            'x': 710035200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 710640000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 711244800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 711849600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 712454400000,
            'y': -6149,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 712454400000,
                  'value': 712454400000,
                  'aggConfig': {
                    'id': '2',
                    'type': 'date_histogram',
                    'schema': 'segment',
                    'params': {
                      'field': 'DATE',
                      'interval': 'week',
                      'min_doc_count': 1,
                      'extended_bounds': {}
                    }
                  },
                  'type': 'bucket'
                },
                'key': 5,
                'value': 5,
                'aggConfig': {
                  'id': '3',
                  'type': 'terms',
                  'schema': 'group',
                  'params': {
                    'field': 'DATE.__weekOfMonth',
                    'size': 5,
                    'order': 'desc',
                    'orderBy': '1'
                  }
                },
                'type': 'bucket'
              },
              'key': -6149,
              'value': -6149,
              'aggConfig': {
                'id': '1',
                'type': 'sum',
                'schema': 'metric',
                'params': {
                  'field': 'CHANGE'
                }
              },
              'type': 'metric'
            },
            'yScale': 1,
            'series': 5,
            'y0': 0
          },
          {
            'x': 713059200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 713664000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 714268800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 714873600000,
            'y': 0,
            'y0': 0
          }
        ]
      },
      {
        'label': '6',
        'values': [
          {
            'x': 696729600000,
            'y': 0,
            'y0': 3886
          },
          {
            'x': 697334400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 697939200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 698544000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 699148800000,
            'y': 0,
            'y0': 3968
          },
          {
            'x': 699753600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 700358400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 700963200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 701568000000,
            'y': 0,
            'y0': 3904
          },
          {
            'x': 702172800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 702777600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 703382400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 703987200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 704592000000,
            'y': 0,
            'y0': -617
          },
          {
            'x': 705196800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 705801600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 706406400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 707011200000,
            'y': -3910,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 707011200000,
                  'value': 707011200000,
                  'aggConfig': {
                    'id': '2',
                    'type': 'date_histogram',
                    'schema': 'segment',
                    'params': {
                      'field': 'DATE',
                      'interval': 'week',
                      'min_doc_count': 1,
                      'extended_bounds': {}
                    }
                  },
                  'type': 'bucket'
                },
                'key': 6,
                'value': 6,
                'aggConfig': {
                  'id': '3',
                  'type': 'terms',
                  'schema': 'group',
                  'params': {
                    'field': 'DATE.__weekOfMonth',
                    'size': 5,
                    'order': 'desc',
                    'orderBy': '1'
                  }
                },
                'type': 'bucket'
              },
              'key': -3910,
              'value': -3910,
              'aggConfig': {
                'id': '1',
                'type': 'sum',
                'schema': 'metric',
                'params': {
                  'field': 'CHANGE'
                }
              },
              'type': 'metric'
            },
            'yScale': 1,
            'series': 6,
            'y0': 0
          },
          {
            'x': 707616000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 708220800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 708825600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 709430400000,
            'y': 0,
            'y0': -5287
          },
          {
            'x': 710035200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 710640000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 711244800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 711849600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 712454400000,
            'y': 0,
            'y0': -6149
          },
          {
            'x': 713059200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 713664000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 714268800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 714873600000,
            'y': -3102,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 714873600000,
                  'value': 714873600000,
                  'aggConfig': {
                    'id': '2',
                    'type': 'date_histogram',
                    'schema': 'segment',
                    'params': {
                      'field': 'DATE',
                      'interval': 'week',
                      'min_doc_count': 1,
                      'extended_bounds': {}
                    }
                  },
                  'type': 'bucket'
                },
                'key': 6,
                'value': 6,
                'aggConfig': {
                  'id': '3',
                  'type': 'terms',
                  'schema': 'group',
                  'params': {
                    'field': 'DATE.__weekOfMonth',
                    'size': 5,
                    'order': 'desc',
                    'orderBy': '1'
                  }
                },
                'type': 'bucket'
              },
              'key': -3102,
              'value': -3102,
              'aggConfig': {
                'id': '1',
                'type': 'sum',
                'schema': 'metric',
                'params': {
                  'field': 'CHANGE'
                }
              },
              'type': 'metric'
            },
            'yScale': 1,
            'series': 6,
            'y0': 0
          }
        ]
      }
    ],
    'hits': 8,
    'xAxisFormatter': function (thing) {
      return moment(thing);
    },
    'tooltipFormatter': function (d) {
      return d;
    }
  };
});
