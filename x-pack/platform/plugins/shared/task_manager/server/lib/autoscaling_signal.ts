/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { EventLoopUtilization } from 'perf_hooks';
import { performance } from 'perf_hooks';
import { ADAPTIVE_CAPACITY, readV8HeapStats } from './adaptive_capacity';
import type { AdaptiveCapacityState, HeapStats } from './adaptive_capacity';
import { getCapacityInCost } from '../task_pool/utils';

/**
 * Event-loop utilization at or above this share of wall time reads as a fully
 * CPU-bound node, so the signal saturates before the loop is pegged.
 */
export const FULL_EVENT_LOOP_UTILIZATION = 0.8;

/** Upper bound of `backlog_load`: the autoscaler can step several replicas on one sample, but not without limit. */
export const MAX_BACKLOG_LOAD = 300;

/**
 * One reading of how busy this node is, measured against resources that bind
 * rather than against the capacity in effect. Each term is a percentage; the
 * backlog term may exceed 100 when the node can see work it cannot start.
 */
export interface AutoscalingSignalSample extends JsonObject {
  /** Running cost as a share of the reference capacity, capped at 100. */
  slot_load: number;
  /** Projected heap (or resident memory, whichever binds) as a share of its target, capped at 100. */
  heap_load: number;
  /** Event-loop utilization since the previous sample, scaled so 80% reads as 100, capped at 100. */
  cpu_load: number;
  /** Running cost plus the claimable backlog in this node's partitions, as a share of the reference capacity, capped at `MAX_BACKLOG_LOAD`. */
  backlog_load: number;
  /** Normal-cost tasks the other terms are measured against: the fixed capacity, or the default under `capacity: auto`. */
  reference_capacity: number;
}

export interface AutoscalingSignalOpts {
  /** The capacity `slot_load` and `backlog_load` are measured against, in normal-cost tasks. */
  referenceCapacity: number;
  /** Present with `capacity: auto`: the controller already projects the heap every second. */
  getAdaptiveState?: () => AdaptiveCapacityState | undefined;
  readHeapStats?: () => Pick<HeapStats, 'usedHeapBytes' | 'heapLimitBytes'>;
  /** `performance.eventLoopUtilization`: absolute with no arguments, the delta between two readings with both. */
  readEventLoopUtilization?: (
    utilization1?: EventLoopUtilization,
    utilization2?: EventLoopUtilization
  ) => EventLoopUtilization;
}

export interface AutoscalingSignalInput {
  /** Cost of the runs in the pool right now. */
  runningCost: number;
  /** Cost of the claimable tasks this node saw but could not start in the last claim; undefined keeps the previous reading. */
  backlogCost?: number;
}

/**
 * Samples the per-node autoscaling signal: slot, heap, CPU and backlog load
 * against a capacity that does not move with `capacity: auto`.
 */
export class AutoscalingSignal {
  private readonly referenceCost: number;
  private readonly referenceCapacity: number;
  private readonly getAdaptiveState?: () => AdaptiveCapacityState | undefined;
  private readonly readHeapStats: NonNullable<AutoscalingSignalOpts['readHeapStats']>;
  private readonly readEventLoopUtilization: NonNullable<
    AutoscalingSignalOpts['readEventLoopUtilization']
  >;
  private lastEventLoopUtilization?: EventLoopUtilization;
  private lastBacklogCost = 0;

  constructor(opts: AutoscalingSignalOpts) {
    this.referenceCapacity = opts.referenceCapacity;
    this.referenceCost = getCapacityInCost(opts.referenceCapacity);
    this.getAdaptiveState = opts.getAdaptiveState;
    this.readHeapStats = opts.readHeapStats ?? readV8HeapStats;
    this.readEventLoopUtilization =
      opts.readEventLoopUtilization ??
      ((utilization1, utilization2) =>
        performance.eventLoopUtilization(utilization1, utilization2));
  }

  public sample({ runningCost, backlogCost }: AutoscalingSignalInput): AutoscalingSignalSample {
    if (backlogCost !== undefined) {
      this.lastBacklogCost = backlogCost;
    }
    return {
      slot_load: this.percent(runningCost, this.referenceCost, 100),
      heap_load: this.heapLoad(),
      cpu_load: this.cpuLoad(),
      backlog_load: this.percent(
        runningCost + this.lastBacklogCost,
        this.referenceCost,
        MAX_BACKLOG_LOAD
      ),
      reference_capacity: this.referenceCapacity,
    };
  }

  private heapLoad(): number {
    const state = this.getAdaptiveState?.();
    if (state) {
      const heap = this.percent(state.heap_projected_bytes, state.heap_target_bytes, 100);
      const memory = state.memory
        ? this.percent(state.memory.projected_bytes, state.memory.target_bytes, 100)
        : 0;
      return Math.max(heap, memory);
    }
    const { usedHeapBytes, heapLimitBytes } = this.readHeapStats();
    return this.percent(usedHeapBytes, heapLimitBytes * ADAPTIVE_CAPACITY.heapTargetRatio, 100);
  }

  private cpuLoad(): number {
    // The first sample has no previous reading, so it covers the whole process
    // lifetime; the running average absorbs that single outlier.
    const current = this.readEventLoopUtilization();
    const sinceLast = this.lastEventLoopUtilization
      ? this.readEventLoopUtilization(current, this.lastEventLoopUtilization)
      : current;
    this.lastEventLoopUtilization = current;
    return this.percent(sinceLast.utilization, FULL_EVENT_LOOP_UTILIZATION, 100);
  }

  private percent(value: number, reference: number, cap: number): number {
    if (!(reference > 0) || !(value > 0)) {
      return 0;
    }
    return Math.min(cap, Math.round((value * 100) / reference));
  }
}
