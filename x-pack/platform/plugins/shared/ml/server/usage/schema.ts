/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { MlUsageData } from './collector';

export const mlUsageCollectorSchema: MakeSchemaFrom<MlUsageData> = {
  alertRules: {
    'xpack.ml.anomaly_detection_alert': {
      count_by_result_type: {
        record: {
          type: 'long',
          _meta: { description: 'total number of alerting rules using record result type' },
        },
        influencer: {
          type: 'long',
          _meta: { description: 'total number of alerting rules using influencer result type' },
        },
        bucket: {
          type: 'long',
          _meta: { description: 'total number of alerting rules using bucket result type' },
        },
      },
      count_with_kql_filter: {
        record: {
          type: 'long',
          _meta: {
            description:
              'total number of alerting rules using record result type with a KQL filter',
          },
        },
        influencer: {
          type: 'long',
          _meta: {
            description:
              'total number of alerting rules using influencer result type with a KQL filter',
          },
        },
      },
    },
    'xpack.ml.anomaly_detection_jobs_health': {
      count_by_check_type: {
        datafeed: {
          type: 'long',
          _meta: {
            description:
              'total number of alerting rules performing the not started datafeed health check',
          },
        },
        mml: {
          type: 'long',
          _meta: {
            description:
              'total number of alerting rules performing the model memory limit health check',
          },
        },
        delayedData: {
          type: 'long',
          _meta: {
            description: 'total number of alerting rules performing the delayed data health check',
          },
        },
        errorMessages: {
          type: 'long',
          _meta: {
            description:
              'total number of alerting rules performing the error messages health check',
          },
        },
      },
    },
  },
  custom_rules: {
    total_count: {
      type: 'long',
      _meta: { description: 'Total number of custom rules across all detectors in all jobs' },
    },
    jobs_with_rules_count: {
      type: 'long',
      _meta: {
        description: 'Number of jobs that have at least one custom rule on any detector',
      },
    },
    detectors_with_rules_count: {
      type: 'long',
      _meta: {
        description: 'Number of detectors that have at least one custom rule',
      },
    },
    count_by_action: {
      skip_result: {
        type: 'long',
        _meta: { description: 'Number of rules with the skip_result action' },
      },
      skip_model_update: {
        type: 'long',
        _meta: { description: 'Number of rules with the skip_model_update action' },
      },
    },
    count_with_conditions: {
      type: 'long',
      _meta: { description: 'Number of rules that have one or more numeric conditions' },
    },
    count_with_scope: {
      type: 'long',
      _meta: { description: 'Number of rules that have scope (filter list) configuration' },
    },
  },
  calendars: {
    total_count: {
      type: 'long',
      _meta: { description: 'Total number of calendars (standard and DST combined)' },
    },
    dst_calendars_count: {
      type: 'long',
      _meta: {
        description: 'Number of DST calendars, identified by events with a force_time_shift field',
      },
    },
    standard_calendars_count: {
      type: 'long',
      _meta: { description: 'Number of standard (non-DST) calendars' },
    },
    global_calendars_count: {
      type: 'long',
      _meta: {
        description: "Number of calendars applied to all jobs (job_ids contains '_all')",
      },
    },
    calendars_with_jobs_count: {
      type: 'long',
      _meta: {
        description: 'Number of non-global calendars assigned to at least one job or job group',
      },
    },
    standard_events_count: {
      type: 'long',
      _meta: {
        description:
          'Total number of scheduled events across all standard (non-DST) calendars. DST event counts are excluded because they are auto-generated.',
      },
    },
  },
  filter_lists: {
    total_filter_list_count: {
      type: 'long',
      _meta: { description: 'Total number of ML filter lists' },
    },
    total_filter_item_count: {
      type: 'long',
      _meta: { description: 'Total number of items across all filter lists' },
    },
    avg_items_per_filter_list: {
      type: 'float',
      _meta: {
        description: 'Average number of items per filter list, rounded to 2 decimal places',
      },
    },
    empty_filter_list_count: {
      type: 'long',
      _meta: { description: 'Number of filter lists that contain no items' },
    },
    filter_lists_used_in_rules_count: {
      type: 'long',
      _meta: {
        description:
          'Number of filter lists referenced by at least one custom rule scope across all jobs',
      },
    },
  },
};
