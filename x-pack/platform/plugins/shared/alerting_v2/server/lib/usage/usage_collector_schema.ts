/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { AlertingV2Usage } from './types';

export const AlertingV2UsageCollectorSchema: MakeSchemaFrom<AlertingV2Usage> = {
  has_errors: {
    type: 'boolean',
    _meta: { description: 'Whether the telemetry task encountered errors during collection.' },
  },
  error_messages: { type: 'array', items: { type: 'keyword' } },
  count_total: {
    type: 'long',
    _meta: { description: 'Total number of alerting v2 rules.' },
  },
  count_enabled: {
    type: 'long',
    _meta: { description: 'Number of enabled alerting v2 rules.' },
  },
  count_by_kind: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of rules by kind.' },
    },
  },
  count_by_schedule: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of rules by schedule interval.' },
    },
  },
  count_by_lookback: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of rules by lookback duration.' },
    },
  },
  count_with_query_condition: {
    type: 'long',
    _meta: { description: 'Number of rules with a query condition.' },
  },
  count_with_recovery_policy: {
    type: 'long',
    _meta: { description: 'Number of rules with a recovery policy.' },
  },
  count_by_recovery_policy_type: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of rules by recovery policy type.' },
    },
  },
  count_with_recovery_query_condition: {
    type: 'long',
    _meta: { description: 'Number of rules with a recovery query condition.' },
  },
  avg_pending_count: {
    type: 'float',
    _meta: { description: 'Average configured pending count across rules with state transitions.' },
  },
  avg_recovering_count: {
    type: 'float',
    _meta: {
      description: 'Average configured recovering count across rules with state transitions.',
    },
  },
  count_by_pending_timeframe: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of rules by pending timeframe.' },
    },
  },
  count_by_recovering_timeframe: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of rules by recovering timeframe.' },
    },
  },
  count_with_grouping: {
    type: 'long',
    _meta: { description: 'Number of rules with grouping enabled.' },
  },
  avg_grouping_fields_count: {
    type: 'float',
    _meta: { description: 'Average number of grouping fields per rule.' },
  },
  count_with_no_data: {
    type: 'long',
    _meta: { description: 'Number of rules with no data handling configured.' },
  },
  count_by_no_data_behavior: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of rules by no data behavior.' },
    },
  },
  count_by_no_data_timeframe: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of rules by no data timeframe.' },
    },
  },
  min_created_at: {
    type: 'date',
    _meta: { description: 'Earliest rule creation date.' },
  },

  executions_count_24hr: {
    type: 'long',
    _meta: { description: 'Total rule executor executions in the last 24 hours.' },
  },
  executions_count_by_status_24hr: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Rule executor executions by outcome status in the last 24 hours.' },
    },
  },
  executions_delay_p50_ms: {
    type: 'float',
    _meta: { description: 'P50 schedule delay in milliseconds over the last 24 hours.' },
  },
  executions_delay_p75_ms: {
    type: 'float',
    _meta: { description: 'P75 schedule delay in milliseconds over the last 24 hours.' },
  },
  executions_delay_p95_ms: {
    type: 'float',
    _meta: { description: 'P95 schedule delay in milliseconds over the last 24 hours.' },
  },
  executions_delay_p99_ms: {
    type: 'float',
    _meta: { description: 'P99 schedule delay in milliseconds over the last 24 hours.' },
  },
  dispatcher_executions_count_24hr: {
    type: 'long',
    _meta: { description: 'Total dispatcher executions in the last 24 hours.' },
  },

  notification_policies_count: {
    type: 'long',
    _meta: { description: 'Total number of notification policies.' },
  },
  notification_policies_unique_workflow_count: {
    type: 'long',
    _meta: { description: 'Number of unique workflows referenced by notification policies.' },
  },
  notification_policies_count_with_matcher: {
    type: 'long',
    _meta: { description: 'Number of notification policies with a matcher.' },
  },
  notification_policies_count_with_group_by: {
    type: 'long',
    _meta: { description: 'Number of notification policies with group by.' },
  },
  notification_policies_avg_group_by_fields_count: {
    type: 'float',
    _meta: { description: 'Average number of group by fields per notification policy.' },
  },
  notification_policies_count_by_throttle_interval: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of notification policies by throttle interval.' },
    },
  },

  alerts_count: {
    type: 'long',
    _meta: { description: 'Total number of alert events.' },
  },
  alerts_count_by_kind: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of alert events by status.' },
    },
  },
  alerts_count_by_source: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of alert events by source.' },
    },
  },
  alerts_count_by_type: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: { description: 'Number of alert events by type.' },
    },
  },
  alerts_episode_count: {
    type: 'long',
    _meta: { description: 'Number of unique alert episodes.' },
  },
  alerts_min_timestamp: {
    type: 'date',
    _meta: { description: 'Earliest alert event timestamp.' },
  },
  alerts_index_size_bytes: {
    type: 'long',
    _meta: { description: 'Size of the alert events data stream in bytes.' },
  },
};
