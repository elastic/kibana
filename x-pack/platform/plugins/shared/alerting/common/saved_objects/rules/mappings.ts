/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const alertMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    enabled: {
      type: 'boolean',
    },
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          normalizer: 'lowercase',
        },
      },
    },
    tags: {
      type: 'keyword',
    },
    alertTypeId: {
      type: 'keyword',
    },
    schedule: {
      properties: {
        interval: {
          type: 'keyword',
        },
      },
    },
    consumer: {
      type: 'keyword',
    },
    legacyId: {
      type: 'keyword',
    },
    actions: {
      dynamic: false,
      type: 'nested',
      properties: {
        group: {
          type: 'keyword',
        },
        actionRef: {
          type: 'keyword',
        },
        actionTypeId: {
          type: 'keyword',
        },
        // NO NEED TO BE INDEXED
        // params: {
        //   dynamic: false,
        //   properties: {},
        // },
        // frequency: {
        //   properties: {
        //     summary: {
        //       index: false,
        //       type: 'boolean',
        //     },
        //     notifyWhen: {
        //       index: false,
        //       type: 'keyword',
        //     },
        //     throttle: {
        //       index: false,
        //       type: 'keyword',
        //     },
        //   },
        // },
      },
    },
    params: {
      type: 'flattened',
      ignore_above: 4096,
    },
    mapped_params: {
      properties: {
        risk_score: {
          type: 'float',
        },
        severity: {
          type: 'keyword',
        },
      },
    },
    scheduledTaskId: {
      type: 'keyword',
    },
    createdBy: {
      type: 'keyword',
    },
    updatedBy: {
      type: 'keyword',
    },
    createdAt: {
      type: 'date',
    },
    updatedAt: {
      type: 'date',
    },
    // NEED TO CHECK WITH KIBANA SECURITY
    // apiKey: {
    //   type: 'binary',
    // },
    // NO NEED TO BE INDEXED
    // apiKeyOwner: {
    //   type: 'keyword',
    // },
    throttle: {
      type: 'keyword',
    },
    notifyWhen: {
      type: 'keyword',
    },
    muteAll: {
      type: 'boolean',
    },
    mutedInstanceIds: {
      type: 'keyword',
    },
    // NO NEED TO BE INDEXED
    // meta: {
    //   properties: {
    //     versionApiKeyLastmodified: {
    //       type: 'keyword',
    //     },
    //   },
    // },
    monitoring: {
      properties: {
        run: {
          properties: {
            // history: {
            //   properties: {
            //     duration: {
            //       type: 'long',
            //     },
            //     success: {
            //       type: 'boolean',
            //     },
            //     timestamp: {
            //       type: 'date',
            //     },
            //     outcome: {
            //       type: 'keyword',
            //     },
            //   },
            // },
            calculated_metrics: {
              properties: {
                p50: {
                  type: 'long',
                },
                p95: {
                  type: 'long',
                },
                p99: {
                  type: 'long',
                },
                success_ratio: {
                  type: 'float',
                },
              },
            },
            last_run: {
              properties: {
                timestamp: {
                  type: 'date',
                },
                metrics: {
                  properties: {
                    duration: {
                      type: 'long',
                    },
                    total_search_duration_ms: {
                      type: 'long',
                    },
                    total_indexing_duration_ms: {
                      type: 'long',
                    },
                    total_alerts_detected: {
                      type: 'float',
                    },
                    total_alerts_created: {
                      type: 'float',
                    },
                    gap_duration_s: {
                      type: 'float',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    // There is need to query for a rule by a specific revision
    revision: {
      type: 'long',
    },
    snoozeSchedule: {
      type: 'nested',
      properties: {
        id: {
          type: 'keyword',
        },
        duration: {
          type: 'long',
        },
        skipRecurrences: {
          type: 'date',
          format: 'strict_date_time',
        },
        // NO NEED TO BE INDEXED
        // rRule: rRuleMappingsField,
      },
    },
    // NO NEED TO BE INDEXED
    // flapping: {
    //   index: false,
    //   properties: {
    //     lookBackWindow: {
    //       type: 'long',
    //     },
    //     statusChangeThreshold: {
    //       type: 'long',
    //     },
    //   },
    // },
    // NO NEED TO BE INDEXED
    // nextRun: {
    //   type: 'date',
    // },
    // Deprecated, if you need to add new property please do it in `last_run`
    executionStatus: {
      properties: {
        numberOfTriggeredActions: {
          type: 'long',
        },
        status: {
          type: 'keyword',
        },
        lastExecutionDate: {
          type: 'date',
        },
        lastDuration: {
          type: 'long',
        },
        error: {
          properties: {
            reason: {
              type: 'keyword',
            },
            message: {
              type: 'keyword',
            },
          },
        },
        warning: {
          properties: {
            reason: {
              type: 'keyword',
            },
            message: {
              type: 'keyword',
            },
          },
        },
      },
    },
    lastRun: {
      properties: {
        outcome: {
          type: 'keyword',
        },
        outcomeOrder: {
          type: 'float',
        },
        // NO NEED TO BE INDEXED
        // warning: {
        //   type: 'text',
        // },
        // outcomeMsg: {
        //   type: 'text',
        // },
        alertsCount: {
          properties: {
            active: {
              type: 'float',
            },
            new: {
              type: 'float',
            },
            recovered: {
              type: 'float',
            },
            ignored: {
              type: 'float',
            },
          },
        },
      },
    },
    running: {
      type: 'boolean',
    },
  },
};
