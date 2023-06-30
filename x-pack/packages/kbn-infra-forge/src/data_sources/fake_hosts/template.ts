/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const template = {
  order: 1,
  index_patterns: ['kbn-data-forge*'],
  settings: {
    index: {
      mapping: {
        total_fields: {
          limit: '10000',
        },
      },
      number_of_shards: '1',
      number_of_replicas: '0',
      query: {
        default_field: ['message', 'labels.*', 'event.*'],
      },
    },
  },
  mappings: {
    dynamic_templates: [
      {
        labels: {
          path_match: 'labels.*',
          mapping: {
            type: 'keyword',
          },
          match_mapping_type: 'string',
        },
      },
      {
        strings_as_keyword: {
          mapping: {
            ignore_above: 1024,
            type: 'keyword',
          },
          match_mapping_type: 'string',
        },
      },
    ],
    date_detection: false,
    properties: {
      '@timestamp': {
        type: 'date',
      },
      tags: {
        type: 'keyword',
      },
      metricset: {
        properties: {
          period: {
            type: 'long',
          },
        },
      },
      host: {
        properties: {
          name: {
            type: 'keyword',
            ignore_above: 256,
          },
          network: {
            properties: {
              name: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
        },
      },
      event: {
        properties: {
          dataset: {
            type: 'keyword',
            ignore_above: 256,
          },
          module: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      system: {
        properties: {
          cpu: {
            properties: {
              cores: {
                type: 'long',
              },
              total: {
                properties: {
                  norm: {
                    properties: {
                      pct: {
                        scaling_factor: 1000,
                        type: 'scaled_float',
                      },
                    },
                  },
                },
              },
              user: {
                properties: {
                  pct: {
                    scaling_factor: 1000,
                    type: 'scaled_float',
                  },
                  norm: {
                    properties: {
                      pct: {
                        scaling_factor: 1000,
                        type: 'scaled_float',
                      },
                    },
                  },
                },
              },
              system: {
                properties: {
                  pct: {
                    scaling_factor: 1000,
                    type: 'scaled_float',
                  },
                },
              },
            },
          },
          network: {
            properties: {
              name: {
                type: 'keyword',
                ignore_above: 256,
              },
              in: {
                properties: {
                  bytes: {
                    type: 'long',
                  },
                },
              },
              out: {
                properties: {
                  bytes: {
                    type: 'long',
                  },
                },
              },
            },
          },
        },
      },
      container: {
        properties: {
          id: {
            type: 'keyword',
            ignore_above: 256,
          },
          name: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
    },
  },
  aliases: {
    'metrics-fake_hosts': {},
  },
};
