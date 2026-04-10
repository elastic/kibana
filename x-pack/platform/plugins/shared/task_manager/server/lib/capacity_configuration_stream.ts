/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, OpsMetrics } from '@kbn/core/server';
import { cpuUsage } from 'node:process';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { distinctUntilChanged, map, startWith } from 'rxjs';
import type { TaskManagerConfig } from '../config';
import { createCapacityScan } from './create_managed_configuration';
import type { ErrorScanResult } from './create_managed_configuration';
import { logTaskManagerCapacityToConsole } from './task_manager_capacity_console_log';

const HYSTERESIS_FACTOR = 0.9;

interface CapacityConfigurationStreamOpts {
  config: TaskManagerConfig;
  logger: Logger;
  startingCapacity: number;
  errorCheck$: Observable<ErrorScanResult>;
  postClaimUtilizationPct$: Observable<number>;
  projectionUtilizationPct$?: Observable<number>;
  opsMetrics$?: Observable<OpsMetrics>;
}

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

export function createCapacityConfigurationStream({
  config,
  logger,
  startingCapacity,
  errorCheck$,
  postClaimUtilizationPct$,
  projectionUtilizationPct$,
  opsMetrics$,
}: CapacityConfigurationStreamOpts): Observable<number> {
  const elasticsearchManagedCapacity$ =
    config.adjust_capacity_for_elasticsearch_errors === true
      ? errorCheck$.pipe(
          createCapacityScan(config, logger, startingCapacity),
          startWith(startingCapacity),
          distinctUntilChanged()
        )
      : of(startingCapacity);

  const isDynamicCapacityEnabled = config.capacity === 'auto';
  if (!isDynamicCapacityEnabled) {
    return elasticsearchManagedCapacity$;
  }

  const floorCapacity = startingCapacity;
  const upperBoundCapacity = Math.max(config.dynamic_capacity.upper_bound, floorCapacity);
  const initialSignals = getProcessHealthSignals(undefined, config);
  const minUtilizationForProjection = Math.max(
    config.dynamic_capacity.min_utilization_for_projection / 100,
    0.01
  );

  const capacity$ = new BehaviorSubject<number>(startingCapacity);
  const state: DynamicCapacityState = {
    capacity: startingCapacity,
    cooldownUntilMs: 0,
    consecutiveUnhealthyReadings: 0,
  };

  let esManagedCapacity = startingCapacity;
  let postClaimUtilizationPct = 0;
  let projectionUtilizationPct = 0;
  let processHealth = initialSignals;
  let previousCpuUsage = cpuUsage();
  let previousCpuSampleTimeMs = Date.now();

  const updateCapacity = () => {
    const nowMs = Date.now();
    const processCpuUtilization = getProcessCpuUtilization(
      previousCpuUsage,
      previousCpuSampleTimeMs,
      nowMs
    );
    previousCpuUsage = cpuUsage();
    previousCpuSampleTimeMs = nowMs;
    const processHealthForEvaluation: ProcessHealthSignals = {
      ...processHealth,
      processCpuUtilization,
      isUnhealthy:
        processHealth.isUnhealthy ||
        processCpuUtilization > config.dynamic_capacity.max_process_cpu_utilization,
    };
    const previousCapacity = state.capacity;
    let nextCapacity = previousCapacity;
    let nextConsecutiveUnhealthyReadings = state.consecutiveUnhealthyReadings;
    let nextCooldownUntilMs = state.cooldownUntilMs;
    let reason = '';
    const utilizationRatio = Math.max(projectionUtilizationPct / 100, minUtilizationForProjection);
    const projectionFactor = 1 / utilizationRatio;
    const projectedAtFullCapacity = {
      eventLoopUtilization: processHealthForEvaluation.eventLoopUtilization * projectionFactor,
      processCpuUtilization: processHealthForEvaluation.processCpuUtilization * projectionFactor,
      eventLoopDelayMs: processHealthForEvaluation.eventLoopDelayMs * projectionFactor,
    };

    const esCapacityIsDegraded = esManagedCapacity < startingCapacity;

    // ES-side reductions are always applied quickly when ES has degraded capacity below
    // the baseline. ES-side recovery increases are skipped while process signals are
    // unhealthy to avoid oscillation.
    if (esCapacityIsDegraded && esManagedCapacity < nextCapacity) {
      nextCapacity = esManagedCapacity;
      reason = 'elasticsearch_errors';
    } else if (
      esCapacityIsDegraded &&
      esManagedCapacity > nextCapacity &&
      !processHealthForEvaluation.isUnhealthy
    ) {
      nextCapacity = esManagedCapacity;
      reason = 'elasticsearch_recovery';
    }

    if (processHealthForEvaluation.isUnhealthy) {
      nextConsecutiveUnhealthyReadings += 1;
      if (
        nextConsecutiveUnhealthyReadings >=
          config.dynamic_capacity.scale_down_consecutive_unhealthy_readings &&
        nextCapacity > floorCapacity
      ) {
        nextCapacity = Math.max(
          nextCapacity - config.dynamic_capacity.scale_down_step,
          floorCapacity
        );
        nextCooldownUntilMs = nowMs + config.dynamic_capacity.scale_down_cooldown_ms;
        nextConsecutiveUnhealthyReadings = 0;
        reason = 'unhealthy_process_signals';
      }
    } else if (
      isHealthyForScaleUp(projectedAtFullCapacity, config) &&
      nowMs >= nextCooldownUntilMs &&
      nextCapacity < upperBoundCapacity
    ) {
      nextCapacity = Math.min(
        nextCapacity + config.dynamic_capacity.scale_up_step,
        upperBoundCapacity
      );
      nextConsecutiveUnhealthyReadings = 0;
      reason = 'high_post_claim_utilization';
    } else {
      nextConsecutiveUnhealthyReadings = 0;
    }

    nextCapacity = Math.min(nextCapacity, upperBoundCapacity);

    const decision = getCapacityDecision(previousCapacity, nextCapacity);
    const evaluationReason = getEvaluationReason({
      reason,
      processHealth: processHealthForEvaluation,
      config,
      cooldownUntilMs: nextCooldownUntilMs,
      nowMs,
      upperBoundCapacity,
      nextCapacity,
      projectedAtFullCapacity,
      projectionFactor,
    });

    logTaskManagerCapacityToConsole({
      previousCapacity,
      nextCapacity,
      decision,
      reason: evaluationReason,
      postClaimUtilizationPct,
    });

    if (nextCapacity !== state.capacity) {
      logger.debug(
        `Task Manager dynamic capacity changed from ${
          state.capacity
        } to ${nextCapacity}; reason=${reason}; postClaimUtilizationPct=${postClaimUtilizationPct.toFixed(
          2
        )}; unhealthy=${processHealthForEvaluation.isUnhealthy}`
      );
      state.capacity = nextCapacity;
      capacity$.next(nextCapacity);
    }

    state.cooldownUntilMs = nextCooldownUntilMs;
    state.consecutiveUnhealthyReadings = nextConsecutiveUnhealthyReadings;
  };

  const subscriptions = new Subscription();
  subscriptions.add(
    postClaimUtilizationPct$.pipe(startWith(0)).subscribe((utilizationPct) => {
      postClaimUtilizationPct = utilizationPct;
    })
  );
  subscriptions.add(
    (projectionUtilizationPct$ ?? postClaimUtilizationPct$)
      .pipe(startWith(0))
      .subscribe((utilizationPct) => {
        projectionUtilizationPct = utilizationPct;
      })
  );
  const opsMetricsOrUndefined$: Observable<OpsMetrics | undefined> =
    opsMetrics$ ?? of<OpsMetrics | undefined>(undefined);
  subscriptions.add(
    opsMetricsOrUndefined$
      .pipe(map((opsMetrics) => getProcessHealthSignals(opsMetrics, config)))
      .subscribe((signals) => {
        processHealth = signals;
      })
  );
  subscriptions.add(
    elasticsearchManagedCapacity$.subscribe((capacity) => {
      esManagedCapacity = capacity;
      updateCapacity();
    })
  );

  const intervalId = setInterval(updateCapacity, config.dynamic_capacity.scale_interval_ms);

  return new Observable<number>((subscriber) => {
    const capacitySubscription = capacity$.pipe(distinctUntilChanged()).subscribe(subscriber);
    return () => {
      capacitySubscription.unsubscribe();
      clearInterval(intervalId);
      subscriptions.unsubscribe();
    };
  });
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
