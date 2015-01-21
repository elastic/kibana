define(function (require) {
  var moment = require('moment');

  return {
    'xAxisLabel': 'DATE per week',
    'ordered': {
      'date': true,
      'interval': 604800000,
      'min': 621801393014,
      'max': 655654699882
    },
    'yAxisLabel': 'Sum of CHANGE',
    'yScale': 1,
    'series': [
      {
        'label': '5',
        'values': [
          {
            'x': 622944000000,
            'y': -12925,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 622944000000,
                  'value': 622944000000,
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
              'key': -12925,
              'value': -12925,
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
            'x': 623548800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 624153600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 624758400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 625363200000,
            'y': -12409,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 625363200000,
                  'value': 625363200000,
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
              'key': -12409,
              'value': -12409,
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
            'x': 625968000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 626572800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 627177600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 627782400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 628387200000,
            'y': -12336,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 628387200000,
                  'value': 628387200000,
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
              'key': -12336,
              'value': -12336,
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
            'x': 628992000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 629596800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 630201600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 630806400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 631411200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 632016000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 632620800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 633225600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 633830400000,
            'y': -11429,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 633830400000,
                  'value': 633830400000,
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
              'key': -11429,
              'value': -11429,
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
            'x': 634435200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 635040000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 635644800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 636249600000,
            'y': -12623,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 636249600000,
                  'value': 636249600000,
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
              'key': -12623,
              'value': -12623,
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
            'x': 636854400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 637459200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 638064000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 638668800000,
            'y': -13426,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 638668800000,
                  'value': 638668800000,
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
              'key': -13426,
              'value': -13426,
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
            'x': 639273600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 639878400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 640483200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 641088000000,
            'y': -13818,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 641088000000,
                  'value': 641088000000,
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
              'key': -13818,
              'value': -13818,
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
            'x': 641692800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 642297600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 642902400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 643507200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 644112000000,
            'y': -11101,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 644112000000,
                  'value': 644112000000,
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
              'key': -11101,
              'value': -11101,
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
            'x': 644716800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 645321600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 645926400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 646531200000,
            'y': -8421,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 646531200000,
                  'value': 646531200000,
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
              'key': -8421,
              'value': -8421,
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
            'x': 647136000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 647740800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 648345600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 648950400000,
            'y': -9354,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 648950400000,
                  'value': 648950400000,
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
              'key': -9354,
              'value': -9354,
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
            'x': 649555200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 650160000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 650764800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 651369600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 651974400000,
            'y': -11342,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 651974400000,
                  'value': 651974400000,
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
              'key': -11342,
              'value': -11342,
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
            'x': 652579200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 653184000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 653788800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 654393600000,
            'y': 0,
            'y0': 0
          }
        ]
      },
      {
        'label': '6',
        'values': [
          {
            'x': 622944000000,
            'y': 0,
            'y0': -12925
          },
          {
            'x': 623548800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 624153600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 624758400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 625363200000,
            'y': 0,
            'y0': -12409
          },
          {
            'x': 625968000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 626572800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 627177600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 627782400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 628387200000,
            'y': 0,
            'y0': -12336
          },
          {
            'x': 628992000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 629596800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 630201600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 630806400000,
            'y': -11962,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 630806400000,
                  'value': 630806400000,
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
              'key': -11962,
              'value': -11962,
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
            'x': 631411200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 632016000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 632620800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 633225600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 633830400000,
            'y': 0,
            'y0': -11429
          },
          {
            'x': 634435200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 635040000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 635644800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 636249600000,
            'y': 0,
            'y0': -12623
          },
          {
            'x': 636854400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 637459200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 638064000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 638668800000,
            'y': 0,
            'y0': -13426
          },
          {
            'x': 639273600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 639878400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 640483200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 641088000000,
            'y': 0,
            'y0': -13818
          },
          {
            'x': 641692800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 642297600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 642902400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 643507200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 644112000000,
            'y': 0,
            'y0': -11101
          },
          {
            'x': 644716800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 645321600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 645926400000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 646531200000,
            'y': 0,
            'y0': -8421
          },
          {
            'x': 647136000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 647740800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 648345600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 648950400000,
            'y': 0,
            'y0': -9354
          },
          {
            'x': 649555200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 650160000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 650764800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 651369600000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 651974400000,
            'y': 0,
            'y0': -11342
          },
          {
            'x': 652579200000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 653184000000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 653788800000,
            'y': 0,
            'y0': 0
          },
          {
            'x': 654393600000,
            'y': -14511,
            'aggConfigResult': {
              '$parent': {
                '$parent': {
                  'key': 654393600000,
                  'value': 654393600000,
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
              'key': -14511,
              'value': -14511,
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
    'hits': 13,
    'xAxisFormatter': function (thing) {
      return moment(thing);
    },
    'tooltipFormatter': function (d) {
      return d;
    }
  };
});
