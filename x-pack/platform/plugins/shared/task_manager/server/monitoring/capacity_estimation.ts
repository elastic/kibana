/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import stats from 'stats-lite';
import { JsonObject } from '@kbn/utility-types';
import { Logger } from '@kbn/core/server';
import { RawMonitoringStats, RawMonitoredStat, HealthStatus } from './monitoring_stats_stream';
import { AveragedStat } from './task_run_calculators';
import { TaskPersistenceTypes } from './task_run_statistics';
import { asErr, asOk, map, Result } from '../lib/result_type';

export interface CapacityEstimationStat extends JsonObject {
  observed: {
    observed_kibana_instances: number;
    max_throughput_per_minute: number;
    max_throughput_per_minute_per_kibana: number;
    minutes_to_drain_overdue: number;
    avg_required_throughput_per_minute: number;
    avg_required_throughput_per_minute_per_kibana: number;
    avg_recurring_required_throughput_per_minute: number;
    avg_recurring_required_throughput_per_minute_per_kibana: number;
  };
  proposed: {
    provisioned_kibana: number;
    min_required_kibana: number;
    avg_recurring_required_throughput_per_minute_per_kibana: number;
    avg_required_throughput_per_minute_per_kibana: number;
  };
}

export type CapacityEstimationParams = Omit<
  Required<RawMonitoringStats['stats']>,
  'capacity_estimation'
>;

function isCapacityEstimationParams(
  capacityStats: RawMonitoringStats['stats']
): capacityStats is CapacityEstimationParams {
  return !!(capacityStats.configuration && capacityStats.runtime && capacityStats.workload);
}

export function estimateCapacity(
  logger: Logger,
  capacityStats: CapacityEstimationParams,
  assumedKibanaInstances: number
): RawMonitoredStat<CapacityEstimationStat> {
  const workload = capacityStats.workload.value;

  const {
    load: { p90: averageLoadPercentage },
    execution: { duration_by_persistence: durationByPersistence },
  } = capacityStats.runtime.value;
  const {
    recurring: percentageOfExecutionsUsedByRecurringTasks,
    non_recurring: percentageOfExecutionsUsedByNonRecurringTasks,
  } = capacityStats.runtime.value.execution.persistence;
  const { overdue, capacity_requirements: capacityRequirements } = workload;
  const {
    poll_interval: pollInterval,
    capacity: { config: configuredCapacity },
  } = capacityStats.configuration.value;

  if (!averageLoadPercentage) {
    throw new Error(
      `Task manager had an issue calculating capacity estimation. averageLoadPercentage: ${averageLoadPercentage}`
    );
  }
  /**
   * On average, how many polling cycles does it take to execute a task?
   * If this is higher than the polling cycle, then a whole cycle is wasted as
   * we won't use the worker until the next cycle.
   */
  const averagePollIntervalsPerExecution = Math.ceil(
    map(
      getAverageDuration(durationByPersistence),
      (averageDuration) => Math.max(averageDuration, pollInterval),
      () => pollInterval
    ) / pollInterval
  );

  /**
   * Given the current configuration how much capacity do we have to run normal cost tasks?
   */
  const capacityPerMinutePerKibana = Math.round(
    ((60 * 1000) / (averagePollIntervalsPerExecution * pollInterval)) * configuredCapacity
  );

  /**
   * If our assumption about the number of Kibana is correct - how much capacity do we have available?
   */
  const assumedCapacityAvailablePerMinute = capacityPerMinutePerKibana * assumedKibanaInstances;

  /**
   * assuming this Kibana is representative what capacity has historically been used for the
   * different types at busy times (load at p90)
   */
  const averageCapacityUsedByPersistedTasksPerKibana = percentageOf(
    capacityPerMinutePerKibana,
    percentageOf(
      averageLoadPercentage,
      percentageOfExecutionsUsedByRecurringTasks + percentageOfExecutionsUsedByNonRecurringTasks
    )
  );

  /**
   * On average, how much of this kibana's capacity has been historically used to execute
   * non-recurring tasks
   */
  const averageCapacityUsedByNonRecurringTasksPerKibana = percentageOf(
    capacityPerMinutePerKibana,
    percentageOf(averageLoadPercentage, 100 - percentageOfExecutionsUsedByRecurringTasks)
  );

  /**
   * On average, how much of this kibana's capacity has been historically available
   * for recurring tasks
   */
  const averageCapacityAvailableForRecurringTasksPerKibana =
    capacityPerMinutePerKibana - averageCapacityUsedByNonRecurringTasksPerKibana;

  /**
   * At times a cluster might experience spikes of NonRecurring tasks which swamp Task Manager
   * causing it to spend all its capacity on NonRecurring tasks, which makes it much harder
   * to estimate the required capacity.
   * This is easy to identify as load will usually max out or all the workers are busy executing non-recurring
   * tasks, and none are running recurring tasks.
   */
  const hasTooLittleCapacityToEstimateRequiredNonRecurringCapacity =
    averageLoadPercentage === 100 || averageCapacityAvailableForRecurringTasksPerKibana === 0;

  /**
   * On average, how many tasks per minute does this cluster need to execute?
   */
  const averageRecurringRequiredPerMinute =
    capacityRequirements.per_minute +
    capacityRequirements.per_hour / 60 +
    capacityRequirements.per_day / 24 / 60;

  /**
   * how many Kibana are needed solely for the recurring tasks
   */
  const minRequiredKibanaInstancesForRecurringTasks = Math.ceil(
    averageRecurringRequiredPerMinute / capacityPerMinutePerKibana
  );

  /**
   * assuming each kibana only has as much capacity for recurring tasks as this kibana has historically
   * had available - how many kibana are needed to handle the current recurring workload?
   */
  const minRequiredKibanaInstances = Math.ceil(
    hasTooLittleCapacityToEstimateRequiredNonRecurringCapacity
      ? /*
        if load is at 100% or there's no capacity for recurring tasks at the moment, then it's really difficult for us to assess how
        much capacity is needed for non-recurring tasks at normal times. This might be representative, but it might
        also be a spike and we have no way of knowing that. We'll recommend people scale up by 20% and go from there. */
        minRequiredKibanaInstancesForRecurringTasks * 1.2
      : averageRecurringRequiredPerMinute / averageCapacityAvailableForRecurringTasksPerKibana
  );

  /**
   * Assuming the `minRequiredKibanaInstances` Kibana instances are provisioned - how much
   * of their throughput would we expect to be used by the recurring task workload
   */
  const averageRecurringRequiredPerMinutePerKibana =
    averageRecurringRequiredPerMinute / minRequiredKibanaInstances;

  /**
   * assuming the historical capacity needed for non-recurring tasks, plus
   * the amount we know each kibana would need for recurring tasks, how much capacity would
   * each kibana need if following the minRequiredKibanaInstances?
   */
  const averageRequiredThroughputPerMinutePerKibana =
    averageCapacityUsedByNonRecurringTasksPerKibana *
      (assumedKibanaInstances / minRequiredKibanaInstances) +
    averageRecurringRequiredPerMinute / minRequiredKibanaInstances;

  const assumedAverageRecurringRequiredThroughputPerMinutePerKibana =
    averageRecurringRequiredPerMinute / assumedKibanaInstances;
  /**
   * assuming the historical capacity needed for non-recurring tasks, plus
   * the amount we know each kibana would need for recurring tasks, how much capacity would
   * each kibana need if the assumed current number were correct?
   */
  const assumedRequiredThroughputPerMinutePerKibana =
    averageCapacityUsedByNonRecurringTasksPerKibana +
    averageRecurringRequiredPerMinute / assumedKibanaInstances;

  const { status, reason } = getHealthStatus(logger, {
    assumedRequiredThroughputPerMinutePerKibana,
    assumedAverageRecurringRequiredThroughputPerMinutePerKibana,
    capacityPerMinutePerKibana,
  });
  return {
    status,
    reason,
    timestamp: new Date().toISOString(),
    value: {
      observed: mapValues(
        {
          observed_kibana_instances: assumedKibanaInstances,
          max_throughput_per_minute_per_kibana: capacityPerMinutePerKibana,
          max_throughput_per_minute: assumedCapacityAvailablePerMinute,
          minutes_to_drain_overdue:
            overdue ?? 0 / (assumedKibanaInstances * averageCapacityUsedByPersistedTasksPerKibana),
          avg_recurring_required_throughput_per_minute: averageRecurringRequiredPerMinute,
          avg_recurring_required_throughput_per_minute_per_kibana:
            assumedAverageRecurringRequiredThroughputPerMinutePerKibana,
          avg_required_throughput_per_minute:
            assumedRequiredThroughputPerMinutePerKibana * assumedKibanaInstances,
          avg_required_throughput_per_minute_per_kibana:
            assumedRequiredThroughputPerMinutePerKibana,
        },
        Math.ceil
      ),
      proposed: mapValues(
        {
          provisioned_kibana: minRequiredKibanaInstances,
          min_required_kibana: minRequiredKibanaInstancesForRecurringTasks,
          avg_recurring_required_throughput_per_minute_per_kibana:
            averageRecurringRequiredPerMinutePerKibana,
          avg_required_throughput_per_minute_per_kibana:
            averageRequiredThroughputPerMinutePerKibana,
        },
        Math.ceil
      ),
    },
  };
}

interface GetHealthStatusParams {
  assumedRequiredThroughputPerMinutePerKibana: number;
  assumedAverageRecurringRequiredThroughputPerMinutePerKibana: number;
  capacityPerMinutePerKibana: number;
}

function getHealthStatus(
  logger: Logger,
  params: GetHealthStatusParams
): { status: HealthStatus; reason?: string } {
  const {
    assumedRequiredThroughputPerMinutePerKibana,
    assumedAverageRecurringRequiredThroughputPerMinutePerKibana,
    capacityPerMinutePerKibana,
  } = params;
  if (assumedRequiredThroughputPerMinutePerKibana < capacityPerMinutePerKibana) {
    const reason = `Task Manager is healthy, the assumedRequiredThroughputPerMinutePerKibana (${assumedRequiredThroughputPerMinutePerKibana}) < capacityPerMinutePerKibana (${capacityPerMinutePerKibana})`;
    logger.debug(reason);
    return { status: HealthStatus.OK, reason };
  }

  if (assumedAverageRecurringRequiredThroughputPerMinutePerKibana > capacityPerMinutePerKibana) {
    const reason = `Task Manager is unhealthy, the assumedAverageRecurringRequiredThroughputPerMinutePerKibana (${assumedAverageRecurringRequiredThroughputPerMinutePerKibana}) > capacityPerMinutePerKibana (${capacityPerMinutePerKibana})`;
    logger.warn(reason);
    return { status: HealthStatus.OK, reason };
  }

  const reason = `Task Manager is unhealthy, the assumedRequiredThroughputPerMinutePerKibana (${assumedRequiredThroughputPerMinutePerKibana}) >= capacityPerMinutePerKibana (${capacityPerMinutePerKibana})`;
  logger.warn(reason);
  return { status: HealthStatus.OK, reason };
}

export function withCapacityEstimate(
  logger: Logger,
  monitoredStats: RawMonitoringStats['stats'],
  assumedKibanaInstances: number
): RawMonitoringStats['stats'] {
  if (isCapacityEstimationParams(monitoredStats)) {
    try {
      return {
        ...monitoredStats,
        capacity_estimation: estimateCapacity(logger, monitoredStats, assumedKibanaInstances),
      };
    } catch (e) {
      // Return monitoredStats with out capacity estimation
      logger.error(e.message);
    }
  }
  return monitoredStats;
}

function percentageOf(val: number, percentage: number) {
  return Math.round((percentage * val) / 100);
}

function getAverageDuration(
  durations: Partial<TaskPersistenceTypes<AveragedStat>>
): Result<number, number> {
  const result = stats.mean(
    [durations.non_recurring?.p50 ?? 0, durations.recurring?.p50 ?? 0].filter((val) => val > 0)
  );
  if (isNaN(result)) {
    return asErr(result);
  }
  return asOk(result);
}
