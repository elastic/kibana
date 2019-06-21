/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const dataResponse = {
  took: 157,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0
  },
  hits: {
    total: {
      value: 10000,
      relation: 'gte'
    },
    max_score: null,
    hits: []
  },
  aggregations: {
    by_date: {
      buckets: [
        {
          key_as_string: '2019-06-21T07:33:00.000Z',
          key: 1561102380000,
          doc_count: 26,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 13380.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 1021.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 376.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 621.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 17.0
          },
          sum_all_self_times: {
            value: 15398.0
          }
        },
        {
          key_as_string: '2019-06-21T07:34:00.000Z',
          key: 1561102440000,
          doc_count: 47,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 73798.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 1444.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5899.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3131.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 44.0
          },
          sum_all_self_times: {
            value: 84272.0
          }
        },
        {
          key_as_string: '2019-06-21T07:35:00.000Z',
          key: 1561102500000,
          doc_count: 53,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 19234.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 4105.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 949.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1113.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 47.0
          },
          sum_all_self_times: {
            value: 25401.0
          }
        },
        {
          key_as_string: '2019-06-21T07:36:00.000Z',
          key: 1561102560000,
          doc_count: 29,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 8852.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 1652.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 390.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 503.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 26.0
          },
          sum_all_self_times: {
            value: 11397.0
          }
        },
        {
          key_as_string: '2019-06-21T07:37:00.000Z',
          key: 1561102620000,
          doc_count: 59,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 20,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 20,
                      total_self_time_per_subtype: {
                        value: 44304.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 7469.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 8368.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6305.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 73.0
          },
          sum_all_self_times: {
            value: 66446.0
          }
        },
        {
          key_as_string: '2019-06-21T07:38:00.000Z',
          key: 1561102680000,
          doc_count: 36,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 64000.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 1177.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 86448.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4412.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 24.0
          },
          sum_all_self_times: {
            value: 156037.0
          }
        },
        {
          key_as_string: '2019-06-21T07:39:00.000Z',
          key: 1561102740000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 58459.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 1825.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 21341.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3118.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 23.0
          },
          sum_all_self_times: {
            value: 84743.0
          }
        },
        {
          key_as_string: '2019-06-21T07:40:00.000Z',
          key: 1561102800000,
          doc_count: 51,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 28554.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 6759.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2707.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 1478.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 34.0
          },
          sum_all_self_times: {
            value: 39498.0
          }
        },
        {
          key_as_string: '2019-06-21T07:41:00.000Z',
          key: 1561102860000,
          doc_count: 49,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 42601.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 1324.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6092.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 591.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 40.0
          },
          sum_all_self_times: {
            value: 50608.0
          }
        },
        {
          key_as_string: '2019-06-21T07:42:00.000Z',
          key: 1561102920000,
          doc_count: 47,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 57874.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 3455.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 21493.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 670.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 35.0
          },
          sum_all_self_times: {
            value: 83492.0
          }
        },
        {
          key_as_string: '2019-06-21T07:43:00.000Z',
          key: 1561102980000,
          doc_count: 57,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 20,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 20,
                      total_self_time_per_subtype: {
                        value: 44822.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 1635.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4276.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1877.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 35.0
          },
          sum_all_self_times: {
            value: 52610.0
          }
        },
        {
          key_as_string: '2019-06-21T07:44:00.000Z',
          key: 1561103040000,
          doc_count: 30,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 79448.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 416.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 154423.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1980.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 20.0
          },
          sum_all_self_times: {
            value: 236267.0
          }
        },
        {
          key_as_string: '2019-06-21T07:45:00.000Z',
          key: 1561103100000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 17799.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 6407.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2532.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 942.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 29.0
          },
          sum_all_self_times: {
            value: 27680.0
          }
        },
        {
          key_as_string: '2019-06-21T07:46:00.000Z',
          key: 1561103160000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 45110.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 1041.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 36413.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 883.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 62.0
          },
          sum_all_self_times: {
            value: 83447.0
          }
        },
        {
          key_as_string: '2019-06-21T07:47:00.000Z',
          key: 1561103220000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 29999.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 2075.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 65851.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 835.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 46.0
          },
          sum_all_self_times: {
            value: 98760.0
          }
        },
        {
          key_as_string: '2019-06-21T07:48:00.000Z',
          key: 1561103280000,
          doc_count: 46,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 36189.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 3431.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7953.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 730.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 32.0
          },
          sum_all_self_times: {
            value: 48303.0
          }
        },
        {
          key_as_string: '2019-06-21T07:49:00.000Z',
          key: 1561103340000,
          doc_count: 45,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 56450.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 6541.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7080.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3475.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 37.0
          },
          sum_all_self_times: {
            value: 73546.0
          }
        },
        {
          key_as_string: '2019-06-21T07:50:00.000Z',
          key: 1561103400000,
          doc_count: 41,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 50580.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 1745.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 32232.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3077.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 39.0
          },
          sum_all_self_times: {
            value: 87634.0
          }
        },
        {
          key_as_string: '2019-06-21T07:51:00.000Z',
          key: 1561103460000,
          doc_count: 53,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 25793.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 2319.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 72179.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2927.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 76.0
          },
          sum_all_self_times: {
            value: 103218.0
          }
        },
        {
          key_as_string: '2019-06-21T07:52:00.000Z',
          key: 1561103520000,
          doc_count: 42,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 34624.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 3291.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7873.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1697.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 53.0
          },
          sum_all_self_times: {
            value: 47485.0
          }
        },
        {
          key_as_string: '2019-06-21T07:53:00.000Z',
          key: 1561103580000,
          doc_count: 51,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 55533.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 1781.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 11349.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 926.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 42.0
          },
          sum_all_self_times: {
            value: 69589.0
          }
        },
        {
          key_as_string: '2019-06-21T07:54:00.000Z',
          key: 1561103640000,
          doc_count: 40,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 70240.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 893.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 20539.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1104.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 32.0
          },
          sum_all_self_times: {
            value: 92776.0
          }
        },
        {
          key_as_string: '2019-06-21T07:55:00.000Z',
          key: 1561103700000,
          doc_count: 58,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 20,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 20,
                      total_self_time_per_subtype: {
                        value: 9898.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 3204.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2161.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 860.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 62.0
          },
          sum_all_self_times: {
            value: 16123.0
          }
        },
        {
          key_as_string: '2019-06-21T07:56:00.000Z',
          key: 1561103760000,
          doc_count: 45,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 40848.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 3581.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7717.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1437.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 38.0
          },
          sum_all_self_times: {
            value: 53583.0
          }
        },
        {
          key_as_string: '2019-06-21T07:57:00.000Z',
          key: 1561103820000,
          doc_count: 55,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 9355.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 3512.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3863.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 641.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 73.0
          },
          sum_all_self_times: {
            value: 17371.0
          }
        },
        {
          key_as_string: '2019-06-21T07:58:00.000Z',
          key: 1561103880000,
          doc_count: 27,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 47396.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 398.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 114080.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1616.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 24.0
          },
          sum_all_self_times: {
            value: 163490.0
          }
        },
        {
          key_as_string: '2019-06-21T07:59:00.000Z',
          key: 1561103940000,
          doc_count: 12,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 76098.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2862.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 180086.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 2365.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 15.0
          },
          sum_all_self_times: {
            value: 261411.0
          }
        },
        {
          key_as_string: '2019-06-21T08:00:00.000Z',
          key: 1561104000000,
          doc_count: 48,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 25876.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 2372.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 707.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 9048.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 60.0
          },
          sum_all_self_times: {
            value: 38003.0
          }
        },
        {
          key_as_string: '2019-06-21T08:01:00.000Z',
          key: 1561104060000,
          doc_count: 32,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 43340.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 633.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 46867.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1313.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 20.0
          },
          sum_all_self_times: {
            value: 92153.0
          }
        },
        {
          key_as_string: '2019-06-21T08:02:00.000Z',
          key: 1561104120000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 53443.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 4549.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5581.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4298.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 21.0
          },
          sum_all_self_times: {
            value: 67871.0
          }
        },
        {
          key_as_string: '2019-06-21T08:03:00.000Z',
          key: 1561104180000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 64836.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 932.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 23522.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1085.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 28.0
          },
          sum_all_self_times: {
            value: 90375.0
          }
        },
        {
          key_as_string: '2019-06-21T08:04:00.000Z',
          key: 1561104240000,
          doc_count: 40,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 25442.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 6381.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3484.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 397.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 30.0
          },
          sum_all_self_times: {
            value: 35704.0
          }
        },
        {
          key_as_string: '2019-06-21T08:05:00.000Z',
          key: 1561104300000,
          doc_count: 60,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 21,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 21,
                      total_self_time_per_subtype: {
                        value: 30915.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 1512.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 9406.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1267.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 55.0
          },
          sum_all_self_times: {
            value: 43100.0
          }
        },
        {
          key_as_string: '2019-06-21T08:06:00.000Z',
          key: 1561104360000,
          doc_count: 33,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 49871.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 4620.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 10599.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1306.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 15.0
          },
          sum_all_self_times: {
            value: 66396.0
          }
        },
        {
          key_as_string: '2019-06-21T08:07:00.000Z',
          key: 1561104420000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 30625.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 1493.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5951.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 426.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 30.0
          },
          sum_all_self_times: {
            value: 38495.0
          }
        },
        {
          key_as_string: '2019-06-21T08:08:00.000Z',
          key: 1561104480000,
          doc_count: 56,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 47798.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 1205.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5485.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 711.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 84.0
          },
          sum_all_self_times: {
            value: 55199.0
          }
        },
        {
          key_as_string: '2019-06-21T08:09:00.000Z',
          key: 1561104540000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 24498.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 3370.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7610.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 620.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 37.0
          },
          sum_all_self_times: {
            value: 36098.0
          }
        },
        {
          key_as_string: '2019-06-21T08:10:00.000Z',
          key: 1561104600000,
          doc_count: 51,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 30200.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 2400.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 37248.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1741.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 55.0
          },
          sum_all_self_times: {
            value: 71589.0
          }
        },
        {
          key_as_string: '2019-06-21T08:11:00.000Z',
          key: 1561104660000,
          doc_count: 52,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 30075.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 4842.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5397.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2175.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 47.0
          },
          sum_all_self_times: {
            value: 42489.0
          }
        },
        {
          key_as_string: '2019-06-21T08:12:00.000Z',
          key: 1561104720000,
          doc_count: 40,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 56986.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 2247.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 44708.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3546.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 51.0
          },
          sum_all_self_times: {
            value: 107487.0
          }
        },
        {
          key_as_string: '2019-06-21T08:13:00.000Z',
          key: 1561104780000,
          doc_count: 55,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 17080.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 5089.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 24733.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4669.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 52.0
          },
          sum_all_self_times: {
            value: 51571.0
          }
        },
        {
          key_as_string: '2019-06-21T08:14:00.000Z',
          key: 1561104840000,
          doc_count: 60,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 21,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 21,
                      total_self_time_per_subtype: {
                        value: 6723.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 3151.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1336.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1903.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 82.0
          },
          sum_all_self_times: {
            value: 13113.0
          }
        },
        {
          key_as_string: '2019-06-21T08:15:00.000Z',
          key: 1561104900000,
          doc_count: 55,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 40171.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 5435.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 23097.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2143.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 40.0
          },
          sum_all_self_times: {
            value: 70846.0
          }
        },
        {
          key_as_string: '2019-06-21T08:16:00.000Z',
          key: 1561104960000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 32239.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 3798.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7943.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2406.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 36.0
          },
          sum_all_self_times: {
            value: 46386.0
          }
        },
        {
          key_as_string: '2019-06-21T08:17:00.000Z',
          key: 1561105020000,
          doc_count: 26,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 87294.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 1567.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 133124.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3560.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 23.0
          },
          sum_all_self_times: {
            value: 225545.0
          }
        },
        {
          key_as_string: '2019-06-21T08:18:00.000Z',
          key: 1561105080000,
          doc_count: 37,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 53285.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 850.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 96821.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1262.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 31.0
          },
          sum_all_self_times: {
            value: 152218.0
          }
        },
        {
          key_as_string: '2019-06-21T08:19:00.000Z',
          key: 1561105140000,
          doc_count: 33,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 55962.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 5201.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 55640.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4605.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 19.0
          },
          sum_all_self_times: {
            value: 121408.0
          }
        },
        {
          key_as_string: '2019-06-21T08:20:00.000Z',
          key: 1561105200000,
          doc_count: 31,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 36858.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 508.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 281477.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 828.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 35.0
          },
          sum_all_self_times: {
            value: 319671.0
          }
        },
        {
          key_as_string: '2019-06-21T08:21:00.000Z',
          key: 1561105260000,
          doc_count: 24,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 106962.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 1276.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 219057.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1045.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 25.0
          },
          sum_all_self_times: {
            value: 328340.0
          }
        },
        {
          key_as_string: '2019-06-21T08:22:00.000Z',
          key: 1561105320000,
          doc_count: 40,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 47470.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 2923.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2850.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2695.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 21.0
          },
          sum_all_self_times: {
            value: 55938.0
          }
        },
        {
          key_as_string: '2019-06-21T08:23:00.000Z',
          key: 1561105380000,
          doc_count: 41,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 62228.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 2378.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 14592.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1005.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 38.0
          },
          sum_all_self_times: {
            value: 80203.0
          }
        },
        {
          key_as_string: '2019-06-21T08:24:00.000Z',
          key: 1561105440000,
          doc_count: 48,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 21708.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 3737.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6567.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 865.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 41.0
          },
          sum_all_self_times: {
            value: 32877.0
          }
        },
        {
          key_as_string: '2019-06-21T08:25:00.000Z',
          key: 1561105500000,
          doc_count: 58,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 20,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 20,
                      total_self_time_per_subtype: {
                        value: 6650.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 1421.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2279.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 632.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 91.0
          },
          sum_all_self_times: {
            value: 10982.0
          }
        },
        {
          key_as_string: '2019-06-21T08:26:00.000Z',
          key: 1561105560000,
          doc_count: 36,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 38430.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 1522.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 32560.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1541.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 38.0
          },
          sum_all_self_times: {
            value: 74053.0
          }
        },
        {
          key_as_string: '2019-06-21T08:27:00.000Z',
          key: 1561105620000,
          doc_count: 49,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 58703.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 2288.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 60274.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1110.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 28.0
          },
          sum_all_self_times: {
            value: 122375.0
          }
        },
        {
          key_as_string: '2019-06-21T08:28:00.000Z',
          key: 1561105680000,
          doc_count: 35,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 39702.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 511.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 107492.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 704.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 40.0
          },
          sum_all_self_times: {
            value: 148409.0
          }
        },
        {
          key_as_string: '2019-06-21T08:29:00.000Z',
          key: 1561105740000,
          doc_count: 33,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 48284.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 2332.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 12444.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2110.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 20.0
          },
          sum_all_self_times: {
            value: 65170.0
          }
        },
        {
          key_as_string: '2019-06-21T08:30:00.000Z',
          key: 1561105800000,
          doc_count: 43,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 58193.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 1971.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 19796.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3771.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 27.0
          },
          sum_all_self_times: {
            value: 83731.0
          }
        },
        {
          key_as_string: '2019-06-21T08:31:00.000Z',
          key: 1561105860000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 41670.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 988.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 10093.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1671.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 26.0
          },
          sum_all_self_times: {
            value: 54422.0
          }
        },
        {
          key_as_string: '2019-06-21T08:32:00.000Z',
          key: 1561105920000,
          doc_count: 60,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 21,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 21,
                      total_self_time_per_subtype: {
                        value: 31889.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 5534.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 24110.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1195.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 54.0
          },
          sum_all_self_times: {
            value: 62728.0
          }
        },
        {
          key_as_string: '2019-06-21T08:33:00.000Z',
          key: 1561105980000,
          doc_count: 18,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 47461.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 385.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 922.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 20738.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 16.0
          },
          sum_all_self_times: {
            value: 69506.0
          }
        },
        {
          key_as_string: '2019-06-21T08:34:00.000Z',
          key: 1561106040000,
          doc_count: 23,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 76264.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 436.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 269115.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2181.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 17.0
          },
          sum_all_self_times: {
            value: 347996.0
          }
        },
        {
          key_as_string: '2019-06-21T08:35:00.000Z',
          key: 1561106100000,
          doc_count: 21,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 46833.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 813.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4111.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 1785.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 12.0
          },
          sum_all_self_times: {
            value: 53542.0
          }
        },
        {
          key_as_string: '2019-06-21T08:36:00.000Z',
          key: 1561106160000,
          doc_count: 23,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 85540.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 2111.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 63991.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1135.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 18.0
          },
          sum_all_self_times: {
            value: 152777.0
          }
        },
        {
          key_as_string: '2019-06-21T08:37:00.000Z',
          key: 1561106220000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 25947.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 3302.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 40337.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4902.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 28.0
          },
          sum_all_self_times: {
            value: 74488.0
          }
        },
        {
          key_as_string: '2019-06-21T08:38:00.000Z',
          key: 1561106280000,
          doc_count: 26,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 62096.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 1915.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 35843.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1549.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 23.0
          },
          sum_all_self_times: {
            value: 101403.0
          }
        },
        {
          key_as_string: '2019-06-21T08:39:00.000Z',
          key: 1561106340000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T08:40:00.000Z',
          key: 1561106400000,
          doc_count: 61,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 21,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 21,
                      total_self_time_per_subtype: {
                        value: 43334.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 7249.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5704.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2070.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 100.0
          },
          sum_all_self_times: {
            value: 58357.0
          }
        },
        {
          key_as_string: '2019-06-21T08:41:00.000Z',
          key: 1561106460000,
          doc_count: 53,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 29057.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 1512.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 18755.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 538.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 48.0
          },
          sum_all_self_times: {
            value: 49862.0
          }
        },
        {
          key_as_string: '2019-06-21T08:42:00.000Z',
          key: 1561106520000,
          doc_count: 57,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 20,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 20,
                      total_self_time_per_subtype: {
                        value: 14051.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 2073.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5022.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 427.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 72.0
          },
          sum_all_self_times: {
            value: 21573.0
          }
        },
        {
          key_as_string: '2019-06-21T08:43:00.000Z',
          key: 1561106580000,
          doc_count: 48,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 69480.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 780.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 13566.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1027.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 55.0
          },
          sum_all_self_times: {
            value: 84853.0
          }
        },
        {
          key_as_string: '2019-06-21T08:44:00.000Z',
          key: 1561106640000,
          doc_count: 42,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 22310.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 5065.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 11807.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 672.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 23.0
          },
          sum_all_self_times: {
            value: 39854.0
          }
        },
        {
          key_as_string: '2019-06-21T08:45:00.000Z',
          key: 1561106700000,
          doc_count: 61,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 21,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 21,
                      total_self_time_per_subtype: {
                        value: 35567.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 6041.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 8843.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 581.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 46.0
          },
          sum_all_self_times: {
            value: 51032.0
          }
        },
        {
          key_as_string: '2019-06-21T08:46:00.000Z',
          key: 1561106760000,
          doc_count: 43,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 48714.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 4661.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 26925.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2016.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 30.0
          },
          sum_all_self_times: {
            value: 82316.0
          }
        },
        {
          key_as_string: '2019-06-21T08:47:00.000Z',
          key: 1561106820000,
          doc_count: 28,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 19760.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 1565.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3249.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2075.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 16.0
          },
          sum_all_self_times: {
            value: 26649.0
          }
        },
        {
          key_as_string: '2019-06-21T08:48:00.000Z',
          key: 1561106880000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 47148.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 2823.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 29605.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4732.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 27.0
          },
          sum_all_self_times: {
            value: 84308.0
          }
        },
        {
          key_as_string: '2019-06-21T08:49:00.000Z',
          key: 1561106940000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 52457.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 2182.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 45589.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 561.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 25.0
          },
          sum_all_self_times: {
            value: 100789.0
          }
        },
        {
          key_as_string: '2019-06-21T08:50:00.000Z',
          key: 1561107000000,
          doc_count: 21,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 58761.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 692.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 68722.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6351.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 13.0
          },
          sum_all_self_times: {
            value: 134526.0
          }
        },
        {
          key_as_string: '2019-06-21T08:51:00.000Z',
          key: 1561107060000,
          doc_count: 42,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 29762.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 2800.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 48140.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2766.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 29.0
          },
          sum_all_self_times: {
            value: 83468.0
          }
        },
        {
          key_as_string: '2019-06-21T08:52:00.000Z',
          key: 1561107120000,
          doc_count: 26,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 87270.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 1274.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3903.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 11144.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 15.0
          },
          sum_all_self_times: {
            value: 103591.0
          }
        },
        {
          key_as_string: '2019-06-21T08:53:00.000Z',
          key: 1561107180000,
          doc_count: 35,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 40345.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 2117.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 45366.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 991.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 29.0
          },
          sum_all_self_times: {
            value: 88819.0
          }
        },
        {
          key_as_string: '2019-06-21T08:54:00.000Z',
          key: 1561107240000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 33554.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 3214.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5748.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6259.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 31.0
          },
          sum_all_self_times: {
            value: 48775.0
          }
        },
        {
          key_as_string: '2019-06-21T08:55:00.000Z',
          key: 1561107300000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 27406.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 2320.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 10739.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 476.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 34.0
          },
          sum_all_self_times: {
            value: 40941.0
          }
        },
        {
          key_as_string: '2019-06-21T08:56:00.000Z',
          key: 1561107360000,
          doc_count: 51,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 43898.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 1987.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 9960.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1332.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 66.0
          },
          sum_all_self_times: {
            value: 57177.0
          }
        },
        {
          key_as_string: '2019-06-21T08:57:00.000Z',
          key: 1561107420000,
          doc_count: 24,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 61293.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 1051.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 27227.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6780.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 17.0
          },
          sum_all_self_times: {
            value: 96351.0
          }
        },
        {
          key_as_string: '2019-06-21T08:58:00.000Z',
          key: 1561107480000,
          doc_count: 29,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 37199.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 2286.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 54971.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2212.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 18.0
          },
          sum_all_self_times: {
            value: 96668.0
          }
        },
        {
          key_as_string: '2019-06-21T08:59:00.000Z',
          key: 1561107540000,
          doc_count: 41,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 50534.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 1908.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 54460.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5318.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 39.0
          },
          sum_all_self_times: {
            value: 112220.0
          }
        },
        {
          key_as_string: '2019-06-21T09:00:00.000Z',
          key: 1561107600000,
          doc_count: 58,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 20,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 20,
                      total_self_time_per_subtype: {
                        value: 22762.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 6255.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 695.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3257.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 47.0
          },
          sum_all_self_times: {
            value: 32969.0
          }
        },
        {
          key_as_string: '2019-06-21T09:01:00.000Z',
          key: 1561107660000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 38096.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 2396.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6590.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4750.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 34.0
          },
          sum_all_self_times: {
            value: 51832.0
          }
        },
        {
          key_as_string: '2019-06-21T09:02:00.000Z',
          key: 1561107720000,
          doc_count: 30,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 28012.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 16959.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 8721.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 5595.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 16.0
          },
          sum_all_self_times: {
            value: 59287.0
          }
        },
        {
          key_as_string: '2019-06-21T09:03:00.000Z',
          key: 1561107780000,
          doc_count: 40,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 35716.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 2116.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2791.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 3474.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 22.0
          },
          sum_all_self_times: {
            value: 44097.0
          }
        },
        {
          key_as_string: '2019-06-21T09:04:00.000Z',
          key: 1561107840000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 41033.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 5158.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 88141.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1354.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 32.0
          },
          sum_all_self_times: {
            value: 135686.0
          }
        },
        {
          key_as_string: '2019-06-21T09:05:00.000Z',
          key: 1561107900000,
          doc_count: 55,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 37962.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 1427.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 26460.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1397.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 31.0
          },
          sum_all_self_times: {
            value: 67246.0
          }
        },
        {
          key_as_string: '2019-06-21T09:06:00.000Z',
          key: 1561107960000,
          doc_count: 27,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 51110.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 1345.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 130606.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4351.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 22.0
          },
          sum_all_self_times: {
            value: 187412.0
          }
        },
        {
          key_as_string: '2019-06-21T09:07:00.000Z',
          key: 1561108020000,
          doc_count: 40,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 23213.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 1765.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2742.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4493.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 25.0
          },
          sum_all_self_times: {
            value: 32213.0
          }
        },
        {
          key_as_string: '2019-06-21T09:08:00.000Z',
          key: 1561108080000,
          doc_count: 33,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 40174.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 2340.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 21117.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1796.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 20.0
          },
          sum_all_self_times: {
            value: 65427.0
          }
        },
        {
          key_as_string: '2019-06-21T09:09:00.000Z',
          key: 1561108140000,
          doc_count: 46,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 57813.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 1362.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1246.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 75032.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 34.0
          },
          sum_all_self_times: {
            value: 135453.0
          }
        },
        {
          key_as_string: '2019-06-21T09:10:00.000Z',
          key: 1561108200000,
          doc_count: 49,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 45207.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 5839.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3415.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3207.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 36.0
          },
          sum_all_self_times: {
            value: 57668.0
          }
        },
        {
          key_as_string: '2019-06-21T09:11:00.000Z',
          key: 1561108260000,
          doc_count: 23,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 69257.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 1968.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1105.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 6773.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 13.0
          },
          sum_all_self_times: {
            value: 79103.0
          }
        },
        {
          key_as_string: '2019-06-21T09:12:00.000Z',
          key: 1561108320000,
          doc_count: 54,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 24059.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 5030.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 25845.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1070.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 49.0
          },
          sum_all_self_times: {
            value: 56004.0
          }
        },
        {
          key_as_string: '2019-06-21T09:13:00.000Z',
          key: 1561108380000,
          doc_count: 55,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 30015.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 4981.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 11926.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 650.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 46.0
          },
          sum_all_self_times: {
            value: 47572.0
          }
        },
        {
          key_as_string: '2019-06-21T09:14:00.000Z',
          key: 1561108440000,
          doc_count: 41,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 65562.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 1731.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 67833.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 768.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 29.0
          },
          sum_all_self_times: {
            value: 135894.0
          }
        },
        {
          key_as_string: '2019-06-21T09:15:00.000Z',
          key: 1561108500000,
          doc_count: 36,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 50269.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 2220.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 14450.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1531.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 30.0
          },
          sum_all_self_times: {
            value: 68470.0
          }
        },
        {
          key_as_string: '2019-06-21T09:16:00.000Z',
          key: 1561108560000,
          doc_count: 32,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 65835.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 2528.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5309.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 45553.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 33.0
          },
          sum_all_self_times: {
            value: 119225.0
          }
        },
        {
          key_as_string: '2019-06-21T09:17:00.000Z',
          key: 1561108620000,
          doc_count: 53,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 10669.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 4398.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2826.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1566.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 77.0
          },
          sum_all_self_times: {
            value: 19459.0
          }
        },
        {
          key_as_string: '2019-06-21T09:18:00.000Z',
          key: 1561108680000,
          doc_count: 35,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 16689.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 2058.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 626.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 1668.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 52.0
          },
          sum_all_self_times: {
            value: 21041.0
          }
        },
        {
          key_as_string: '2019-06-21T09:19:00.000Z',
          key: 1561108740000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 80865.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 3224.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 29032.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1699.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 24.0
          },
          sum_all_self_times: {
            value: 114820.0
          }
        },
        {
          key_as_string: '2019-06-21T09:20:00.000Z',
          key: 1561108800000,
          doc_count: 42,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 54390.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 1781.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 15503.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1520.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 40.0
          },
          sum_all_self_times: {
            value: 73194.0
          }
        },
        {
          key_as_string: '2019-06-21T09:21:00.000Z',
          key: 1561108860000,
          doc_count: 32,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 69787.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 2150.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 173432.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 680.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 23.0
          },
          sum_all_self_times: {
            value: 246049.0
          }
        },
        {
          key_as_string: '2019-06-21T09:22:00.000Z',
          key: 1561108920000,
          doc_count: 53,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 40208.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 7008.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 13461.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 582.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 58.0
          },
          sum_all_self_times: {
            value: 61259.0
          }
        },
        {
          key_as_string: '2019-06-21T09:23:00.000Z',
          key: 1561108980000,
          doc_count: 40,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 46926.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 1573.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 826.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 6544.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 32.0
          },
          sum_all_self_times: {
            value: 55869.0
          }
        },
        {
          key_as_string: '2019-06-21T09:24:00.000Z',
          key: 1561109040000,
          doc_count: 35,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 46955.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 1845.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 17074.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2796.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 15.0
          },
          sum_all_self_times: {
            value: 68670.0
          }
        },
        {
          key_as_string: '2019-06-21T09:25:00.000Z',
          key: 1561109100000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 67966.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 2831.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 55068.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 8664.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 32.0
          },
          sum_all_self_times: {
            value: 134529.0
          }
        },
        {
          key_as_string: '2019-06-21T09:26:00.000Z',
          key: 1561109160000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 30669.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 3741.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 26163.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 798.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 32.0
          },
          sum_all_self_times: {
            value: 61371.0
          }
        },
        {
          key_as_string: '2019-06-21T09:27:00.000Z',
          key: 1561109220000,
          doc_count: 36,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 31561.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 3169.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 852.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 12665.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 19.0
          },
          sum_all_self_times: {
            value: 48247.0
          }
        },
        {
          key_as_string: '2019-06-21T09:28:00.000Z',
          key: 1561109280000,
          doc_count: 48,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 47058.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 3970.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 26111.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2382.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 38.0
          },
          sum_all_self_times: {
            value: 79521.0
          }
        },
        {
          key_as_string: '2019-06-21T09:29:00.000Z',
          key: 1561109340000,
          doc_count: 41,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 47837.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 389.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 45302.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 8128.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 41.0
          },
          sum_all_self_times: {
            value: 101656.0
          }
        },
        {
          key_as_string: '2019-06-21T09:30:00.000Z',
          key: 1561109400000,
          doc_count: 29,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 59090.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 1552.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 30426.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1920.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 13.0
          },
          sum_all_self_times: {
            value: 92988.0
          }
        },
        {
          key_as_string: '2019-06-21T09:31:00.000Z',
          key: 1561109460000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 44546.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 6556.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 24244.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2007.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 23.0
          },
          sum_all_self_times: {
            value: 77353.0
          }
        },
        {
          key_as_string: '2019-06-21T09:32:00.000Z',
          key: 1561109520000,
          doc_count: 27,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 56804.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 9705.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 37067.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 10215.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 14.0
          },
          sum_all_self_times: {
            value: 113791.0
          }
        },
        {
          key_as_string: '2019-06-21T09:33:00.000Z',
          key: 1561109580000,
          doc_count: 55,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 33040.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 14538.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 2113.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 18377.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 53.0
          },
          sum_all_self_times: {
            value: 68068.0
          }
        },
        {
          key_as_string: '2019-06-21T09:34:00.000Z',
          key: 1561109640000,
          doc_count: 23,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 9883.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 5510.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 5733.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 1822.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 15.0
          },
          sum_all_self_times: {
            value: 22948.0
          }
        },
        {
          key_as_string: '2019-06-21T09:35:00.000Z',
          key: 1561109700000,
          doc_count: 72,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 25,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 25,
                      total_self_time_per_subtype: {
                        value: 64110.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 6116.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 62674.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 5599.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 56.0
          },
          sum_all_self_times: {
            value: 138499.0
          }
        },
        {
          key_as_string: '2019-06-21T09:36:00.000Z',
          key: 1561109760000,
          doc_count: 9,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 54011.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 91.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 2057.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 3790.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 3.0
          },
          sum_all_self_times: {
            value: 59949.0
          }
        },
        {
          key_as_string: '2019-06-21T09:37:00.000Z',
          key: 1561109820000,
          doc_count: 49,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 79808.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 4764.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 2942.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7202.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 40.0
          },
          sum_all_self_times: {
            value: 94716.0
          }
        },
        {
          key_as_string: '2019-06-21T09:38:00.000Z',
          key: 1561109880000,
          doc_count: 29,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 10055.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 4151.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 2501.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 2479.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 32.0
          },
          sum_all_self_times: {
            value: 19186.0
          }
        },
        {
          key_as_string: '2019-06-21T09:39:00.000Z',
          key: 1561109940000,
          doc_count: 52,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 80360.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 3529.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 5367.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 47442.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 41.0
          },
          sum_all_self_times: {
            value: 136698.0
          }
        },
        {
          key_as_string: '2019-06-21T09:40:00.000Z',
          key: 1561110000000,
          doc_count: 21,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 113271.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 2327.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 13312.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2548.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 10.0
          },
          sum_all_self_times: {
            value: 131458.0
          }
        },
        {
          key_as_string: '2019-06-21T09:41:00.000Z',
          key: 1561110060000,
          doc_count: 15,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 533.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 634.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 129.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 341.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 12.0
          },
          sum_all_self_times: {
            value: 1637.0
          }
        },
        {
          key_as_string: '2019-06-21T09:42:00.000Z',
          key: 1561110120000,
          doc_count: 33,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 153671.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 4914.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 83332.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2923.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 26.0
          },
          sum_all_self_times: {
            value: 244840.0
          }
        },
        {
          key_as_string: '2019-06-21T09:43:00.000Z',
          key: 1561110180000,
          doc_count: 29,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 3950.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 4495.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 6455.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 182.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 38.0
          },
          sum_all_self_times: {
            value: 15082.0
          }
        },
        {
          key_as_string: '2019-06-21T09:44:00.000Z',
          key: 1561110240000,
          doc_count: 32,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 59705.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 3251.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 23618.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1149.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 18.0
          },
          sum_all_self_times: {
            value: 87723.0
          }
        },
        {
          key_as_string: '2019-06-21T09:45:00.000Z',
          key: 1561110300000,
          doc_count: 58,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 20,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 20,
                      total_self_time_per_subtype: {
                        value: 16681.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 9511.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6683.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1534.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 49.0
          },
          sum_all_self_times: {
            value: 34409.0
          }
        },
        {
          key_as_string: '2019-06-21T09:46:00.000Z',
          key: 1561110360000,
          doc_count: 53,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 56970.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 10151.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 73442.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 9128.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 52.0
          },
          sum_all_self_times: {
            value: 149691.0
          }
        },
        {
          key_as_string: '2019-06-21T09:47:00.000Z',
          key: 1561110420000,
          doc_count: 21,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 47713.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 4387.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 94725.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2443.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 12.0
          },
          sum_all_self_times: {
            value: 149268.0
          }
        },
        {
          key_as_string: '2019-06-21T09:48:00.000Z',
          key: 1561110480000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 49771.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 2614.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 11382.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 800.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 39.0
          },
          sum_all_self_times: {
            value: 64567.0
          }
        },
        {
          key_as_string: '2019-06-21T09:49:00.000Z',
          key: 1561110540000,
          doc_count: 46,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 56477.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 4822.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 17923.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 519.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 27.0
          },
          sum_all_self_times: {
            value: 79741.0
          }
        },
        {
          key_as_string: '2019-06-21T09:50:00.000Z',
          key: 1561110600000,
          doc_count: 35,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 74701.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 818.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 173529.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2034.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 26.0
          },
          sum_all_self_times: {
            value: 251082.0
          }
        },
        {
          key_as_string: '2019-06-21T09:51:00.000Z',
          key: 1561110660000,
          doc_count: 43,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 34222.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 2842.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 365.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 644.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 37.0
          },
          sum_all_self_times: {
            value: 38073.0
          }
        },
        {
          key_as_string: '2019-06-21T09:52:00.000Z',
          key: 1561110720000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 45731.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 4817.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7653.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1908.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 22.0
          },
          sum_all_self_times: {
            value: 60109.0
          }
        },
        {
          key_as_string: '2019-06-21T09:53:00.000Z',
          key: 1561110780000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 20104.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 3715.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1028.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 3744.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 42.0
          },
          sum_all_self_times: {
            value: 28591.0
          }
        },
        {
          key_as_string: '2019-06-21T09:54:00.000Z',
          key: 1561110840000,
          doc_count: 21,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 95829.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 9487.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 24323.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5745.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 13.0
          },
          sum_all_self_times: {
            value: 135384.0
          }
        },
        {
          key_as_string: '2019-06-21T09:55:00.000Z',
          key: 1561110900000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 34032.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 11566.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1993.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 57866.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 27.0
          },
          sum_all_self_times: {
            value: 105457.0
          }
        },
        {
          key_as_string: '2019-06-21T09:56:00.000Z',
          key: 1561110960000,
          doc_count: 22,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 51775.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 826.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1287.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 8390.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 14.0
          },
          sum_all_self_times: {
            value: 62278.0
          }
        },
        {
          key_as_string: '2019-06-21T09:57:00.000Z',
          key: 1561111020000,
          doc_count: 55,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 34416.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 6019.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6887.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 921.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 56.0
          },
          sum_all_self_times: {
            value: 48243.0
          }
        },
        {
          key_as_string: '2019-06-21T09:58:00.000Z',
          key: 1561111080000,
          doc_count: 33,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 98787.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 3268.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 33960.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1691.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 22.0
          },
          sum_all_self_times: {
            value: 137706.0
          }
        },
        {
          key_as_string: '2019-06-21T09:59:00.000Z',
          key: 1561111140000,
          doc_count: 41,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 28711.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 8358.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 31488.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 694.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 57.0
          },
          sum_all_self_times: {
            value: 69251.0
          }
        },
        {
          key_as_string: '2019-06-21T10:00:00.000Z',
          key: 1561111200000,
          doc_count: 47,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 24190.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 10142.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 20803.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 469.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 42.0
          },
          sum_all_self_times: {
            value: 55604.0
          }
        },
        {
          key_as_string: '2019-06-21T10:01:00.000Z',
          key: 1561111260000,
          doc_count: 46,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 25833.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 3981.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 11674.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1375.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 53.0
          },
          sum_all_self_times: {
            value: 42863.0
          }
        },
        {
          key_as_string: '2019-06-21T10:02:00.000Z',
          key: 1561111320000,
          doc_count: 40,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 23599.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 3971.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3339.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6512.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 26.0
          },
          sum_all_self_times: {
            value: 37421.0
          }
        },
        {
          key_as_string: '2019-06-21T10:03:00.000Z',
          key: 1561111380000,
          doc_count: 16,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 42364.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1761.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 9567.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 1808.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 7.0
          },
          sum_all_self_times: {
            value: 55500.0
          }
        },
        {
          key_as_string: '2019-06-21T10:04:00.000Z',
          key: 1561111440000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 54351.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 5771.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 25160.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2324.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 28.0
          },
          sum_all_self_times: {
            value: 87606.0
          }
        },
        {
          key_as_string: '2019-06-21T10:05:00.000Z',
          key: 1561111500000,
          doc_count: 51,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 68767.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 20641.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 3554.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 13361.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 25.0
          },
          sum_all_self_times: {
            value: 106323.0
          }
        },
        {
          key_as_string: '2019-06-21T10:06:00.000Z',
          key: 1561111560000,
          doc_count: 43,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 18080.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 4760.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1048.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 3712.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 53.0
          },
          sum_all_self_times: {
            value: 27600.0
          }
        },
        {
          key_as_string: '2019-06-21T10:07:00.000Z',
          key: 1561111620000,
          doc_count: 17,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 14747.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 7649.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 9474.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 462.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 13.0
          },
          sum_all_self_times: {
            value: 32332.0
          }
        },
        {
          key_as_string: '2019-06-21T10:08:00.000Z',
          key: 1561111680000,
          doc_count: 74,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 25,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 25,
                      total_self_time_per_subtype: {
                        value: 33240.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 18612.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 16456.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 1634.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 64.0
          },
          sum_all_self_times: {
            value: 69942.0
          }
        },
        {
          key_as_string: '2019-06-21T10:09:00.000Z',
          key: 1561111740000,
          doc_count: 36,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 62115.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 3258.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 147391.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1099.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 21.0
          },
          sum_all_self_times: {
            value: 213863.0
          }
        },
        {
          key_as_string: '2019-06-21T10:10:00.000Z',
          key: 1561111800000,
          doc_count: 47,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 20715.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 8160.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 13758.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1580.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 42.0
          },
          sum_all_self_times: {
            value: 44213.0
          }
        },
        {
          key_as_string: '2019-06-21T10:11:00.000Z',
          key: 1561111860000,
          doc_count: 41,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 39704.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 3791.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 23467.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5970.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 60.0
          },
          sum_all_self_times: {
            value: 72932.0
          }
        },
        {
          key_as_string: '2019-06-21T10:12:00.000Z',
          key: 1561111920000,
          doc_count: 26,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 40731.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 677.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 67785.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1404.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 25.0
          },
          sum_all_self_times: {
            value: 110597.0
          }
        },
        {
          key_as_string: '2019-06-21T10:13:00.000Z',
          key: 1561111980000,
          doc_count: 26,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 37624.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 3054.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 340.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 7775.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 20.0
          },
          sum_all_self_times: {
            value: 48793.0
          }
        },
        {
          key_as_string: '2019-06-21T10:14:00.000Z',
          key: 1561112040000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 52161.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 5863.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 23759.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1044.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 21.0
          },
          sum_all_self_times: {
            value: 82827.0
          }
        },
        {
          key_as_string: '2019-06-21T10:15:00.000Z',
          key: 1561112100000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 27763.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 6790.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 688.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 20105.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 34.0
          },
          sum_all_self_times: {
            value: 55346.0
          }
        },
        {
          key_as_string: '2019-06-21T10:16:00.000Z',
          key: 1561112160000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 66182.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 2373.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 21517.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2567.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 20.0
          },
          sum_all_self_times: {
            value: 92639.0
          }
        },
        {
          key_as_string: '2019-06-21T10:17:00.000Z',
          key: 1561112220000,
          doc_count: 53,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 36987.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 1495.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3889.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 98.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 97.0
          },
          sum_all_self_times: {
            value: 42469.0
          }
        },
        {
          key_as_string: '2019-06-21T10:18:00.000Z',
          key: 1561112280000,
          doc_count: 64,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 22,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 22,
                      total_self_time_per_subtype: {
                        value: 7451.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 1115.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1042.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 39.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 134.0
          },
          sum_all_self_times: {
            value: 9647.0
          }
        },
        {
          key_as_string: '2019-06-21T10:19:00.000Z',
          key: 1561112340000,
          doc_count: 32,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 1533.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 695.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 765.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 6.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 63.0
          },
          sum_all_self_times: {
            value: 2999.0
          }
        },
        {
          key_as_string: '2019-06-21T10:20:00.000Z',
          key: 1561112400000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T10:21:00.000Z',
          key: 1561112460000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T10:22:00.000Z',
          key: 1561112520000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T10:23:00.000Z',
          key: 1561112580000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T10:24:00.000Z',
          key: 1561112640000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T10:25:00.000Z',
          key: 1561112700000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T10:26:00.000Z',
          key: 1561112760000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T10:27:00.000Z',
          key: 1561112820000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T10:28:00.000Z',
          key: 1561112880000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T10:29:00.000Z',
          key: 1561112940000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T10:30:00.000Z',
          key: 1561113000000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T10:31:00.000Z',
          key: 1561113060000,
          doc_count: 40,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 20285.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 3487.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1100.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 3164.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 57.0
          },
          sum_all_self_times: {
            value: 28036.0
          }
        },
        {
          key_as_string: '2019-06-21T10:32:00.000Z',
          key: 1561113120000,
          doc_count: 69,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 24,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 24,
                      total_self_time_per_subtype: {
                        value: 36168.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 11339.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 46026.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 1237.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 57.0
          },
          sum_all_self_times: {
            value: 94770.0
          }
        },
        {
          key_as_string: '2019-06-21T10:33:00.000Z',
          key: 1561113180000,
          doc_count: 18,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 15880.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 1730.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 3869.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 2171.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 10.0
          },
          sum_all_self_times: {
            value: 23650.0
          }
        },
        {
          key_as_string: '2019-06-21T10:34:00.000Z',
          key: 1561113240000,
          doc_count: 65,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 22,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 22,
                      total_self_time_per_subtype: {
                        value: 26909.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 5815.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 2321.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 8707.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 50.0
          },
          sum_all_self_times: {
            value: 43752.0
          }
        },
        {
          key_as_string: '2019-06-21T10:35:00.000Z',
          key: 1561113300000,
          doc_count: 26,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 58116.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 9574.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1181.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 9144.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 19.0
          },
          sum_all_self_times: {
            value: 78015.0
          }
        },
        {
          key_as_string: '2019-06-21T10:36:00.000Z',
          key: 1561113360000,
          doc_count: 12,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 38442.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 799.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 7784.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 915.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 5.0
          },
          sum_all_self_times: {
            value: 47940.0
          }
        },
        {
          key_as_string: '2019-06-21T10:37:00.000Z',
          key: 1561113420000,
          doc_count: 53,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 109451.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 10630.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 18907.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 10923.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 27.0
          },
          sum_all_self_times: {
            value: 149911.0
          }
        },
        {
          key_as_string: '2019-06-21T10:38:00.000Z',
          key: 1561113480000,
          doc_count: 43,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 53262.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 10541.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2592.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 6484.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 21.0
          },
          sum_all_self_times: {
            value: 72879.0
          }
        },
        {
          key_as_string: '2019-06-21T10:39:00.000Z',
          key: 1561113540000,
          doc_count: 24,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 9503.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 4543.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 1097.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 1802.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 12.0
          },
          sum_all_self_times: {
            value: 16945.0
          }
        },
        {
          key_as_string: '2019-06-21T10:40:00.000Z',
          key: 1561113600000,
          doc_count: 47,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 80202.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 2486.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 7247.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 1633.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 32.0
          },
          sum_all_self_times: {
            value: 91568.0
          }
        },
        {
          key_as_string: '2019-06-21T10:41:00.000Z',
          key: 1561113660000,
          doc_count: 30,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 113319.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 3794.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 42720.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1295.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 17.0
          },
          sum_all_self_times: {
            value: 161128.0
          }
        },
        {
          key_as_string: '2019-06-21T10:42:00.000Z',
          key: 1561113720000,
          doc_count: 34,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 68600.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 2620.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4086.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 31739.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 26.0
          },
          sum_all_self_times: {
            value: 107045.0
          }
        },
        {
          key_as_string: '2019-06-21T10:43:00.000Z',
          key: 1561113780000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 55021.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 306.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 103141.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1224.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 36.0
          },
          sum_all_self_times: {
            value: 159692.0
          }
        },
        {
          key_as_string: '2019-06-21T10:44:00.000Z',
          key: 1561113840000,
          doc_count: 43,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 44958.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 1689.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 90649.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 653.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 31.0
          },
          sum_all_self_times: {
            value: 137949.0
          }
        },
        {
          key_as_string: '2019-06-21T10:45:00.000Z',
          key: 1561113900000,
          doc_count: 45,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 53692.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 3024.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3788.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1196.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 42.0
          },
          sum_all_self_times: {
            value: 61700.0
          }
        },
        {
          key_as_string: '2019-06-21T10:46:00.000Z',
          key: 1561113960000,
          doc_count: 27,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 33996.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 4071.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5576.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 12686.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 17.0
          },
          sum_all_self_times: {
            value: 56329.0
          }
        },
        {
          key_as_string: '2019-06-21T10:47:00.000Z',
          key: 1561114020000,
          doc_count: 64,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 22,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 22,
                      total_self_time_per_subtype: {
                        value: 16017.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 3144.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 9092.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 489.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 60.0
          },
          sum_all_self_times: {
            value: 28742.0
          }
        },
        {
          key_as_string: '2019-06-21T10:48:00.000Z',
          key: 1561114080000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 34766.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 3803.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 14426.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2746.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 27.0
          },
          sum_all_self_times: {
            value: 55741.0
          }
        },
        {
          key_as_string: '2019-06-21T10:49:00.000Z',
          key: 1561114140000,
          doc_count: 47,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 34949.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 1320.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 21539.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1075.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 31.0
          },
          sum_all_self_times: {
            value: 58883.0
          }
        },
        {
          key_as_string: '2019-06-21T10:50:00.000Z',
          key: 1561114200000,
          doc_count: 50,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 32579.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 5979.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 12387.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1159.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 52.0
          },
          sum_all_self_times: {
            value: 52104.0
          }
        },
        {
          key_as_string: '2019-06-21T10:51:00.000Z',
          key: 1561114260000,
          doc_count: 12,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 14250.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3394.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 7358.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 393.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 7.0
          },
          sum_all_self_times: {
            value: 25395.0
          }
        },
        {
          key_as_string: '2019-06-21T10:52:00.000Z',
          key: 1561114320000,
          doc_count: 54,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 30567.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 14245.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 2848.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 15838.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 34.0
          },
          sum_all_self_times: {
            value: 63498.0
          }
        },
        {
          key_as_string: '2019-06-21T10:53:00.000Z',
          key: 1561114380000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 81795.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 1313.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 73573.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1017.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 26.0
          },
          sum_all_self_times: {
            value: 157698.0
          }
        },
        {
          key_as_string: '2019-06-21T10:54:00.000Z',
          key: 1561114440000,
          doc_count: 37,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 69710.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 3476.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6801.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1598.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 22.0
          },
          sum_all_self_times: {
            value: 81585.0
          }
        },
        {
          key_as_string: '2019-06-21T10:55:00.000Z',
          key: 1561114500000,
          doc_count: 21,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 17116.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 1317.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 18955.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 986.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 20.0
          },
          sum_all_self_times: {
            value: 38374.0
          }
        },
        {
          key_as_string: '2019-06-21T10:56:00.000Z',
          key: 1561114560000,
          doc_count: 50,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 52365.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 6127.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7429.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7324.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 59.0
          },
          sum_all_self_times: {
            value: 73245.0
          }
        },
        {
          key_as_string: '2019-06-21T10:57:00.000Z',
          key: 1561114620000,
          doc_count: 31,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 45869.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 1102.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2006.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 9160.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 20.0
          },
          sum_all_self_times: {
            value: 58137.0
          }
        },
        {
          key_as_string: '2019-06-21T10:58:00.000Z',
          key: 1561114680000,
          doc_count: 29,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 52059.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 3828.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 114277.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1731.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 30.0
          },
          sum_all_self_times: {
            value: 171895.0
          }
        },
        {
          key_as_string: '2019-06-21T10:59:00.000Z',
          key: 1561114740000,
          doc_count: 29,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 53766.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 927.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 16151.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1473.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 27.0
          },
          sum_all_self_times: {
            value: 72317.0
          }
        },
        {
          key_as_string: '2019-06-21T11:00:00.000Z',
          key: 1561114800000,
          doc_count: 47,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 31962.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 2814.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 82828.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 282.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 36.0
          },
          sum_all_self_times: {
            value: 117886.0
          }
        },
        {
          key_as_string: '2019-06-21T11:01:00.000Z',
          key: 1561114860000,
          doc_count: 41,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 35044.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 3326.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6933.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1728.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 42.0
          },
          sum_all_self_times: {
            value: 47031.0
          }
        },
        {
          key_as_string: '2019-06-21T11:02:00.000Z',
          key: 1561114920000,
          doc_count: 37,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 44858.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 2028.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4341.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 28059.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 23.0
          },
          sum_all_self_times: {
            value: 79286.0
          }
        },
        {
          key_as_string: '2019-06-21T11:03:00.000Z',
          key: 1561114980000,
          doc_count: 26,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 73327.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 652.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 114424.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5156.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 15.0
          },
          sum_all_self_times: {
            value: 193559.0
          }
        },
        {
          key_as_string: '2019-06-21T11:04:00.000Z',
          key: 1561115040000,
          doc_count: 47,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 39850.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 2470.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 20657.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 748.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 57.0
          },
          sum_all_self_times: {
            value: 63725.0
          }
        },
        {
          key_as_string: '2019-06-21T11:05:00.000Z',
          key: 1561115100000,
          doc_count: 41,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 19838.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 6123.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3355.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 961.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 32.0
          },
          sum_all_self_times: {
            value: 30277.0
          }
        },
        {
          key_as_string: '2019-06-21T11:06:00.000Z',
          key: 1561115160000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 54767.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 1141.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 111783.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5554.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 31.0
          },
          sum_all_self_times: {
            value: 173245.0
          }
        },
        {
          key_as_string: '2019-06-21T11:07:00.000Z',
          key: 1561115220000,
          doc_count: 33,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 37290.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 4851.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 23536.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2367.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 34.0
          },
          sum_all_self_times: {
            value: 68044.0
          }
        },
        {
          key_as_string: '2019-06-21T11:08:00.000Z',
          key: 1561115280000,
          doc_count: 53,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 53932.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 3836.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 6805.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 740.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 60.0
          },
          sum_all_self_times: {
            value: 65313.0
          }
        },
        {
          key_as_string: '2019-06-21T11:09:00.000Z',
          key: 1561115340000,
          doc_count: 53,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 18,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 18,
                      total_self_time_per_subtype: {
                        value: 30787.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 7567.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 13053.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 726.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 52.0
          },
          sum_all_self_times: {
            value: 52133.0
          }
        },
        {
          key_as_string: '2019-06-21T11:10:00.000Z',
          key: 1561115400000,
          doc_count: 54,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 21726.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 1296.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4904.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 927.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 37.0
          },
          sum_all_self_times: {
            value: 28853.0
          }
        },
        {
          key_as_string: '2019-06-21T11:11:00.000Z',
          key: 1561115460000,
          doc_count: 33,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 52655.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 3125.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 15292.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1194.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 28.0
          },
          sum_all_self_times: {
            value: 72266.0
          }
        },
        {
          key_as_string: '2019-06-21T11:12:00.000Z',
          key: 1561115520000,
          doc_count: 46,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 15132.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 1320.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2374.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 857.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 38.0
          },
          sum_all_self_times: {
            value: 19683.0
          }
        },
        {
          key_as_string: '2019-06-21T11:13:00.000Z',
          key: 1561115580000,
          doc_count: 37,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 73118.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 1189.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 27902.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1549.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 28.0
          },
          sum_all_self_times: {
            value: 103758.0
          }
        },
        {
          key_as_string: '2019-06-21T11:14:00.000Z',
          key: 1561115640000,
          doc_count: 39,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 54331.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 3527.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 42840.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1458.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 33.0
          },
          sum_all_self_times: {
            value: 102156.0
          }
        },
        {
          key_as_string: '2019-06-21T11:15:00.000Z',
          key: 1561115700000,
          doc_count: 34,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 24121.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 977.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7717.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1418.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 24.0
          },
          sum_all_self_times: {
            value: 34233.0
          }
        },
        {
          key_as_string: '2019-06-21T11:16:00.000Z',
          key: 1561115760000,
          doc_count: 47,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 50669.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 2258.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 20812.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3183.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 36.0
          },
          sum_all_self_times: {
            value: 76922.0
          }
        },
        {
          key_as_string: '2019-06-21T11:17:00.000Z',
          key: 1561115820000,
          doc_count: 54,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 9787.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 5764.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1041.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 528.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 59.0
          },
          sum_all_self_times: {
            value: 17120.0
          }
        },
        {
          key_as_string: '2019-06-21T11:18:00.000Z',
          key: 1561115880000,
          doc_count: 45,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 48855.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 1390.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 33417.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2406.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 51.0
          },
          sum_all_self_times: {
            value: 86068.0
          }
        },
        {
          key_as_string: '2019-06-21T11:19:00.000Z',
          key: 1561115940000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 35460.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 16407.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 22977.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 959.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 24.0
          },
          sum_all_self_times: {
            value: 75803.0
          }
        },
        {
          key_as_string: '2019-06-21T11:20:00.000Z',
          key: 1561116000000,
          doc_count: 50,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 29841.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 1587.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 16625.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4328.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 55.0
          },
          sum_all_self_times: {
            value: 52381.0
          }
        },
        {
          key_as_string: '2019-06-21T11:21:00.000Z',
          key: 1561116060000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 30531.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 2622.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 10131.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2066.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 43.0
          },
          sum_all_self_times: {
            value: 45350.0
          }
        },
        {
          key_as_string: '2019-06-21T11:22:00.000Z',
          key: 1561116120000,
          doc_count: 26,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 64018.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 4,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 4,
                      total_self_time_per_subtype: {
                        value: 3122.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 115013.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2875.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 19.0
          },
          sum_all_self_times: {
            value: 185028.0
          }
        },
        {
          key_as_string: '2019-06-21T11:23:00.000Z',
          key: 1561116180000,
          doc_count: 27,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 49073.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 5267.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3286.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 5882.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 12.0
          },
          sum_all_self_times: {
            value: 63508.0
          }
        },
        {
          key_as_string: '2019-06-21T11:24:00.000Z',
          key: 1561116240000,
          doc_count: 35,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 68084.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 6303.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 92938.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3174.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 22.0
          },
          sum_all_self_times: {
            value: 170499.0
          }
        },
        {
          key_as_string: '2019-06-21T11:25:00.000Z',
          key: 1561116300000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 36280.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 5024.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 11166.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 881.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 27.0
          },
          sum_all_self_times: {
            value: 53351.0
          }
        },
        {
          key_as_string: '2019-06-21T11:26:00.000Z',
          key: 1561116360000,
          doc_count: 49,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 46958.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 1905.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 18514.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 960.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 40.0
          },
          sum_all_self_times: {
            value: 68337.0
          }
        },
        {
          key_as_string: '2019-06-21T11:27:00.000Z',
          key: 1561116420000,
          doc_count: 43,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 33713.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 1427.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 16586.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4506.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 31.0
          },
          sum_all_self_times: {
            value: 56232.0
          }
        },
        {
          key_as_string: '2019-06-21T11:28:00.000Z',
          key: 1561116480000,
          doc_count: 36,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 98384.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 1339.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 161174.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4593.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 27.0
          },
          sum_all_self_times: {
            value: 265490.0
          }
        },
        {
          key_as_string: '2019-06-21T11:29:00.000Z',
          key: 1561116540000,
          doc_count: 32,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 36177.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 5138.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5862.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 2043.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 18.0
          },
          sum_all_self_times: {
            value: 49220.0
          }
        },
        {
          key_as_string: '2019-06-21T11:30:00.000Z',
          key: 1561116600000,
          doc_count: 40,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 64429.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 2439.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 50280.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 989.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 36.0
          },
          sum_all_self_times: {
            value: 118137.0
          }
        },
        {
          key_as_string: '2019-06-21T11:31:00.000Z',
          key: 1561116660000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 30708.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 3209.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 18682.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2131.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 37.0
          },
          sum_all_self_times: {
            value: 54730.0
          }
        },
        {
          key_as_string: '2019-06-21T11:32:00.000Z',
          key: 1561116720000,
          doc_count: 35,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 43733.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 3557.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 55250.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2503.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 35.0
          },
          sum_all_self_times: {
            value: 105043.0
          }
        },
        {
          key_as_string: '2019-06-21T11:33:00.000Z',
          key: 1561116780000,
          doc_count: 37,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 49816.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 3161.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 7560.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1937.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 21.0
          },
          sum_all_self_times: {
            value: 62474.0
          }
        },
        {
          key_as_string: '2019-06-21T11:34:00.000Z',
          key: 1561116840000,
          doc_count: 29,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 70677.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 612.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 72184.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 561.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 30.0
          },
          sum_all_self_times: {
            value: 144034.0
          }
        },
        {
          key_as_string: '2019-06-21T11:35:00.000Z',
          key: 1561116900000,
          doc_count: 55,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 11765.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 6428.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 84957.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2651.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 53.0
          },
          sum_all_self_times: {
            value: 105801.0
          }
        },
        {
          key_as_string: '2019-06-21T11:36:00.000Z',
          key: 1561116960000,
          doc_count: 32,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 86881.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 6,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 6,
                      total_self_time_per_subtype: {
                        value: 3857.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 47859.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 882.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 18.0
          },
          sum_all_self_times: {
            value: 139479.0
          }
        },
        {
          key_as_string: '2019-06-21T11:37:00.000Z',
          key: 1561117020000,
          doc_count: 32,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 64811.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 2628.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 10386.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 32914.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 32.0
          },
          sum_all_self_times: {
            value: 110739.0
          }
        },
        {
          key_as_string: '2019-06-21T11:38:00.000Z',
          key: 1561117080000,
          doc_count: 44,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 15532.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 13278.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3092.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 12231.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 33.0
          },
          sum_all_self_times: {
            value: 44133.0
          }
        },
        {
          key_as_string: '2019-06-21T11:39:00.000Z',
          key: 1561117140000,
          doc_count: 30,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 35177.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 13176.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1252.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 3414.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 23.0
          },
          sum_all_self_times: {
            value: 53019.0
          }
        },
        {
          key_as_string: '2019-06-21T11:40:00.000Z',
          key: 1561117200000,
          doc_count: 56,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 11819.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 9117.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5046.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1235.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 50.0
          },
          sum_all_self_times: {
            value: 27217.0
          }
        },
        {
          key_as_string: '2019-06-21T11:41:00.000Z',
          key: 1561117260000,
          doc_count: 23,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 7231.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 2046.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 27.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 81.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 16.0
          },
          sum_all_self_times: {
            value: 9385.0
          }
        },
        {
          key_as_string: '2019-06-21T11:42:00.000Z',
          key: 1561117320000,
          doc_count: 35,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 42836.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 23843.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 4021.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 26.0
          },
          sum_all_self_times: {
            value: 70700.0
          }
        },
        {
          key_as_string: '2019-06-21T11:43:00.000Z',
          key: 1561117380000,
          doc_count: 9,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 2307.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2312.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 3387.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 3.0
          },
          sum_all_self_times: {
            value: 8006.0
          }
        },
        {
          key_as_string: '2019-06-21T11:44:00.000Z',
          key: 1561117440000,
          doc_count: 7,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 3,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 3,
                      total_self_time_per_subtype: {
                        value: 101277.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 13000.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 2.0
          },
          sum_all_self_times: {
            value: 114277.0
          }
        },
        {
          key_as_string: '2019-06-21T11:45:00.000Z',
          key: 1561117500000,
          doc_count: 3,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 97684.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 9250.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 1.0
          },
          sum_all_self_times: {
            value: 106934.0
          }
        },
        {
          key_as_string: '2019-06-21T11:46:00.000Z',
          key: 1561117560000,
          doc_count: 61,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 21,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 21,
                      total_self_time_per_subtype: {
                        value: 67511.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 12361.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1614.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 23.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 93.0
          },
          sum_all_self_times: {
            value: 81509.0
          }
        },
        {
          key_as_string: '2019-06-21T11:47:00.000Z',
          key: 1561117620000,
          doc_count: 66,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 23,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 23,
                      total_self_time_per_subtype: {
                        value: 5324.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 937.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 905.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 32.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 145.0
          },
          sum_all_self_times: {
            value: 7198.0
          }
        },
        {
          key_as_string: '2019-06-21T11:48:00.000Z',
          key: 1561117680000,
          doc_count: 36,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 2303.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 8,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 8,
                      total_self_time_per_subtype: {
                        value: 385.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 117.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 8.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 66.0
          },
          sum_all_self_times: {
            value: 2813.0
          }
        },
        {
          key_as_string: '2019-06-21T11:49:00.000Z',
          key: 1561117740000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T11:50:00.000Z',
          key: 1561117800000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T11:51:00.000Z',
          key: 1561117860000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T11:52:00.000Z',
          key: 1561117920000,
          doc_count: 54,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 19,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 19,
                      total_self_time_per_subtype: {
                        value: 29986.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 12,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 12,
                      total_self_time_per_subtype: {
                        value: 5061.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 9428.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1277.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 70.0
          },
          sum_all_self_times: {
            value: 45752.0
          }
        },
        {
          key_as_string: '2019-06-21T11:53:00.000Z',
          key: 1561117980000,
          doc_count: 29,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 75774.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 5,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 5,
                      total_self_time_per_subtype: {
                        value: 6912.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 34816.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2022.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 21.0
          },
          sum_all_self_times: {
            value: 119524.0
          }
        },
        {
          key_as_string: '2019-06-21T11:54:00.000Z',
          key: 1561118040000,
          doc_count: 38,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 36404.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 5406.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1362.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 803.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 25.0
          },
          sum_all_self_times: {
            value: 43975.0
          }
        },
        {
          key_as_string: '2019-06-21T11:55:00.000Z',
          key: 1561118100000,
          doc_count: 49,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 49977.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 1143.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 67358.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 1518.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 54.0
          },
          sum_all_self_times: {
            value: 119996.0
          }
        },
        {
          key_as_string: '2019-06-21T11:56:00.000Z',
          key: 1561118160000,
          doc_count: 45,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 42562.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 11,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 11,
                      total_self_time_per_subtype: {
                        value: 1601.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 11830.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 806.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 44.0
          },
          sum_all_self_times: {
            value: 56799.0
          }
        },
        {
          key_as_string: '2019-06-21T11:57:00.000Z',
          key: 1561118220000,
          doc_count: 51,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 17,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 17,
                      total_self_time_per_subtype: {
                        value: 51589.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 13,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 13,
                      total_self_time_per_subtype: {
                        value: 4719.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 36126.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 594.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 46.0
          },
          sum_all_self_times: {
            value: 93028.0
          }
        },
        {
          key_as_string: '2019-06-21T11:58:00.000Z',
          key: 1561118280000,
          doc_count: 41,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 14,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 14,
                      total_self_time_per_subtype: {
                        value: 50540.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 9,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 9,
                      total_self_time_per_subtype: {
                        value: 9338.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 96364.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 523.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 46.0
          },
          sum_all_self_times: {
            value: 156765.0
          }
        },
        {
          key_as_string: '2019-06-21T11:59:00.000Z',
          key: 1561118340000,
          doc_count: 29,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 10,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 10,
                      total_self_time_per_subtype: {
                        value: 932.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 7,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 7,
                      total_self_time_per_subtype: {
                        value: 1546.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 571.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 1,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 1,
                      total_self_time_per_subtype: {
                        value: 88.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 45.0
          },
          sum_all_self_times: {
            value: 3137.0
          }
        },
        {
          key_as_string: '2019-06-21T12:00:00.000Z',
          key: 1561118400000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T12:01:00.000Z',
          key: 1561118460000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T12:02:00.000Z',
          key: 1561118520000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T12:03:00.000Z',
          key: 1561118580000,
          doc_count: 0,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: []
          },
          total_transaction_breakdown_count: {
            value: 0.0
          },
          sum_all_self_times: {
            value: 0.0
          }
        },
        {
          key_as_string: '2019-06-21T12:04:00.000Z',
          key: 1561118640000,
          doc_count: 59,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 20,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 20,
                      total_self_time_per_subtype: {
                        value: 6283.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 848.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5820.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 124.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 94.0
          },
          sum_all_self_times: {
            value: 13075.0
          }
        },
        {
          key_as_string: '2019-06-21T12:05:00.000Z',
          key: 1561118700000,
          doc_count: 64,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 22,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 22,
                      total_self_time_per_subtype: {
                        value: 7202.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 957.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 2882.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 14.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 125.0
          },
          sum_all_self_times: {
            value: 11055.0
          }
        },
        {
          key_as_string: '2019-06-21T12:06:00.000Z',
          key: 1561118760000,
          doc_count: 64,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 22,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 22,
                      total_self_time_per_subtype: {
                        value: 7682.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 830.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 5396.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 18.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 146.0
          },
          sum_all_self_times: {
            value: 13926.0
          }
        },
        {
          key_as_string: '2019-06-21T12:07:00.000Z',
          key: 1561118820000,
          doc_count: 68,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 24,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 24,
                      total_self_time_per_subtype: {
                        value: 5128.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 16,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 16,
                      total_self_time_per_subtype: {
                        value: 1557.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 4170.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 13.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 135.0
          },
          sum_all_self_times: {
            value: 10868.0
          }
        },
        {
          key_as_string: '2019-06-21T12:08:00.000Z',
          key: 1561118880000,
          doc_count: 65,
          types: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'app',
                doc_count: 23,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: '',
                      doc_count: 23,
                      total_self_time_per_subtype: {
                        value: 4862.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'db',
                doc_count: 15,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'postgresql',
                      doc_count: 15,
                      total_self_time_per_subtype: {
                        value: 1665.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'external',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'http',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 3337.0
                      }
                    }
                  ]
                }
              },
              {
                key: 'template',
                doc_count: 2,
                subtypes: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'dispatcher-servlet',
                      doc_count: 2,
                      total_self_time_per_subtype: {
                        value: 28.0
                      }
                    }
                  ]
                }
              }
            ]
          },
          total_transaction_breakdown_count: {
            value: 131.0
          },
          sum_all_self_times: {
            value: 9892.0
          }
        }
      ]
    },
    types: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'app',
          doc_count: 3566,
          subtypes: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '',
                doc_count: 3566,
                total_self_time_per_subtype: {
                  value: 1.1162176e7
                }
              }
            ]
          }
        },
        {
          key: 'db',
          doc_count: 2303,
          subtypes: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'postgresql',
                doc_count: 2303,
                total_self_time_per_subtype: {
                  value: 977558.0
                }
              }
            ]
          }
        },
        {
          key: 'template',
          doc_count: 503,
          subtypes: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'dispatcher-servlet',
                doc_count: 503,
                total_self_time_per_subtype: {
                  value: 562567.0
                }
              }
            ]
          }
        },
        {
          key: 'external',
          doc_count: 459,
          subtypes: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'http',
                doc_count: 459,
                total_self_time_per_subtype: {
                  value: 7935715.0
                }
              }
            ]
          }
        }
      ]
    },
    total_transaction_breakdown_count: {
      value: 9574.0
    },
    sum_all_self_times: {
      value: 2.0638016e7
    }
  }
};
