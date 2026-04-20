/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, OpsMetrics } from '@kbn/core/server';
import { cpuUsage } from 'node:process';
import type { TaskManagerConfig } from '../config';
import { logTaskManagerCapacityToConsole } from './task_manager_capacity_console_log';

const HYSTERESIS_FACTOR = 0.9;

interface DynamicCapacityState {
  capacity: number;
  cooldownUntilMs: number;
  consecutiveUnhealthyReadings: number;
}

interface ProcessHealthSignals {
  eventLoopUtilization: number;
  processCpuUtilization: number;
  heapUsedFraction: number;
  eventLoopDelayMs: number;
  isUnhealthy: boolean;
}

export interface DynamicCapacityControllerOpts {
  config: TaskManagerConfig;
  logger: Logger;
  startingCapacity: number;
}

export interface DynamicCapacityEvaluationResult {
  changed: boolean;
  capacity: number;
}

export class DynamicCapacityController {
  private readonly floorCapacity: number;
  private readonly upperBoundCapacity: number;
  private readonly minUtilizationForProjection: number;
  private readonly startingCapacity: number;
  private readonly config: TaskManagerConfig;
  private readonly logger: Logger;
  private readonly state: DynamicCapacityState;

  private esManagedCapacity: number;
  private postClaimUtilizationPct = 0;
  private projectionUtilizationPct = 0;
  private processHealth: ProcessHealthSignals;
  private previousCpuUsage = cpuUsage();
  private previousCpuSampleTimeMs = Date.now();

  constructor({ config, logger, startingCapacity }: DynamicCapacityControllerOpts) {
    this.config = config;
    this.logger = logger;
    this.startingCapacity = startingCapacity;
    this.floorCapacity = startingCapacity;
    this.upperBoundCapacity = Math.max(config.dynamic_capacity.upper_bound, this.floorCapacity);
    this.minUtilizationForProjection = Math.max(
      config.dynamic_capacity.min_utilization_for_projection / 100,
      0.01
    );
    this.processHealth = getProcessHealthSignals(undefined, this.config);
    this.esManagedCapacity = startingCapacity;
    this.state = {
      capacity: startingCapacity,
      cooldownUntilMs: 0,
      consecutiveUnhealthyReadings: 0,
    };
  }

  public setEsManagedCapacity(capacity: number) {
    this.esManagedCapacity = capacity;
  }

  public setPostClaimUtilizationPct(utilizationPct: number) {
    this.postClaimUtilizationPct = utilizationPct;
  }

  public setProjectionUtilizationPct(utilizationPct: number) {
    this.projectionUtilizationPct = utilizationPct;
  }

  public setOpsMetrics(opsMetrics: OpsMetrics | undefined) {
    this.processHealth = getProcessHealthSignals(opsMetrics, this.config);
  }

  public getCapacity() {
    return this.state.capacity;
  }

  public evaluate(nowMs: number = Date.now()): DynamicCapacityEvaluationResult {
    const processCpuUtilization = getProcessCpuUtilization(
      this.previousCpuUsage,
      this.previousCpuSampleTimeMs,
      nowMs
    );
    this.previousCpuUsage = cpuUsage();
    this.previousCpuSampleTimeMs = nowMs;

    const processHealthForEvaluation: ProcessHealthSignals = {
      ...this.processHealth,
      processCpuUtilization,
      isUnhealthy:
        this.processHealth.isUnhealthy ||
        processCpuUtilization > this.config.dynamic_capacity.max_process_cpu_utilization,
    };

    const previousCapacity = this.state.capacity;
    let nextCapacity = previousCapacity;
    let nextConsecutiveUnhealthyReadings = this.state.consecutiveUnhealthyReadings;
    let nextCooldownUntilMs = this.state.cooldownUntilMs;
    let reason = '';
    const utilizationRatio = Math.max(
      this.projectionUtilizationPct / 100,
      this.minUtilizationForProjection
    );
    const projectionFactor = 1 / utilizationRatio;
    const projectedAtFullCapacity = {
      eventLoopUtilization: processHealthForEvaluation.eventLoopUtilization * projectionFactor,
      processCpuUtilization: processHealthForEvaluation.processCpuUtilization * projectionFactor,
      eventLoopDelayMs: processHealthForEvaluation.eventLoopDelayMs * projectionFactor,
    };

    const esCapacityIsDegraded = this.esManagedCapacity < this.startingCapacity;

    // ES-side reductions are always applied quickly when ES has degraded capacity below
    // the baseline. ES-side recovery increases are skipped while process signals are
    // unhealthy to avoid oscillation.
    if (esCapacityIsDegraded && this.esManagedCapacity < nextCapacity) {
      nextCapacity = this.esManagedCapacity;
      reason = 'elasticsearch_errors';
    } else if (
      esCapacityIsDegraded &&
      this.esManagedCapacity > nextCapacity &&
      !processHealthForEvaluation.isUnhealthy
    ) {
      nextCapacity = this.esManagedCapacity;
      reason = 'elasticsearch_recovery';
    }

    if (processHealthForEvaluation.isUnhealthy) {
      nextConsecutiveUnhealthyReadings += 1;
      if (
        nextConsecutiveUnhealthyReadings >=
          this.config.dynamic_capacity.scale_down_consecutive_unhealthy_readings &&
        nextCapacity > this.floorCapacity
      ) {
        nextCapacity = Math.max(
          nextCapacity - this.config.dynamic_capacity.scale_down_step,
          this.floorCapacity
        );
        nextCooldownUntilMs = nowMs + this.config.dynamic_capacity.scale_down_cooldown_ms;
        nextConsecutiveUnhealthyReadings = 0;
        reason = 'unhealthy_process_signals';
      }
    } else if (
      isHealthyForScaleUp(projectedAtFullCapacity, this.config) &&
      nowMs >= nextCooldownUntilMs &&
      nextCapacity < this.upperBoundCapacity
    ) {
      nextCapacity = Math.min(
        nextCapacity + this.config.dynamic_capacity.scale_up_step,
        this.upperBoundCapacity
      );
      nextConsecutiveUnhealthyReadings = 0;
      reason = 'high_post_claim_utilization';
    } else {
      nextConsecutiveUnhealthyReadings = 0;
    }

    nextCapacity = Math.min(nextCapacity, this.upperBoundCapacity);

    const decision = getCapacityDecision(previousCapacity, nextCapacity);
    const evaluationReason = getEvaluationReason({
      reason,
      processHealth: processHealthForEvaluation,
      config: this.config,
      cooldownUntilMs: nextCooldownUntilMs,
      nowMs,
      upperBoundCapacity: this.upperBoundCapacity,
      nextCapacity,
      projectedAtFullCapacity,
      projectionFactor,
    });

    logTaskManagerCapacityToConsole({
      previousCapacity,
      nextCapacity,
      decision,
      reason: evaluationReason,
      postClaimUtilizationPct: this.postClaimUtilizationPct,
    });

    const changed = nextCapacity !== this.state.capacity;
    if (changed) {
      this.logger.debug(
        `Task Manager dynamic capacity changed from ${
          this.state.capacity
        } to ${nextCapacity}; reason=${reason}; postClaimUtilizationPct=${this.postClaimUtilizationPct.toFixed(
          2
        )}; unhealthy=${processHealthForEvaluation.isUnhealthy}`
      );
      this.state.capacity = nextCapacity;
    }

    this.state.cooldownUntilMs = nextCooldownUntilMs;
    this.state.consecutiveUnhealthyReadings = nextConsecutiveUnhealthyReadings;

    return { changed, capacity: this.state.capacity };
  }
}

function getProcessHealthSignals(
  opsMetrics: OpsMetrics | undefined,
  config: TaskManagerConfig
): ProcessHealthSignals {
  if (!opsMetrics) {
    return {
      eventLoopUtilization: 0,
      processCpuUtilization: 0,
      heapUsedFraction: 0,
      eventLoopDelayMs: 0,
      isUnhealthy: false,
    };
  }

  const eventLoopUtilization = opsMetrics.process.event_loop_utilization.utilization ?? 0;
  const heapSizeLimit = opsMetrics.process.memory.heap.size_limit || 1;
  const heapUsedFraction = opsMetrics.process.memory.heap.used_in_bytes / heapSizeLimit;
  const eventLoopDelayMs = opsMetrics.process.event_loop_delay;

  const eventLoopUnhealthy =
    eventLoopUtilization > config.dynamic_capacity.max_event_loop_utilization;
  const heapUnhealthy = heapUsedFraction > config.dynamic_capacity.max_heap_used_fraction;
  const delayUnhealthy =
    config.dynamic_capacity.max_event_loop_delay_ms > 0 &&
    eventLoopDelayMs > config.dynamic_capacity.max_event_loop_delay_ms;

  return {
    eventLoopUtilization,
    processCpuUtilization: 0,
    heapUsedFraction,
    eventLoopDelayMs,
    isUnhealthy: eventLoopUnhealthy || heapUnhealthy || delayUnhealthy,
  };
}

function getCapacityDecision(
  previousCapacity: number,
  nextCapacity: number
): 'up' | 'down' | 'same' {
  if (nextCapacity > previousCapacity) {
    return 'up';
  }
  if (nextCapacity < previousCapacity) {
    return 'down';
  }
  return 'same';
}

function getEvaluationReason({
  reason,
  processHealth,
  config,
  cooldownUntilMs,
  nowMs,
  upperBoundCapacity,
  nextCapacity,
  projectedAtFullCapacity,
  projectionFactor,
}: {
  reason: string;
  processHealth: ProcessHealthSignals;
  config: TaskManagerConfig;
  cooldownUntilMs: number;
  nowMs: number;
  upperBoundCapacity: number;
  nextCapacity: number;
  projectedAtFullCapacity: {
    eventLoopUtilization: number;
    processCpuUtilization: number;
    eventLoopDelayMs: number;
  };
  projectionFactor: number;
}) {
  const metricDetails = getMetricDetails(
    processHealth,
    config,
    projectedAtFullCapacity,
    projectionFactor
  );

  if (reason) {
    return `${reason}; metrics=${metricDetails}`;
  }

  if (processHealth.isUnhealthy) {
    return `unchanged: unhealthy_process_signals; metrics=${metricDetails}`;
  }

  if (!isHealthyForScaleUp(projectedAtFullCapacity, config)) {
    return `unchanged: projected_full_capacity_unhealthy; metrics=${metricDetails}`;
  }

  if (cooldownUntilMs > nowMs) {
    const cooldownRemainingMs = (cooldownUntilMs - nowMs).toFixed(0);
    return `unchanged: cooldown_active (${cooldownRemainingMs}ms_remaining); metrics=${metricDetails}`;
  }

  if (nextCapacity >= upperBoundCapacity) {
    return `unchanged: at_upper_bound; metrics=${metricDetails}`;
  }

  return `unchanged: no_change; metrics=${metricDetails}`;
}

function getMetricDetails(
  processHealth: ProcessHealthSignals,
  config: TaskManagerConfig,
  projectedAtFullCapacity: {
    eventLoopUtilization: number;
    processCpuUtilization: number;
    eventLoopDelayMs: number;
  },
  projectionFactor: number
) {
  const eluStatus =
    processHealth.eventLoopUtilization > config.dynamic_capacity.max_event_loop_utilization
      ? 'unhealthy'
      : 'healthy';
  const heapStatus =
    processHealth.heapUsedFraction > config.dynamic_capacity.max_heap_used_fraction
      ? 'unhealthy'
      : 'healthy';
  const cpuStatus =
    processHealth.processCpuUtilization > config.dynamic_capacity.max_process_cpu_utilization
      ? 'unhealthy'
      : 'healthy';
  const delayStatus =
    config.dynamic_capacity.max_event_loop_delay_ms > 0 &&
    processHealth.eventLoopDelayMs > config.dynamic_capacity.max_event_loop_delay_ms
      ? 'unhealthy'
      : config.dynamic_capacity.max_event_loop_delay_ms === 0
      ? 'disabled'
      : 'healthy';

  return `elu=${processHealth.eventLoopUtilization.toFixed(
    3
  )}/${config.dynamic_capacity.max_event_loop_utilization.toFixed(
    3
  )}(${eluStatus}), heap=${processHealth.heapUsedFraction.toFixed(
    3
  )}/${config.dynamic_capacity.max_heap_used_fraction.toFixed(
    3
  )}(${heapStatus}), cpu=${processHealth.processCpuUtilization.toFixed(
    3
  )}/${config.dynamic_capacity.max_process_cpu_utilization.toFixed(
    3
  )}(${cpuStatus}), eventLoopDelayMs=${processHealth.eventLoopDelayMs.toFixed(
    1
  )}/${config.dynamic_capacity.max_event_loop_delay_ms.toFixed(
    1
  )}(${delayStatus}), projectedAtFull(scaleFactor=${projectionFactor.toFixed(
    2
  )}): elu=${projectedAtFullCapacity.eventLoopUtilization.toFixed(
    3
  )}, cpu=${projectedAtFullCapacity.processCpuUtilization.toFixed(
    3
  )}, eventLoopDelayMs=${projectedAtFullCapacity.eventLoopDelayMs.toFixed(1)}`;
}

function getProcessCpuUtilization(
  previousUsage: NodeJS.CpuUsage,
  previousSampleTimeMs: number,
  nowMs: number
) {
  const elapsedMicroseconds = (nowMs - previousSampleTimeMs) * 1000;
  if (elapsedMicroseconds <= 0) {
    return 0;
  }

  const usageDiff = cpuUsage(previousUsage);
  const processCpuUsedMicroseconds = usageDiff.user + usageDiff.system;
  return processCpuUsedMicroseconds / elapsedMicroseconds;
}

function isHealthyForScaleUp(
  projectedAtFullCapacity: {
    eventLoopUtilization: number;
    processCpuUtilization: number;
    eventLoopDelayMs: number;
  },
  config: TaskManagerConfig
) {
  const eluHealthy =
    projectedAtFullCapacity.eventLoopUtilization <
    config.dynamic_capacity.max_event_loop_utilization * HYSTERESIS_FACTOR;
  const cpuHealthy =
    projectedAtFullCapacity.processCpuUtilization <
    config.dynamic_capacity.max_process_cpu_utilization * HYSTERESIS_FACTOR;
  const delayHealthy =
    config.dynamic_capacity.max_event_loop_delay_ms === 0 ||
    projectedAtFullCapacity.eventLoopDelayMs <
      config.dynamic_capacity.max_event_loop_delay_ms * HYSTERESIS_FACTOR;
  return eluHealthy && cpuHealthy && delayHealthy;
}
