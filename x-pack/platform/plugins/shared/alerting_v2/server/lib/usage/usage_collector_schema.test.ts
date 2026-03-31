/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingV2UsageCollectorSchema } from './usage_collector_schema';

describe('AlertingV2 telemetry collector schema', () => {
  test('fields', () => {
    expect(AlertingV2UsageCollectorSchema).toMatchInlineSnapshot(`
      Object {
        "alerts_count": Object {
          "_meta": Object {
            "description": "Total number of alert events.",
          },
          "type": "long",
        },
        "alerts_count_by_kind": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of alert events by status.",
            },
            "type": "long",
          },
        },
        "alerts_count_by_source": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of alert events by source.",
            },
            "type": "long",
          },
        },
        "alerts_count_by_type": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of alert events by type.",
            },
            "type": "long",
          },
        },
        "alerts_episode_count": Object {
          "_meta": Object {
            "description": "Number of unique alert episodes.",
          },
          "type": "long",
        },
        "alerts_index_size_bytes": Object {
          "_meta": Object {
            "description": "Size of the alert events data stream in bytes.",
          },
          "type": "long",
        },
        "alerts_min_timestamp": Object {
          "_meta": Object {
            "description": "Earliest alert event timestamp.",
          },
          "type": "date",
        },
        "avg_grouping_fields_count": Object {
          "_meta": Object {
            "description": "Average number of grouping fields per rule.",
          },
          "type": "float",
        },
        "count_by_kind": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of rules by kind.",
            },
            "type": "long",
          },
        },
        "count_by_lookback": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of rules by lookback duration.",
            },
            "type": "long",
          },
        },
        "count_by_no_data_behavior": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of rules by no data behavior.",
            },
            "type": "long",
          },
        },
        "count_by_no_data_timeframe": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of rules by no data timeframe.",
            },
            "type": "long",
          },
        },
        "count_by_pending_timeframe": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of rules by pending timeframe.",
            },
            "type": "long",
          },
        },
        "count_by_recovering_timeframe": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of rules by recovering timeframe.",
            },
            "type": "long",
          },
        },
        "count_by_recovery_policy_type": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of rules by recovery policy type.",
            },
            "type": "long",
          },
        },
        "count_by_schedule": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of rules by schedule interval.",
            },
            "type": "long",
          },
        },
        "count_enabled": Object {
          "_meta": Object {
            "description": "Number of enabled alerting v2 rules.",
          },
          "type": "long",
        },
        "count_notification_policies": Object {
          "_meta": Object {
            "description": "Total number of notification policies.",
          },
          "type": "long",
        },
        "count_total": Object {
          "_meta": Object {
            "description": "Total number of alerting v2 rules.",
          },
          "type": "long",
        },
        "count_with_grouping": Object {
          "_meta": Object {
            "description": "Number of rules with grouping enabled.",
          },
          "type": "long",
        },
        "count_with_no_data": Object {
          "_meta": Object {
            "description": "Number of rules with no data handling configured.",
          },
          "type": "long",
        },
        "count_with_query_condition": Object {
          "_meta": Object {
            "description": "Number of rules with a query condition.",
          },
          "type": "long",
        },
        "count_with_recovery_policy": Object {
          "_meta": Object {
            "description": "Number of rules with a recovery policy.",
          },
          "type": "long",
        },
        "count_with_recovery_query_condition": Object {
          "_meta": Object {
            "description": "Number of rules with a recovery query condition.",
          },
          "type": "long",
        },
        "error_messages": Object {
          "items": Object {
            "type": "keyword",
          },
          "type": "array",
        },
        "has_errors": Object {
          "_meta": Object {
            "description": "Whether the telemetry task encountered errors during collection.",
          },
          "type": "boolean",
        },
        "min_created_at": Object {
          "_meta": Object {
            "description": "Earliest rule creation date.",
          },
          "type": "date",
        },
        "notification_policies_avg_group_by_fields_count": Object {
          "_meta": Object {
            "description": "Average number of group by fields per notification policy.",
          },
          "type": "float",
        },
        "notification_policies_count": Object {
          "_meta": Object {
            "description": "Total number of notification policies.",
          },
          "type": "long",
        },
        "notification_policies_count_by_throttle_interval": Object {
          "DYNAMIC_KEY": Object {
            "_meta": Object {
              "description": "Number of notification policies by throttle interval.",
            },
            "type": "long",
          },
        },
        "notification_policies_count_with_group_by": Object {
          "_meta": Object {
            "description": "Number of notification policies with group by.",
          },
          "type": "long",
        },
        "notification_policies_count_with_matcher": Object {
          "_meta": Object {
            "description": "Number of notification policies with a matcher.",
          },
          "type": "long",
        },
        "notification_policies_unique_workflow_count": Object {
          "_meta": Object {
            "description": "Number of unique workflows referenced by notification policies.",
          },
          "type": "long",
        },
      }
    `);
  });
});
