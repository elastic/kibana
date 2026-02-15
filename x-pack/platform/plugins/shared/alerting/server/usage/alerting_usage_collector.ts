/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { get } from 'lodash';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { AlertingUsage } from './types';

const byTypeSchema: MakeSchemaFrom<AlertingUsage>['count_by_type'] = {
  // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
  DYNAMIC_KEY: { type: 'long', _meta: { description: 'Breakdown for other rule types.' } },
  // Known rule types (searching the use of the rules API `registerType`:
  // Built-in
  '__index-threshold': {
    type: 'long',
    _meta: { description: 'Breakdown for index-threshold rule type.' },
  },
  '__es-query': { type: 'long', _meta: { description: 'Breakdown for ES query rule type.' } },
  transform_health: {
    type: 'long',
    _meta: { description: 'Breakdown for transform health rule type.' },
  },
  // APM
  // eslint-disable-next-line @typescript-eslint/naming-convention
  apm__error_rate: {
    type: 'long',
    _meta: { description: 'Breakdown for APM error rate type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  apm__transaction_error_rate: {
    type: 'long',
    _meta: { description: 'Breakdown for APM transaction error rate rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  apm__transaction_duration: {
    type: 'long',
    _meta: { description: 'Breakdown for APM transaction duration rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  apm__transaction_duration_anomaly: {
    type: 'long',
    _meta: { description: 'Breakdown for APM transaction duration anomaly rule type.' },
  },
  apm__anomaly: { type: 'long', _meta: { description: 'Breakdown for APM anomaly rule type.' } }, // eslint-disable-line @typescript-eslint/naming-convention
  // Infra
  // eslint-disable-next-line @typescript-eslint/naming-convention
  metrics__alert__threshold: {
    type: 'long',
    _meta: { description: 'Breakdown for metrics threshold rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  metrics__alert__inventory__threshold: {
    type: 'long',
    _meta: { description: 'Breakdown for inventory threshold rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  logs__alert__document__count: {
    type: 'long',
    _meta: { description: 'Breakdown for log document count rule type.' },
  },
  // Monitoring
  monitoring_alert_cluster_health: {
    type: 'long',
    _meta: { description: 'Breakdown for monitoring cluster health rule type.' },
  },
  monitoring_alert_cpu_usage: {
    type: 'long',
    _meta: { description: 'Breakdown for monitoring CPU usage rule type.' },
  },
  monitoring_alert_disk_usage: {
    type: 'long',
    _meta: { description: 'Breakdown for monitoring disk usage rule type.' },
  },
  monitoring_alert_elasticsearch_version_mismatch: {
    type: 'long',
    _meta: {
      description: 'Breakdown for monitoring Elasticsearch version mismatch rule type.',
    },
  },
  monitoring_alert_kibana_version_mismatch: {
    type: 'long',
    _meta: { description: 'Breakdown for monitoring Kibana version mismatch rule type.' },
  },
  monitoring_alert_license_expiration: {
    type: 'long',
    _meta: { description: 'Breakdown for monitoring license expiration rule type.' },
  },
  monitoring_alert_logstash_version_mismatch: {
    type: 'long',
    _meta: { description: 'Breakdown for Logstash version mismatch rule type.' },
  },
  monitoring_alert_nodes_changed: {
    type: 'long',
    _meta: { description: 'Breakdown for monitoring nodes changed rule type.' },
  },
  // Observability
  // eslint-disable-next-line @typescript-eslint/naming-convention
  observability__rules__custom_threshold: {
    type: 'long',
    _meta: { description: 'Breakdown for custom threshold  rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  xpack__synthetics__alerts__monitorStatus: {
    type: 'long',
    _meta: { description: 'Breakdown for Synthetics monitor status rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  xpack__synthetics__alerts__tls: {
    type: 'long',
    _meta: { description: 'Breakdown for Synthetics TLS rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  slo__rules__burnRate: {
    type: 'long',
    _meta: { description: 'Breakdown for SLO burn rate rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  streams__rules__esql: {
    type: 'long',
    _meta: { description: 'Breakdown for Streams ES|QL rule type.' },
  },
  // Security Solution
  siem__signals: { type: 'long', _meta: { description: 'Breakdown for SIEM signals rule type.' } }, // eslint-disable-line @typescript-eslint/naming-convention
  // eslint-disable-next-line @typescript-eslint/naming-convention
  siem__notifications: {
    type: 'long',
    _meta: { description: 'Breakdown for SIEM notifications rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  siem__eqlRule: {
    type: 'long',
    _meta: { description: 'Breakdown for SIEM EQL rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  siem__indicatorRule: {
    type: 'long',
    _meta: { description: 'Breakdown for SIEM indicator rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  siem__mlRule: {
    type: 'long',
    _meta: { description: 'Breakdown for SIEM ML rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  siem__queryRule: {
    type: 'long',
    _meta: { description: 'Breakdown for SIEM query rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  siem__savedQueryRule: {
    type: 'long',
    _meta: { description: 'Breakdown for SIEM saved query rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  siem__thresholdRule: {
    type: 'long',
    _meta: { description: 'Breakdown for SIEM threshold rule type.' },
  },
  // Uptime
  // eslint-disable-next-line @typescript-eslint/naming-convention
  xpack__uptime__alerts__monitorStatus: {
    type: 'long',
    _meta: { description: 'Breakdown for Uptime monitor status rule type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  xpack__uptime__alerts__tls: {
    type: 'long',
    _meta: { description: 'Breakdown for Uptime TLS rules type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  xpack__uptime__alerts__durationAnomaly: {
    type: 'long',
    _meta: { description: 'Breakdown for Uptime duration anomaly rules type.' },
  },
  // Maps
  '__geo-containment': {
    type: 'long',
    _meta: { description: 'Breakdown for geo-containment rule type.' },
  },
  // ML
  // eslint-disable-next-line @typescript-eslint/naming-convention
  xpack__ml__anomaly_detection_alert: {
    type: 'long',
    _meta: { description: 'Breakdown for ML anomaly detection alert rules type.' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  xpack__ml__anomaly_detection_jobs_health: {
    type: 'long',
    _meta: { description: 'Breakdown for ML anomaly detection jobs health rules type.' },
  },
};

export const NUM_ALERTING_RULE_TYPES = Object.keys(byTypeSchema).length;

const byReasonSchema: MakeSchemaFrom<AlertingUsage>['count_rules_executions_failured_by_reason_per_day'] =
  {
    // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
    DYNAMIC_KEY: { type: 'long' },
    read: { type: 'long' },
    decrypt: { type: 'long' },
    license: { type: 'long' },
    unknown: { type: 'long' },
  };

export const NUM_ALERTING_EXECUTION_FAILURE_REASON_TYPES = Object.keys(byReasonSchema).length;

const byPercentileSchema: MakeSchemaFrom<AlertingUsage>['percentile_num_generated_actions_per_day'] =
  {
    p50: { type: 'long' },
    p90: { type: 'long' },
    p99: { type: 'long' },
  };

const byPercentileSchemaByType: MakeSchemaFrom<AlertingUsage>['percentile_num_generated_actions_by_type_per_day'] =
  {
    p50: byTypeSchema,
    p90: byTypeSchema,
    p99: byTypeSchema,
  };

const byReasonSchemaByType: MakeSchemaFrom<AlertingUsage>['count_rules_executions_failured_by_reason_by_type_per_day'] =
  {
    // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
    DYNAMIC_KEY: byTypeSchema,
    read: byTypeSchema,
    decrypt: byTypeSchema,
    license: byTypeSchema,
    unknown: byTypeSchema,
  };

const byTaskStatusSchema: MakeSchemaFrom<AlertingUsage>['count_failed_and_unrecognized_rule_tasks_by_status_per_day'] =
  {
    // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
    DYNAMIC_KEY: { type: 'long' },
    failed: { type: 'long' },
    unrecognized: { type: 'long' },
  };

const byTaskStatusSchemaByType: MakeSchemaFrom<AlertingUsage>['count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day'] =
  {
    // TODO: Find out an automated way to populate the keys or reformat these into an array (and change the Remote Telemetry indexer accordingly)
    DYNAMIC_KEY: byTypeSchema,
    failed: byTypeSchema,
    unrecognized: byTypeSchema,
  };

const byStatusSchema: MakeSchemaFrom<AlertingUsage>['count_rules_by_execution_status'] = {
  success: { type: 'long' },
  error: { type: 'long' },
  warning: { type: 'long' },
};

const byStatusPerDaySchema: MakeSchemaFrom<AlertingUsage>['count_rules_by_execution_status_per_day'] =
  {
    success: { type: 'long' },
    failure: { type: 'long' },
    unknown: { type: 'long' },
  };

const byNotifyWhenSchema: MakeSchemaFrom<AlertingUsage>['count_rules_by_notify_when'] = {
  on_action_group_change: { type: 'long' },
  on_active_alert: { type: 'long' },
  on_throttle_interval: { type: 'long' },
};

export function createAlertingUsageCollector(
  usageCollection: UsageCollectionSetup,
  taskManager: Promise<TaskManagerStartContract>
) {
  return usageCollection.makeUsageCollector<AlertingUsage>({
    type: 'alerts',
    isReady: async () => {
      await taskManager;
      return true;
    },
    fetch: async () => {
      try {
        const doc = await getLatestTaskState(await taskManager);
        // get the accumulated state from the recurring task
        const { runs, ...state } = get(doc, 'state') as AlertingUsage & { runs: number };

        return state;
      } catch (err) {
        const errMessage = err && err.message ? err.message : err.toString();
        return {
          has_errors: true,
          error_messages: [errMessage],
          count_total: 0,
          count_active_total: 0,
          count_disabled_total: 0,
          throttle_time: {
            min: '0s',
            avg: '0s',
            max: '0s',
          },
          schedule_time: {
            min: '0s',
            avg: '0s',
            max: '0s',
          },
          throttle_time_number_s: {
            min: 0,
            avg: 0,
            max: 0,
          },
          schedule_time_number_s: {
            min: 0,
            avg: 0,
            max: 0,
          },
          connectors_per_alert: {
            min: 0,
            avg: 0,
            max: 0,
          },
          count_active_by_type: {},
          count_by_type: {},
          count_rules_namespaces: 0,
          count_rules_executions_per_day: 0,
          count_rules_executions_by_type_per_day: {},
          count_rules_executions_failured_per_day: 0,
          count_rules_executions_failured_by_reason_per_day: {},
          count_rules_executions_failured_by_reason_by_type_per_day: {},
          count_rules_executions_timeouts_per_day: 0,
          count_rules_executions_timeouts_by_type_per_day: {},
          count_failed_and_unrecognized_rule_tasks_per_day: 0,
          count_failed_and_unrecognized_rule_tasks_by_status_per_day: {},
          count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: {},
          count_rules_by_execution_status: {
            success: 0,
            warning: 0,
            error: 0,
          },
          count_rules_by_notify_when: {
            on_action_group_change: 0,
            on_active_alert: 0,
            on_throttle_interval: 0,
          },
          count_rules_with_tags: 0,
          count_rules_with_elasticagent_tag: 0,
          count_rules_with_elasticagent_tag_by_type: {},
          count_rules_snoozed: 0,
          count_rules_muted: 0,
          count_rules_with_linked_dashboards: 0,
          count_rules_with_investigation_guide: 0,
          count_rules_with_api_key_created_by_user: 0,
          count_mw_total: 0,
          count_mw_with_repeat_toggle_on: 0,
          count_mw_with_filter_alert_toggle_on: 0,
          count_rules_with_muted_alerts: 0,
          count_connector_types_by_consumers: {},
          count_rules_by_execution_status_per_day: {},
          avg_execution_time_per_day: 0,
          avg_execution_time_by_type_per_day: {},
          avg_es_search_duration_per_day: 0,
          avg_es_search_duration_by_type_per_day: {},
          avg_total_search_duration_per_day: 0,
          avg_total_search_duration_by_type_per_day: {},
          percentile_num_generated_actions_per_day: {
            p50: 0,
            p90: 0,
            p99: 0,
          },
          percentile_num_generated_actions_by_type_per_day: {
            p50: {},
            p90: {},
            p99: {},
          },
          percentile_num_alerts_per_day: {
            p50: 0,
            p90: 0,
            p99: 0,
          },
          percentile_num_alerts_by_type_per_day: {
            p50: {},
            p90: {},
            p99: {},
          },
          count_alerts_total: 0,
          count_alerts_by_rule_type: {},
          count_rules_snoozed_by_type: {},
          count_rules_muted_by_type: {},
          count_ignored_fields_by_rule_type: {},
          count_backfill_executions: 0,
          count_backfills_by_execution_status_per_day: {},
          count_gaps: 0,
          total_unfilled_gap_duration_ms: 0,
          total_filled_gap_duration_ms: 0,
        };
      }
    },
    schema: {
      has_errors: { type: 'boolean' },
      error_messages: {
        type: 'array',
        items: { type: 'text' },
      },
      count_total: { type: 'long' },
      count_active_total: { type: 'long' },
      count_disabled_total: { type: 'long' },
      throttle_time: {
        min: { type: 'keyword' },
        avg: { type: 'keyword' },
        max: { type: 'keyword' },
      },
      schedule_time: {
        min: { type: 'keyword' },
        avg: { type: 'keyword' },
        max: { type: 'keyword' },
      },
      throttle_time_number_s: {
        min: { type: 'long' },
        avg: { type: 'float' },
        max: { type: 'long' },
      },
      schedule_time_number_s: {
        min: { type: 'long' },
        avg: { type: 'float' },
        max: { type: 'long' },
      },
      connectors_per_alert: {
        min: { type: 'long' },
        avg: { type: 'float' },
        max: { type: 'long' },
      },
      count_active_by_type: byTypeSchema,
      count_by_type: byTypeSchema,
      count_rules_namespaces: { type: 'long' },
      count_rules_executions_per_day: { type: 'long' },
      count_rules_executions_by_type_per_day: byTypeSchema,
      count_rules_executions_failured_per_day: { type: 'long' },
      count_rules_executions_failured_by_reason_per_day: byReasonSchema,
      count_rules_executions_failured_by_reason_by_type_per_day: byReasonSchemaByType,
      count_rules_executions_timeouts_per_day: { type: 'long' },
      count_rules_executions_timeouts_by_type_per_day: byTypeSchema,
      count_failed_and_unrecognized_rule_tasks_per_day: { type: 'long' },
      count_failed_and_unrecognized_rule_tasks_by_status_per_day: byTaskStatusSchema,
      count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: byTaskStatusSchemaByType,
      count_rules_by_execution_status: byStatusSchema,
      count_rules_with_tags: { type: 'long' },
      count_rules_with_elasticagent_tag: {
        type: 'long',
        _meta: {
          description: 'Count of rules with Elastic Agent tag',
        },
      },
      count_rules_with_elasticagent_tag_by_type: byTypeSchema,
      count_rules_by_notify_when: byNotifyWhenSchema,
      count_rules_snoozed: { type: 'long' },
      count_rules_muted: { type: 'long' },
      count_rules_with_linked_dashboards: { type: 'long' },
      count_rules_with_investigation_guide: { type: 'long' },
      count_rules_with_api_key_created_by_user: {
        type: 'long',
        _meta: {
          description:
            'The total number of rules with API keys that are manually provided by the user, not created by the alerting framework.',
        },
      },
      count_mw_total: { type: 'long' },
      count_mw_with_repeat_toggle_on: { type: 'long' },
      count_mw_with_filter_alert_toggle_on: { type: 'long' },
      count_rules_with_muted_alerts: { type: 'long' },
      count_connector_types_by_consumers: { DYNAMIC_KEY: { DYNAMIC_KEY: { type: 'long' } } },
      count_rules_by_execution_status_per_day: byStatusPerDaySchema,
      avg_execution_time_per_day: { type: 'long' },
      avg_execution_time_by_type_per_day: byTypeSchema,
      avg_es_search_duration_per_day: { type: 'long' },
      avg_es_search_duration_by_type_per_day: byTypeSchema,
      avg_total_search_duration_per_day: { type: 'long' },
      avg_total_search_duration_by_type_per_day: byTypeSchema,
      percentile_num_generated_actions_per_day: byPercentileSchema,
      percentile_num_generated_actions_by_type_per_day: byPercentileSchemaByType,
      percentile_num_alerts_per_day: byPercentileSchema,
      percentile_num_alerts_by_type_per_day: byPercentileSchemaByType,
      count_alerts_total: { type: 'long' },
      count_alerts_by_rule_type: byTypeSchema,
      count_rules_snoozed_by_type: byTypeSchema,
      count_rules_muted_by_type: byTypeSchema,
      count_ignored_fields_by_rule_type: byTypeSchema,
      count_backfill_executions: { type: 'long' },
      count_backfills_by_execution_status_per_day: byStatusPerDaySchema,
      count_gaps: { type: 'long' },
      total_unfilled_gap_duration_ms: { type: 'long' },
      total_filled_gap_duration_ms: { type: 'long' },
    },
  });
}

async function getLatestTaskState(taskManager: TaskManagerStartContract) {
  try {
    const result = await taskManager.get('Alerting-alerting_telemetry');
    return result;
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    /*
      The usage service WILL to try to fetch from this collector before the task manager has been initialized, because the
      task manager has to wait for all plugins to initialize first. It's fine to ignore it as next time around it will be
      initialized (or it will throw a different type of error)
    */
    if (!errMessage.includes('NotInitialized')) {
      throw err;
    }
  }

  return null;
}

export function registerAlertingUsageCollector(
  usageCollection: UsageCollectionSetup,
  taskManager: Promise<TaskManagerStartContract>
) {
  const collector = createAlertingUsageCollector(usageCollection, taskManager);
  usageCollection.registerCollector(collector);
}
