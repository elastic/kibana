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
    alert: {
      type: 'long',
      _meta: { description: 'Number of rules of kind alert.' },
    },
    signal: {
      type: 'long',
      _meta: { description: 'Number of rules of kind signal.' },
    },
  },
  count_by_schedule: {
    type: 'array',
    items: {
      name: { type: 'keyword', _meta: { description: 'Schedule interval string.' } },
      value: { type: 'long', _meta: { description: 'Number of rules with this schedule.' } },
    },
  },
  count_by_lookback: {
    type: 'array',
    items: {
      name: { type: 'keyword', _meta: { description: 'Lookback duration string.' } },
      value: { type: 'long', _meta: { description: 'Number of rules with this lookback.' } },
    },
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
    type: 'array',
    items: {
      name: { type: 'keyword', _meta: { description: 'Pending timeframe duration string.' } },
      value: {
        type: 'long',
        _meta: { description: 'Number of rules with this pending timeframe.' },
      },
    },
  },
  count_by_recovering_timeframe: {
    type: 'array',
    items: {
      name: { type: 'keyword', _meta: { description: 'Recovering timeframe duration string.' } },
      value: {
        type: 'long',
        _meta: { description: 'Number of rules with this recovering timeframe.' },
      },
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
  min_created_at: {
    type: 'date',
    _meta: { description: 'Earliest rule creation date.' },
  },
  count_by_recovery_strategy: {
    no_breach: {
      type: 'long',
      _meta: { description: 'Number of rules with recovery strategy no_breach.' },
    },
    condition: {
      type: 'long',
      _meta: { description: 'Number of rules with recovery strategy condition.' },
    },
    query: {
      type: 'long',
      _meta: { description: 'Number of rules with recovery strategy query.' },
    },
    manual: {
      type: 'long',
      _meta: { description: 'Number of rules with recovery strategy manual.' },
    },
  },
  count_by_no_data_strategy: {
    ignore: {
      type: 'long',
      _meta: { description: 'Number of rules with no-data strategy ignore.' },
    },
    keep_last: {
      type: 'long',
      _meta: { description: 'Number of rules with no-data strategy keep_last.' },
    },
    resolve: {
      type: 'long',
      _meta: { description: 'Number of rules with no-data strategy resolve.' },
    },
    alert: {
      type: 'long',
      _meta: { description: 'Number of rules with no-data strategy alert.' },
    },
  },

  executions_count_24hr: {
    type: 'long',
    _meta: { description: 'Total rule executor executions in the last 24 hours.' },
  },
  executions_count_by_status_24hr: {
    success: {
      type: 'long',
      _meta: { description: 'Successful rule executor executions in the last 24 hours.' },
    },
    failure: {
      type: 'long',
      _meta: { description: 'Failed rule executor executions in the last 24 hours.' },
    },
    unknown: {
      type: 'long',
      _meta: {
        description: 'Rule executor executions with unknown outcome in the last 24 hours.',
      },
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

  action_policies_count: {
    type: 'long',
    _meta: { description: 'Total number of action policies.' },
  },
  action_policies_unique_workflow_count: {
    type: 'long',
    _meta: { description: 'Number of unique workflows referenced by action policies.' },
  },
  action_policies_count_with_matcher: {
    type: 'long',
    _meta: { description: 'Number of action policies with a matcher.' },
  },
  action_policies_count_with_group_by: {
    type: 'long',
    _meta: { description: 'Number of action policies with group by.' },
  },
  action_policies_avg_group_by_fields_count: {
    type: 'float',
    _meta: { description: 'Average number of group by fields per action policy.' },
  },
  action_policies_count_by_throttle_interval: {
    type: 'array',
    items: {
      name: { type: 'keyword', _meta: { description: 'Throttle interval duration string.' } },
      value: {
        type: 'long',
        _meta: { description: 'Number of action policies with this throttle interval.' },
      },
    },
  },
  action_policies_count_by_status: {
    enabled: {
      type: 'long',
      _meta: { description: 'Number of action policies that are enabled and not snoozed.' },
    },
    disabled: {
      type: 'long',
      _meta: { description: 'Number of action policies that are disabled.' },
    },
    snoozed: {
      type: 'long',
      _meta: { description: 'Number of action policies that are enabled and currently snoozed.' },
    },
  },
  action_policies_count_by_grouping_mode: {
    per_alert: {
      type: 'long',
      _meta: {
        description: 'Number of action policies with grouping mode per_alert (the default).',
      },
    },
    per_field: {
      type: 'long',
      _meta: { description: 'Number of action policies with grouping mode per_field.' },
    },
    all: {
      type: 'long',
      _meta: { description: 'Number of action policies with grouping mode all.' },
    },
  },
  action_policies_count_by_throttle_strategy: {
    on_status_change: {
      type: 'long',
      _meta: { description: 'Number of action policies with throttle strategy on_status_change.' },
    },
    per_status_interval: {
      type: 'long',
      _meta: {
        description: 'Number of action policies with throttle strategy per_status_interval.',
      },
    },
    time_interval: {
      type: 'long',
      _meta: { description: 'Number of action policies with throttle strategy time_interval.' },
    },
    every_time: {
      type: 'long',
      _meta: { description: 'Number of action policies with throttle strategy every_time.' },
    },
    none: {
      type: 'long',
      _meta: { description: 'Number of action policies with no throttle strategy.' },
    },
  },
  action_policies_workflows_per_policy: {
    p50: {
      type: 'float',
      _meta: { description: 'P50 of the number of workflows per action policy (max 10).' },
    },
    p99: {
      type: 'float',
      _meta: { description: 'P99 of the number of workflows per action policy (max 10).' },
    },
    avg: {
      type: 'float',
      _meta: { description: 'Average number of workflows per action policy (max 10).' },
    },
  },
  action_policies_count_with_multiple_workflows: {
    type: 'long',
    _meta: { description: 'Number of action policies with more than one workflow.' },
  },

  dispatcher_alerts_count_by_outcome_24hr: {
    dispatched: {
      type: 'long',
      _meta: { description: 'Sum of alerts in dispatched events over the last 24 hours.' },
    },
    throttled: {
      type: 'long',
      _meta: { description: 'Sum of alerts in throttled events over the last 24 hours.' },
    },
    unmatched: {
      type: 'long',
      _meta: {
        description:
          'Sum of alerts that matched no action policy (unmatched events) over the last 24 hours.',
      },
    },
  },
  dispatcher_action_groups_count_by_outcome_24hr: {
    dispatched: {
      type: 'long',
      _meta: { description: 'Sum of action groups in dispatched events over the last 24 hours.' },
    },
    throttled: {
      type: 'long',
      _meta: { description: 'Sum of action groups in throttled events over the last 24 hours.' },
    },
  },
  dispatcher_unique_alerts_dispatched_count_24hr: {
    type: 'long',
    _meta: {
      description:
        'Approximate number of distinct alerts dispatched over the last 24 hours (cardinality, precision threshold 10000).',
    },
  },
  dispatcher_workflow_executions_count_24hr: {
    type: 'long',
    _meta: {
      description:
        'Approximate number of distinct workflow executions scheduled by the dispatcher over the last 24 hours.',
    },
  },
  dispatcher_unique_workflows_triggered_count_24hr: {
    type: 'long',
    _meta: {
      description:
        'Approximate number of distinct workflows triggered by the dispatcher over the last 24 hours.',
    },
  },
  dispatcher_notifying_executions_count_24hr: {
    type: 'long',
    _meta: {
      description:
        'Approximate number of dispatcher executions that dispatched at least one action group over the last 24 hours.',
    },
  },
  dispatcher_notifying_spaces_count_24hr: {
    type: 'long',
    _meta: {
      description:
        'Approximate number of spaces with at least one dispatched event over the last 24 hours.',
    },
  },
  dispatcher_policies_count_by_activity_24hr: {
    dispatched: {
      type: 'long',
      _meta: {
        description:
          'Number of action policies with at least one dispatched event over the last 24 hours (top 100 policies by event count).',
      },
    },
    throttled: {
      type: 'long',
      _meta: {
        description:
          'Number of action policies with at least one throttled event over the last 24 hours (top 100 policies by event count).',
      },
    },
    failing: {
      type: 'long',
      _meta: {
        description:
          'Number of action policies with at least one dispatch_failed event over the last 24 hours (top 100 policies by event count).',
      },
    },
    broken: {
      type: 'long',
      _meta: {
        description:
          'Number of action policies with at least one dispatch_failed event and no dispatched event over the last 24 hours (top 100 policies by event count).',
      },
    },
  },
  dispatcher_action_groups_dispatched_per_policy_24hr: {
    p50: {
      type: 'float',
      _meta: {
        description:
          'P50 of action groups dispatched per action policy over the last 24 hours (top 100 policies by event count).',
      },
    },
    p99: {
      type: 'float',
      _meta: {
        description:
          'P99 of action groups dispatched per action policy over the last 24 hours (top 100 policies by event count).',
      },
    },
    avg: {
      type: 'float',
      _meta: {
        description:
          'Average action groups dispatched per action policy over the last 24 hours (top 100 policies by event count).',
      },
    },
  },
  dispatcher_alerts_dispatched_per_policy_24hr: {
    p50: {
      type: 'float',
      _meta: {
        description:
          'P50 of alerts dispatched per action policy over the last 24 hours (top 100 policies by event count).',
      },
    },
    p99: {
      type: 'float',
      _meta: {
        description:
          'P99 of alerts dispatched per action policy over the last 24 hours (top 100 policies by event count).',
      },
    },
    avg: {
      type: 'float',
      _meta: {
        description:
          'Average alerts dispatched per action policy over the last 24 hours (top 100 policies by event count).',
      },
    },
  },
  dispatcher_workflow_executions_per_policy_24hr: {
    p50: {
      type: 'float',
      _meta: {
        description:
          'P50 of distinct workflow executions per action policy over the last 24 hours (top 100 policies by event count).',
      },
    },
    p99: {
      type: 'float',
      _meta: {
        description:
          'P99 of distinct workflow executions per action policy over the last 24 hours (top 100 policies by event count).',
      },
    },
    avg: {
      type: 'float',
      _meta: {
        description:
          'Average distinct workflow executions per action policy over the last 24 hours (top 100 policies by event count).',
      },
    },
  },
  dispatcher_throttle_ratio_per_policy_24hr: {
    p50: {
      type: 'float',
      _meta: {
        description:
          'P50 of throttled / (dispatched + throttled) action groups per action policy over the last 24 hours, range 0-1 (top 100 policies by event count).',
      },
    },
    p99: {
      type: 'float',
      _meta: {
        description:
          'P99 of throttled / (dispatched + throttled) action groups per action policy over the last 24 hours, range 0-1 (top 100 policies by event count).',
      },
    },
    avg: {
      type: 'float',
      _meta: {
        description:
          'Average throttled / (dispatched + throttled) action groups per action policy over the last 24 hours, range 0-1 (top 100 policies by event count).',
      },
    },
  },
  dispatcher_uncovered_rules_count_24hr: {
    type: 'long',
    _meta: {
      description:
        'Approximate number of distinct rules whose alerts matched no action policy over the last 24 hours.',
    },
  },
  dispatcher_dispatch_failures_count_by_reason_24hr: {
    missing_api_key: {
      type: 'long',
      _meta: {
        description:
          'Number of failed dispatches over the last 24 hours because the policy had no API key.',
      },
    },
    workflow_not_found: {
      type: 'long',
      _meta: {
        description:
          'Number of failed dispatches over the last 24 hours because the workflow was not found.',
      },
    },
    workflow_disabled: {
      type: 'long',
      _meta: {
        description:
          'Number of failed dispatches over the last 24 hours because the workflow was disabled.',
      },
    },
    schedule_error: {
      type: 'long',
      _meta: {
        description:
          'Number of failed dispatches over the last 24 hours because scheduling the workflow failed.',
      },
    },
    license_not_supported: {
      type: 'long',
      _meta: {
        description:
          'Number of failed dispatches over the last 24 hours because the license does not support action policies.',
      },
    },
  },
  dispatcher_action_groups_dispatched_per_policy_by_grouping_mode_24hr: {
    per_alert: {
      p50: {
        type: 'float',
        _meta: {
          description:
            'P50 of action groups dispatched per action policy with grouping mode per_alert over the last 24 hours (top 100 policies by event count; events without grouping_mode are excluded).',
        },
      },
      p99: {
        type: 'float',
        _meta: {
          description:
            'P99 of action groups dispatched per action policy with grouping mode per_alert over the last 24 hours (top 100 policies by event count; events without grouping_mode are excluded).',
        },
      },
      avg: {
        type: 'float',
        _meta: {
          description:
            'Average action groups dispatched per action policy with grouping mode per_alert over the last 24 hours (top 100 policies by event count; events without grouping_mode are excluded).',
        },
      },
    },
    per_field: {
      p50: {
        type: 'float',
        _meta: {
          description:
            'P50 of action groups dispatched per action policy with grouping mode per_field over the last 24 hours (top 100 policies by event count; events without grouping_mode are excluded).',
        },
      },
      p99: {
        type: 'float',
        _meta: {
          description:
            'P99 of action groups dispatched per action policy with grouping mode per_field over the last 24 hours (top 100 policies by event count; events without grouping_mode are excluded).',
        },
      },
      avg: {
        type: 'float',
        _meta: {
          description:
            'Average action groups dispatched per action policy with grouping mode per_field over the last 24 hours (top 100 policies by event count; events without grouping_mode are excluded).',
        },
      },
    },
    all: {
      p50: {
        type: 'float',
        _meta: {
          description:
            'P50 of action groups dispatched per action policy with grouping mode all over the last 24 hours (top 100 policies by event count; events without grouping_mode are excluded).',
        },
      },
      p99: {
        type: 'float',
        _meta: {
          description:
            'P99 of action groups dispatched per action policy with grouping mode all over the last 24 hours (top 100 policies by event count; events without grouping_mode are excluded).',
        },
      },
      avg: {
        type: 'float',
        _meta: {
          description:
            'Average action groups dispatched per action policy with grouping mode all over the last 24 hours (top 100 policies by event count; events without grouping_mode are excluded).',
        },
      },
    },
  },
  dispatcher_action_groups_throttled_count_by_strategy_24hr: {
    on_status_change: {
      type: 'long',
      _meta: {
        description:
          'Sum of action groups throttled over the last 24 hours by policies with throttle strategy on_status_change.',
      },
    },
    per_status_interval: {
      type: 'long',
      _meta: {
        description:
          'Sum of action groups throttled over the last 24 hours by policies with throttle strategy per_status_interval.',
      },
    },
    time_interval: {
      type: 'long',
      _meta: {
        description:
          'Sum of action groups throttled over the last 24 hours by policies with throttle strategy time_interval.',
      },
    },
    every_time: {
      type: 'long',
      _meta: {
        description:
          'Sum of action groups throttled over the last 24 hours by policies with throttle strategy every_time.',
      },
    },
  },

  alerts_count: {
    type: 'long',
    _meta: { description: 'Total number of alert events.' },
  },
  alerts_count_by_kind: {
    breached: {
      type: 'long',
      _meta: { description: 'Number of alert events with status breached.' },
    },
    recovered: {
      type: 'long',
      _meta: { description: 'Number of alert events with status recovered.' },
    },
    no_data: {
      type: 'long',
      _meta: { description: 'Number of alert events with status no_data.' },
    },
  },
  alerts_count_by_source: {
    type: 'array',
    items: {
      name: { type: 'keyword', _meta: { description: 'Alert source.' } },
      value: { type: 'long', _meta: { description: 'Number of alert events from this source.' } },
    },
  },
  alerts_count_by_type: {
    signal: {
      type: 'long',
      _meta: { description: 'Number of alert events of type signal.' },
    },
    alert: {
      type: 'long',
      _meta: { description: 'Number of alert events of type alert.' },
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
