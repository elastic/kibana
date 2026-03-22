/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { COMPLIANCE_FINDINGS_LATEST_INDEX } from '../../../common/compliance/constants';

/**
 * Index template for the findings_latest index that contains deduplicated
 * compliance findings (latest finding per host+rule combination).
 * This index is populated by the findings_latest Elasticsearch transform.
 */
export const getFindingsLatestIndexTemplate = (): IndicesPutIndexTemplateRequest => ({
  name: 'endpoint_compliance_findings_latest',
  index_patterns: [`${COMPLIANCE_FINDINGS_LATEST_INDEX}*`],
  priority: 200,
  template: {
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
      refresh_interval: '5s',
      index: {
        lifecycle: {
          name: 'endpoint_compliance_findings_latest_policy',
          rollover_alias: COMPLIANCE_FINDINGS_LATEST_INDEX,
        },
        mapping: {
          total_fields: {
            limit: 1000,
          },
        },
        sort: {
          field: ['rule.benchmark.id', 'rule.id', 'host.id', '@timestamp'],
          order: ['asc', 'asc', 'asc', 'desc'],
        },
      },
      'index.codec': 'best_compression',
    },
    mappings: {
      dynamic: 'strict',
      properties: {
        '@timestamp': {
          type: 'date',
        },
        // Transform aggregation fields
        'rule.id': {
          type: 'keyword',
        },
        'host.id': {
          type: 'keyword',
        },
        latest_finding: {
          type: 'object',
          properties: {
            hits: {
              properties: {
                total: {
                  properties: {
                    value: {
                      type: 'long',
                    },
                    relation: {
                      type: 'keyword',
                    },
                  },
                },
                hits: {
                  type: 'nested',
                  properties: {
                    _index: {
                      type: 'keyword',
                    },
                    _id: {
                      type: 'keyword',
                    },
                    _score: {
                      type: 'float',
                    },
                    _source: {
                      type: 'object',
                      dynamic: true,
                      properties: {
                        '@timestamp': {
                          type: 'date',
                        },
                        result: {
                          properties: {
                            evaluation: {
                              type: 'keyword',
                            },
                            evidence: {
                              type: 'object',
                              enabled: true,
                            },
                          },
                        },
                        rule: {
                          properties: {
                            id: {
                              type: 'keyword',
                            },
                            name: {
                              type: 'text',
                              fields: {
                                keyword: {
                                  type: 'keyword',
                                  ignore_above: 256,
                                },
                              },
                            },
                            description: {
                              type: 'text',
                            },
                            remediation: {
                              type: 'text',
                            },
                            benchmark: {
                              properties: {
                                id: {
                                  type: 'keyword',
                                },
                                name: {
                                  type: 'keyword',
                                },
                                version: {
                                  type: 'keyword',
                                },
                                posture_type: {
                                  type: 'keyword',
                                },
                                rule_number: {
                                  type: 'keyword',
                                },
                              },
                            },
                            section: {
                              type: 'keyword',
                            },
                            level: {
                              type: 'byte',
                            },
                            frameworks: {
                              type: 'nested',
                              properties: {
                                id: {
                                  type: 'keyword',
                                },
                                version: {
                                  type: 'keyword',
                                },
                                control: {
                                  type: 'keyword',
                                },
                              },
                            },
                            tags: {
                              type: 'keyword',
                            },
                          },
                        },
                        host: {
                          properties: {
                            id: {
                              type: 'keyword',
                            },
                            name: {
                              type: 'text',
                              fields: {
                                keyword: {
                                  type: 'keyword',
                                  ignore_above: 256,
                                },
                              },
                            },
                            os: {
                              properties: {
                                family: {
                                  type: 'keyword',
                                },
                                name: {
                                  type: 'keyword',
                                },
                                version: {
                                  type: 'keyword',
                                },
                                platform: {
                                  type: 'keyword',
                                },
                              },
                            },
                          },
                        },
                        agent: {
                          properties: {
                            id: {
                              type: 'keyword',
                            },
                            type: {
                              type: 'keyword',
                            },
                            version: {
                              type: 'keyword',
                            },
                          },
                        },
                        resource: {
                          properties: {
                            type: {
                              type: 'keyword',
                            },
                            sub_type: {
                              type: 'keyword',
                            },
                          },
                        },
                        data_stream: {
                          properties: {
                            dataset: {
                              type: 'keyword',
                            },
                            namespace: {
                              type: 'keyword',
                            },
                            type: {
                              type: 'keyword',
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
        // Aggregated fields for easy querying
        'result.evaluation': {
          properties: {
            buckets: {
              type: 'nested',
              properties: {
                key: {
                  type: 'keyword',
                },
                doc_count: {
                  type: 'long',
                },
              },
            },
          },
        },
        'rule.name': {
          properties: {
            buckets: {
              type: 'nested',
              properties: {
                key: {
                  type: 'keyword',
                },
                doc_count: {
                  type: 'long',
                },
              },
            },
          },
        },
        'rule.benchmark.id': {
          properties: {
            buckets: {
              type: 'nested',
              properties: {
                key: {
                  type: 'keyword',
                },
                doc_count: {
                  type: 'long',
                },
              },
            },
          },
        },
        'rule.section': {
          properties: {
            buckets: {
              type: 'nested',
              properties: {
                key: {
                  type: 'keyword',
                },
                doc_count: {
                  type: 'long',
                },
              },
            },
          },
        },
        'host.name': {
          properties: {
            buckets: {
              type: 'nested',
              properties: {
                key: {
                  type: 'keyword',
                },
                doc_count: {
                  type: 'long',
                },
              },
            },
          },
        },
        'host.os.family': {
          properties: {
            buckets: {
              type: 'nested',
              properties: {
                key: {
                  type: 'keyword',
                },
                doc_count: {
                  type: 'long',
                },
              },
            },
          },
        },
      },
    },
    aliases: {
      [COMPLIANCE_FINDINGS_LATEST_INDEX]: {
        is_write_index: true,
      },
    },
  },
  composed_of: [],
  version: 1,
  _meta: {
    description: 'Index template for deduplicated compliance findings (latest per host+rule)',
    managed: true,
    managed_by: 'osquery',
  },
});