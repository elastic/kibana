/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { JsonObject } from '@kbn/utility-types';
import type { MonitoredHealth } from '../routes/health';
import type { NodeMetrics } from '../routes/metrics';
import type { RawMonitoredStat } from '../monitoring/monitoring_stats_stream';
import type { ConfigStat } from '../monitoring/configuration_statistics';
import type { SummarizedWorkloadStat } from '../monitoring/workload_statistics';
import type { SummarizedTaskRunStat } from '../monitoring/task_run_statistics';
import type { CapacityEstimationStat } from '../monitoring/capacity_estimation';
import type { AveragedStat } from '../monitoring/task_run_calculators';
import type { Metric } from '../metrics/metrics_stream';
import type { SerializedHistogram } from '../metrics/lib';
import type { TaskClaimMetric } from '../metrics/task_claim_metrics_aggregator';
import type { TaskRunMetric } from '../metrics/task_run_metrics_aggregator';
import type { TaskOverdueMetric } from '../metrics/task_overdue_metrics_aggregator';
import type { TaskBackpressureMetric } from '../metrics/task_backpressure_metrics_aggregator';

const POLLING_STAT_KEYS = [
  'last_successful_poll',
  'last_polling_delay',
  'duration',
  'claim_duration',
  'claim_conflicts',
  'claim_mismatches',
  'claim_stale_tasks',
  'result_frequency_percent_as_number',
  'persistence',
] as const;

const redactAveragedStat = ({ p50, p90, p95, p99 }: AveragedStat): AveragedStat => ({
  p50,
  p90,
  p95,
  p99,
});

const redactHistogram = ({ counts, values }: SerializedHistogram): SerializedHistogram => ({
  counts,
  values,
});

const redactMonitoredStat = <T extends JsonObject>(
  stat: RawMonitoredStat<T> | undefined,
  redactValue: (value: T) => T
): RawMonitoredStat<T> | undefined =>
  stat && {
    timestamp: stat.timestamp,
    status: stat.status,
    reason: stat.reason,
    value: redactValue(stat.value),
  };

const redactConfiguration = ({
  poll_interval,
  claim_strategy,
  request_capacity,
  monitored_aggregated_stats_refresh_rate,
  monitored_stats_running_average_window,
  monitored_task_execution_thresholds: {
    default: { error_threshold, warn_threshold },
  },
  capacity: { config, as_workers, as_cost },
  execution_control: { paused },
}: ConfigStat): ConfigStat => ({
  poll_interval,
  claim_strategy,
  request_capacity,
  monitored_aggregated_stats_refresh_rate,
  monitored_stats_running_average_window,
  monitored_task_execution_thresholds: {
    default: { error_threshold, warn_threshold },
    custom: {},
  },
  capacity: { config, as_workers, as_cost },
  execution_control: { paused, paused_task_types: [] },
});

const redactWorkload = ({
  count,
  cost,
  non_recurring,
  non_recurring_cost,
  overdue,
  overdue_cost,
  overdue_non_recurring,
  estimated_schedule_density,
  capacity_requirements: { per_minute, per_hour, per_day },
}: SummarizedWorkloadStat): SummarizedWorkloadStat => ({
  count,
  cost,
  task_types: {},
  schedule: [],
  non_recurring,
  non_recurring_cost,
  overdue,
  overdue_cost,
  overdue_non_recurring,
  estimated_schedule_density,
  capacity_requirements: { per_minute, per_hour, per_day },
});

const redactRuntime = ({
  drift,
  load,
  polling,
  execution: {
    duration_by_persistence: { recurring, non_recurring },
    persistence,
  },
}: SummarizedTaskRunStat): SummarizedTaskRunStat => ({
  drift: redactAveragedStat(drift),
  drift_by_type: {},
  load: redactAveragedStat(load),
  execution: {
    duration: {},
    duration_by_persistence: {
      ...(recurring ? { recurring: redactAveragedStat(recurring) } : {}),
      ...(non_recurring ? { non_recurring: redactAveragedStat(non_recurring) } : {}),
    },
    result_frequency_percent_as_number: {},
    persistence: { recurring: persistence.recurring, non_recurring: persistence.non_recurring },
  },
  polling: pick(polling, POLLING_STAT_KEYS),
});

const redactCapacityEstimation = ({
  observed: {
    observed_kibana_instances,
    max_throughput_per_minute,
    max_throughput_per_minute_per_kibana,
    minutes_to_drain_overdue,
    avg_required_throughput_per_minute,
    avg_required_throughput_per_minute_per_kibana,
    avg_recurring_required_throughput_per_minute,
    avg_recurring_required_throughput_per_minute_per_kibana,
  },
  proposed,
}: CapacityEstimationStat): CapacityEstimationStat => ({
  observed: {
    observed_kibana_instances,
    max_throughput_per_minute,
    max_throughput_per_minute_per_kibana,
    minutes_to_drain_overdue,
    avg_required_throughput_per_minute,
    avg_required_throughput_per_minute_per_kibana,
    avg_recurring_required_throughput_per_minute,
    avg_recurring_required_throughput_per_minute_per_kibana,
  },
  proposed: {
    provisioned_kibana: proposed.provisioned_kibana,
    min_required_kibana: proposed.min_required_kibana,
    avg_recurring_required_throughput_per_minute_per_kibana:
      proposed.avg_recurring_required_throughput_per_minute_per_kibana,
    avg_required_throughput_per_minute_per_kibana:
      proposed.avg_required_throughput_per_minute_per_kibana,
  },
});

/**
 * Keeps only the `_health` fields that don't identify task types, emptying the rest so the response shape stays stable.
 */
export const redactHealth = ({
  id,
  timestamp,
  status,
  reason,
  last_update,
  stats,
}: MonitoredHealth): MonitoredHealth => ({
  id,
  timestamp,
  status,
  reason,
  last_update,
  stats: {
    configuration: redactMonitoredStat(stats.configuration, redactConfiguration),
    workload: redactMonitoredStat(stats.workload, redactWorkload),
    runtime: redactMonitoredStat(stats.runtime, redactRuntime),
    capacity_estimation: redactMonitoredStat(stats.capacity_estimation, redactCapacityEstimation),
  },
});

const redactMetric = <T extends JsonObject>(
  metric: Metric<T> | undefined,
  redactValue: (value: T) => T
): Metric<T> | undefined =>
  metric && { timestamp: metric.timestamp, value: redactValue(metric.value) };

const redactTaskClaim = ({
  success,
  total,
  total_errors,
  duration,
  duration_values,
}: TaskClaimMetric): TaskClaimMetric => ({
  success,
  total,
  total_errors,
  duration: redactHistogram(duration),
  duration_values,
});

const redactTaskRun = ({
  overall: {
    success,
    not_timed_out,
    total,
    total_errors,
    rescheduled_failures,
    user_errors,
    framework_errors,
    delay,
    delay_values,
  },
}: TaskRunMetric): TaskRunMetric => ({
  overall: {
    success,
    not_timed_out,
    total,
    total_errors,
    rescheduled_failures,
    user_errors,
    framework_errors,
    delay: redactHistogram(delay),
    delay_values,
  },
  by_type: {},
});

const redactTaskOverdue = ({
  overall: { overdue_by, overdue_by_values },
}: TaskOverdueMetric): TaskOverdueMetric => ({
  overall: { overdue_by: redactHistogram(overdue_by), overdue_by_values },
  by_type: {},
});

const redactTaskBackpressure = ({
  active,
  reason,
}: TaskBackpressureMetric): TaskBackpressureMetric => ({ active, reason });

/**
 * Keeps only the `metrics` fields that don't identify task types, emptying the rest so the response shape stays stable.
 */
export const redactMetrics = ({
  process_uuid,
  timestamp,
  last_update,
  metrics,
}: NodeMetrics): NodeMetrics => ({
  process_uuid,
  timestamp,
  last_update,
  metrics: metrics && {
    task_claim: redactMetric(metrics.task_claim, redactTaskClaim),
    task_run: redactMetric(metrics.task_run, redactTaskRun),
    task_overdue: redactMetric(metrics.task_overdue, redactTaskOverdue),
    task_backpressure: redactMetric(metrics.task_backpressure, redactTaskBackpressure),
  },
});
