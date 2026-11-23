/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawMonitoringStats } from '../monitoring';
import { HealthStatus } from '../monitoring';
import type { Metrics } from '../metrics';
import type { NodeMetrics } from '../routes/metrics';

export const MOCK_TASK_TYPE = 'alerting:siem.queryRule';
export const MOCK_TASK_TYPE_GROUP = 'alerting';
export const MOCK_PAUSED_TASK_TYPE = 'actions:.email';

const timestamp = '2026-11-23T10:00:00.000Z';
const averagedStat = { p50: 1, p90: 2, p95: 3, p99: 4 };
const histogram = { counts: [1, 2], values: [10, 20] };

export const createRawMonitoringStatsWithTaskTypes = (): RawMonitoringStats & {
  stats: Required<RawMonitoringStats['stats']>;
} => ({
  last_update: timestamp,
  stats: {
    configuration: {
      timestamp,
      status: HealthStatus.OK,
      value: {
        poll_interval: 3000,
        claim_strategy: 'mget',
        request_capacity: 1000,
        monitored_aggregated_stats_refresh_rate: 60000,
        monitored_stats_running_average_window: 50,
        monitored_task_execution_thresholds: {
          default: { error_threshold: 90, warn_threshold: 80 },
          custom: { [MOCK_TASK_TYPE]: { error_threshold: 50, warn_threshold: 40 } },
        },
        capacity: { config: 10, as_workers: 10, as_cost: 20 },
        execution_control: { paused: false, paused_task_types: [MOCK_PAUSED_TASK_TYPE] },
      },
    },
    workload: {
      timestamp,
      status: HealthStatus.OK,
      value: {
        count: 3,
        cost: 6,
        task_types: { [MOCK_TASK_TYPE]: { count: 3, cost: 6, status: { idle: 3 } } },
        schedule: [['37s', 3]],
        non_recurring: 0,
        non_recurring_cost: 0,
        overdue: 1,
        overdue_cost: 2,
        overdue_non_recurring: 0,
        estimated_schedule_density: [0, 1, 2],
        capacity_requirements: { per_minute: 3, per_hour: 180, per_day: 4320 },
      },
    },
    runtime: {
      timestamp,
      status: HealthStatus.OK,
      value: {
        drift: averagedStat,
        drift_by_type: { [MOCK_TASK_TYPE]: averagedStat },
        load: averagedStat,
        execution: {
          duration: { [MOCK_TASK_TYPE]: averagedStat },
          duration_by_persistence: { recurring: averagedStat, non_recurring: averagedStat },
          result_frequency_percent_as_number: {
            [MOCK_TASK_TYPE]: {
              Success: 100,
              RetryScheduled: 0,
              Failed: 0,
              status: HealthStatus.OK,
            },
          },
          persistence: { recurring: 100, non_recurring: 0 },
        },
        polling: {
          last_successful_poll: timestamp,
          last_polling_delay: timestamp,
          duration: averagedStat,
          claim_duration: averagedStat,
          claim_conflicts: averagedStat,
          claim_mismatches: averagedStat,
          claim_stale_tasks: averagedStat,
          result_frequency_percent_as_number: {
            Failed: 0,
            NoAvailableWorkers: 0,
            NoTasksClaimed: 100,
            RanOutOfCapacity: 0,
            RunningAtCapacity: 0,
            PoolFilled: 0,
          },
          persistence: { recurring: 100, non_recurring: 0 },
        },
      },
    },
    capacity_estimation: {
      timestamp,
      status: HealthStatus.OK,
      reason: 'Task Manager is healthy',
      value: {
        observed: {
          observed_kibana_instances: 1,
          max_throughput_per_minute: 200,
          max_throughput_per_minute_per_kibana: 200,
          minutes_to_drain_overdue: 1,
          avg_required_throughput_per_minute: 3,
          avg_required_throughput_per_minute_per_kibana: 3,
          avg_recurring_required_throughput_per_minute: 3,
          avg_recurring_required_throughput_per_minute_per_kibana: 3,
        },
        proposed: {
          provisioned_kibana: 1,
          min_required_kibana: 1,
          avg_recurring_required_throughput_per_minute_per_kibana: 3,
          avg_required_throughput_per_minute_per_kibana: 3,
        },
      },
    },
  },
});

const taskRunCounts = {
  success: 1,
  not_timed_out: 1,
  total: 1,
  total_errors: 0,
  rescheduled_failures: 0,
  user_errors: 0,
  framework_errors: 0,
};

export const createNodeMetricsWithTaskTypes = (): NodeMetrics & {
  metrics: Required<Metrics['metrics']>;
} => ({
  process_uuid: 'kibana-uuid',
  timestamp,
  last_update: timestamp,
  metrics: {
    task_claim: {
      timestamp,
      value: { success: 1, total: 1, total_errors: 0, duration: histogram, duration_values: [10] },
    },
    task_run: {
      timestamp,
      value: {
        overall: { ...taskRunCounts, delay: histogram, delay_values: [10] },
        by_type: {
          [MOCK_TASK_TYPE.replaceAll('.', '__')]: taskRunCounts,
          [MOCK_TASK_TYPE_GROUP]: taskRunCounts,
        },
      },
    },
    task_overdue: {
      timestamp,
      value: {
        overall: { overdue_by: histogram, overdue_by_values: [10] },
        by_type: {
          [MOCK_TASK_TYPE.replaceAll('.', '__')]: {
            overdue_by: histogram,
            overdue_by_values: [10],
          },
        },
      },
    },
    task_backpressure: { timestamp, value: { active: 0, reason: null } },
  },
});
