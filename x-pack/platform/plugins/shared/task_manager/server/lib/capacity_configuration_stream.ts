/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import type { Observable } from 'rxjs';
import {
  concat,
  distinctUntilChanged,
  interval,
  map,
  merge,
  NEVER,
  of,
  scan,
  startWith,
  withLatestFrom,
} from 'rxjs';
import type { Logger, OpsMetrics } from '@kbn/core/server';

import type { TaskManagerConfig } from '../config';
import { DEFAULT_DYNAMIC_CAPACITY, MAX_CAPACITY } from '../config';
import {
  applyErrorWindowToCapacity,
  createCapacityScan,
  type ErrorScanResult,
} from './create_managed_configuration';
import { logTaskManagerCapacityToConsole } from './task_manager_capacity_console_log';

export function getTaskManagerRecoveryCeiling(
  config: TaskManagerConfig,
  startingCapacity: number
): number {
  const dynamic = config.dynamic_capacity ?? DEFAULT_DYNAMIC_CAPACITY;
  if (!dynamic.enabled) {
    return startingCapacity;
  }
  const upper = Math.min(dynamic.upper_bound, MAX_CAPACITY);
  return Math.max(startingCapacity, upper);
}

export function areProcessSignalsHealthy(
  metrics: OpsMetrics,
  thresholds: TaskManagerConfig['dynamic_capacity']
): boolean {
  const proc = metrics.process;
  if (
    !proc?.event_loop_utilization ||
    typeof proc.event_loop_utilization.utilization !== 'number'
  ) {
    return false;
  }
  if (proc.event_loop_utilization.utilization > thresholds.max_event_loop_utilization) {
    return false;
  }

  if (thresholds.max_event_loop_delay_ms > 0) {
    const delayMs = proc.event_loop_delay;
    if (typeof delayMs !== 'number') {
      return false;
    }
    if (delayMs > thresholds.max_event_loop_delay_ms) {
      return false;
    }
  }

  const heapLimit = proc.memory?.heap?.size_limit;
  const heapUsed = proc.memory?.heap?.used_in_bytes;
  if (!heapLimit || heapLimit <= 0 || heapUsed === undefined) {
    return false;
  }
  const heapRatio = heapUsed / heapLimit;
  if (heapRatio > thresholds.max_heap_used_fraction) {
    return false;
  }

  const load1m = metrics.os?.load?.['1m'];
  if (load1m === undefined) {
    return false;
  }
  const cpus = Math.max(os.cpus().length, 1);
  const loadRatio = load1m / cpus;
  if (loadRatio > thresholds.max_load_average_ratio) {
    return false;
  }

  return true;
}

function logDynamicScaleSignalEvaluation(
  metrics: OpsMetrics,
  thresholds: TaskManagerConfig['dynamic_capacity']
): boolean {
  const proc = metrics.process;
  const elu = proc?.event_loop_utilization?.utilization;
  const delayMs = proc?.event_loop_delay;
  const heapLimit = proc?.memory?.heap?.size_limit;
  const heapUsed = proc?.memory?.heap?.used_in_bytes;
  const heapRatio =
    heapLimit && heapLimit > 0 && heapUsed !== undefined ? heapUsed / heapLimit : undefined;
  const load1m = metrics.os?.load?.['1m'];
  const cpus = Math.max(os.cpus().length, 1);
  const loadRatio = load1m !== undefined ? load1m / cpus : undefined;
  const healthy = areProcessSignalsHealthy(metrics, thresholds);

  const delayMax =
    thresholds.max_event_loop_delay_ms > 0
      ? String(thresholds.max_event_loop_delay_ms)
      : 'disabled';

  logTaskManagerCapacityToConsole(
    `*** Task Manager capacity: evaluating dynamic scale signals — eventLoopUtilization=${
      elu === undefined ? 'n/a' : elu.toFixed(4)
    } (max ${thresholds.max_event_loop_utilization}), eventLoopDelayMs=${
      delayMs === undefined ? 'n/a' : String(Math.round(delayMs))
    } (max ${delayMax}), heapUsedRatio=${
      heapRatio === undefined ? 'n/a' : heapRatio.toFixed(4)
    } (max ${thresholds.max_heap_used_fraction}), loadPerCpu=${
      loadRatio === undefined ? 'n/a' : loadRatio.toFixed(4)
    } (max ${thresholds.max_load_average_ratio}) => ${healthy ? 'healthy' : 'not healthy'}`
  );

  return healthy;
}

type CapacityEvent = { kind: 'error'; result: ErrorScanResult } | { kind: 'scale' };

interface CapacityReducerState {
  capacity: number;
  lastErrorWindowHadErrors: boolean;
}

/**
 * Observable of effective task manager capacity: optional Elasticsearch error-based throttling
 * plus optional dynamic scale between configured capacity (floor) and recoveryCeiling based on ops
 * metrics. When `adjust_capacity_for_elasticsearch_errors` is false, only the dynamic path applies
 * (or a flat capacity when dynamic capacity is disabled).
 */
export function createTaskManagerCapacityConfiguration$({
  errorCheck$,
  config,
  logger,
  startingCapacity,
  recoveryCeiling,
  opsMetrics$,
  postClaimUtilizationPct$,
}: {
  errorCheck$: Observable<ErrorScanResult>;
  config: TaskManagerConfig;
  logger: Logger;
  startingCapacity: number;
  recoveryCeiling: number;
  opsMetrics$: Observable<OpsMetrics>;
  /** Latest worker utilization % after a successful claim/poll cycle (0–100); 0 until first cycle. */
  postClaimUtilizationPct$: Observable<number>;
}): Observable<number> {
  const dyn = config.dynamic_capacity ?? DEFAULT_DYNAMIC_CAPACITY;
  const applyEsErrorWindowToCapacity = config.adjust_capacity_for_elasticsearch_errors !== false;

  if (!dyn.enabled) {
    if (!applyEsErrorWindowToCapacity) {
      return concat(of(startingCapacity), NEVER);
    }
    return errorCheck$.pipe(
      createCapacityScan(config, logger, startingCapacity, recoveryCeiling),
      startWith(startingCapacity),
      distinctUntilChanged()
    );
  }
  const events$ = merge(
    errorCheck$.pipe(map((result): CapacityEvent => ({ kind: 'error', result }))),
    interval(dyn.scale_interval_ms).pipe(map((): CapacityEvent => ({ kind: 'scale' })))
  ).pipe(
    startWith<CapacityEvent>({ kind: 'error', result: { count: 0, isBlockException: false } })
  );

  return events$.pipe(
    withLatestFrom(opsMetrics$, postClaimUtilizationPct$),
    scan(
      (state: CapacityReducerState, [event, metrics, postClaimUtilizationPct]) => {
        if (event.kind === 'error') {
          if (!applyEsErrorWindowToCapacity) {
            return state;
          }

          const { result } = event;
          // ES "no errors" recovery bumps capacity toward recoveryCeiling every flush. When process
          // signals are unhealthy, dynamic scale-down lowers capacity; without this guard both fire
          // in tight succession and capacity oscillates (e.g. 100 -> 99 -> 100).
          if (
            result.count === 0 &&
            !result.isBlockException &&
            !areProcessSignalsHealthy(metrics, dyn)
          ) {
            logTaskManagerCapacityToConsole(
              '*** Task Manager capacity: ES error-window recovery skipped (process signals unhealthy; not increasing toward recovery ceiling)'
            );
            return {
              ...state,
              lastErrorWindowHadErrors: false,
            };
          }

          const newCapacity = applyErrorWindowToCapacity(
            state.capacity,
            result,
            config,
            logger,
            recoveryCeiling,
            startingCapacity
          );
          return {
            capacity: newCapacity,
            lastErrorWindowHadErrors: result.count > 0 || result.isBlockException,
          };
        }

        logTaskManagerCapacityToConsole(
          `*** Task Manager capacity: evaluating dynamic capacity (current=${state.capacity}, configuredFloor=${startingCapacity}, ceiling=${recoveryCeiling}, lastErrorWindowHadErrors=${state.lastErrorWindowHadErrors}, postClaimUtilizationPct=${postClaimUtilizationPct})`
        );

        const signalsHealthy = logDynamicScaleSignalEvaluation(metrics, dyn);

        if (!signalsHealthy) {
          if (state.capacity > startingCapacity) {
            const nextCapacity = Math.max(startingCapacity, state.capacity - dyn.scale_down_step);
            if (nextCapacity !== state.capacity) {
              logTaskManagerCapacityToConsole(
                `*** Task Manager capacity: capacity changed ${state.capacity} -> ${nextCapacity} (dynamic scale-down, process signals unhealthy; floor ${startingCapacity})`
              );
              logger.debug(
                `Dynamic task manager capacity decreased from ${state.capacity} to ${nextCapacity} (floor ${startingCapacity})`
              );
              return { ...state, capacity: nextCapacity };
            }
          } else {
            logTaskManagerCapacityToConsole(
              `*** Task Manager capacity: dynamic scale-down skipped (process signals unhealthy but already at configured capacity floor ${startingCapacity})`
            );
          }
          return state;
        }

        if (state.lastErrorWindowHadErrors) {
          logTaskManagerCapacityToConsole(
            '*** Task Manager capacity: dynamic scale-up skipped (Elasticsearch reported errors in the last error window)'
          );
          return state;
        }

        const minPostClaimUtil = dyn.scale_up_min_post_claim_utilization_pct;
        if (postClaimUtilizationPct < minPostClaimUtil) {
          logTaskManagerCapacityToConsole(
            `*** Task Manager capacity: dynamic scale-up skipped (post-claim utilization ${postClaimUtilizationPct}% is below scale_up_min_post_claim_utilization_pct ${minPostClaimUtil}%)`
          );
          return state;
        }

        const nextCapacity = Math.min(state.capacity + dyn.scale_up_step, recoveryCeiling);
        if (nextCapacity === state.capacity) {
          logTaskManagerCapacityToConsole(
            `*** Task Manager capacity: dynamic scale-up skipped (already at ceiling ${recoveryCeiling})`
          );
          return state;
        }

        logTaskManagerCapacityToConsole(
          `*** Task Manager capacity: capacity changed ${state.capacity} -> ${nextCapacity} (dynamic scale-up)`
        );
        logger.debug(
          `Dynamic task manager capacity increased from ${state.capacity} to ${nextCapacity} (ceiling ${recoveryCeiling})`
        );
        return { ...state, capacity: nextCapacity };
      },
      {
        capacity: startingCapacity,
        lastErrorWindowHadErrors: false,
      }
    ),
    map((s) => s.capacity),
    distinctUntilChanged()
  );
}
