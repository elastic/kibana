/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_RESULTS_INDEX_PATTERN } from '../../../../../common/constants/index_patterns';

export const watch = {
  trigger: {
    schedule: {
      interval: '60s',
    },
  },
  input: {
    search: {
      request: {
        search_type: 'query_then_fetch',
        indices: [ML_RESULTS_INDEX_PATTERN],
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    job_id: null,
                  },
                },
                {
                  range: {
                    timestamp: {
                      gte: null,
                    },
                  },
                },
                {
                  terms: {
                    result_type: ['bucket', 'record', 'influencer'],
                  },
                },
              ],
            },
          },
          aggs: {
            bucket_results: {
              filter: {
                range: {
                  anomaly_score: {
                    gte: null,
                  },
                },
              },
              aggs: {
                top_bucket_hits: {
                  top_hits: {
                    sort: [
                      {
                        anomaly_score: {
                          order: 'desc',
                        },
                      },
                    ],
                    _source: {
                      includes: [
                        'job_id',
                        'result_type',
                        'timestamp',
                        'anomaly_score',
                        'is_interim',
                      ],
                    },
                    size: 1,
                    script_fields: {
                      start: {
                        script: {
                          lang: 'painless',
                          source: `LocalDateTime.ofEpochSecond((doc["timestamp"].value.getMillis()-((doc["bucket_span"].value * 1000)
 * params.padding)) / 1000, 0, ZoneOffset.UTC).toString()+\":00.000Z\"`,
                          params: {
                            padding: 10,
                          },
                        },
                      },
                      end: {
                        script: {
                          lang: 'painless',
                          source: `LocalDateTime.ofEpochSecond((doc["timestamp"].value.getMillis()+((doc["bucket_span"].value * 1000)
 * params.padding)) / 1000, 0, ZoneOffset.UTC).toString()+\":00.000Z\"`,
                          params: {
                            padding: 10,
                          },
                        },
                      },
                      timestamp_epoch: {
                        script: {
                          lang: 'painless',
                          source: 'doc["timestamp"].value.getMillis()/1000',
                        },
                      },
                      timestamp_iso8601: {
                        script: {
                          lang: 'painless',
                          source: 'doc["timestamp"].value',
                        },
                      },
                      score: {
                        script: {
                          lang: 'painless',
                          source: 'Math.round(doc["anomaly_score"].value)',
                        },
                      },
                    },
                  },
                },
              },
            },
            influencer_results: {
              filter: {
                range: {
                  influencer_score: {
                    gte: 3,
                  },
                },
              },
              aggs: {
                top_influencer_hits: {
                  top_hits: {
                    sort: [
                      {
                        influencer_score: {
                          order: 'desc',
                        },
                      },
                    ],
                    _source: {
                      includes: [
                        'result_type',
                        'timestamp',
                        'influencer_field_name',
                        'influencer_field_value',
                        'influencer_score',
                        'isInterim',
                      ],
                    },
                    size: 3,
                    script_fields: {
                      score: {
                        script: {
                          lang: 'painless',
                          source: 'Math.round(doc["influencer_score"].value)',
                        },
                      },
                    },
                  },
                },
              },
            },
            record_results: {
              filter: {
                range: {
                  record_score: {
                    gte: 3,
                  },
                },
              },
              aggs: {
                top_record_hits: {
                  top_hits: {
                    sort: [
                      {
                        record_score: {
                          order: 'desc',
                        },
                      },
                    ],
                    _source: {
                      includes: [
                        'result_type',
                        'timestamp',
                        'record_score',
                        'is_interim',
                        'function',
                        'field_name',
                        'by_field_value',
                        'over_field_value',
                        'partition_field_value',
                      ],
                    },
                    size: 3,
                    script_fields: {
                      score: {
                        script: {
                          lang: 'painless',
                          source: 'Math.round(doc["record_score"].value)',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  condition: {
    compare: {
      'ctx.payload.aggregations.bucket_results.doc_count': {
        gt: 0,
      },
    },
  },
  actions: {
    log: {
      logging: {
        level: 'info',
        text: '', // this gets populated below.
      },
    },
  },
};

// Add logging text. Broken over a few lines due to its length.
let txt =
  'Alert for job [{{ctx.payload.aggregations.bucket_results.top_bucket_hits.hits.hits.0._source.job_id}}] at ';
txt +=
  '[{{ctx.payload.aggregations.bucket_results.top_bucket_hits.hits.hits.0.fields.timestamp_iso8601.0}}] score ';
txt += '[{{ctx.payload.aggregations.bucket_results.top_bucket_hits.hits.hits.0.fields.score.0}}]';
watch.actions.log.logging.text = txt;
