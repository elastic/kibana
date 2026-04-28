/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance, monitorEventLoopDelay, type IntervalHistogram } from 'node:perf_hooks';
import v8 from 'node:v8';
import type { Logger } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';

const HYSTERESIS_FACTOR = 0.9;
const ONE_MILLISECOND_AS_NANOSECONDS = 1_000_000;
const EMA_PERIOD_MS = 30_000;
const EMA_SAMPLING_INTERVAL_MS = 10_000;
const EMA_ALPHA = 1 - Math.exp(-EMA_SAMPLING_INTERVAL_MS / EMA_PERIOD_MS);

interface DynamicCapacityState {
  capacity: number;
  cooldownUntilMs: number;
}

interface ProcessHealthSignals {
  eventLoopUtilization: number;
  heapUsedFraction: number;
  eventLoopDelayMs: number;
  isUnhealthy: boolean;
}

interface ProcessHealthMetrics {
  eventLoopUtilization: number;
  heapUsedFraction: number;
  eventLoopDelayMs: number;
}

type CapacityReason =
  | ''
  | 'elasticsearch_errors'
  | 'elasticsearch_recovery'
  | 'unhealthy_process_signals'
  | 'high_post_claim_utilization';

interface ProjectedAtFullCapacityMetrics {
  eventLoopUtilization: number;
  eventLoopDelayMs: number;
}

interface ProportionalScaleDownResult {
  nextCapacity: number;
  stepUsed: number;
  worstOvershootRatio?: number;
}

interface ProjectionResult {
  projectedAtFullCapacity: ProjectedAtFullCapacityMetrics;
  projectionFactor: number;
}

interface EsCapacityAdjustmentResult {
  nextCapacity: number;
  reason: CapacityReason;
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
  private rawProcessHealth: ProcessHealthSignals;
  private processHealth: ProcessHealthSignals;
  private eventLoopUtilizationBaseline = performance.eventLoopUtilization();
  private readonly eventLoopDelayMonitor: IntervalHistogram;
  private smoothedEventLoopUtilization?: number;
  private smoothedHeapUsedFraction?: number;
  private smoothedEventLoopDelayMs?: number;

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
    this.eventLoopDelayMonitor = monitorEventLoopDelay();
    this.eventLoopDelayMonitor.enable();
    this.rawProcessHealth = getProcessHealthSignals(getDefaultProcessHealthMetrics(), this.config);
    this.processHealth = this.rawProcessHealth;
    this.esManagedCapacity = startingCapacity;
    this.state = {
      capacity: startingCapacity,
      cooldownUntilMs: 0,
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

  public getCapacity() {
    return this.state.capacity;
  }

  public destroy() {
    this.eventLoopDelayMonitor.disable();
  }

  public evaluate(nowMs: number = Date.now()): DynamicCapacityEvaluationResult {
    this.refreshProcessHealth();
    const processHealthForEvaluation = this.processHealth;
    const rawProcessHealthForEvaluation = this.rawProcessHealth;

    const previousCapacity = this.state.capacity;
    let nextCapacity = previousCapacity;
    let nextCooldownUntilMs = this.state.cooldownUntilMs;
    let reason: CapacityReason = '';
    let scaleDownStepUsed: number | undefined;
    let worstOvershootRatio: number | undefined;
    const { projectedAtFullCapacity, projectionFactor } = projectAtFullCapacity({
      projectionUtilizationPct: this.projectionUtilizationPct,
      minUtilizationForProjection: this.minUtilizationForProjection,
      processHealth: processHealthForEvaluation,
    });
    const projectedHealthyForScaleUp = isHealthyForScaleUp(projectedAtFullCapacity, this.config);

    const esAdjustment = applyEsManagedCapacityAdjustment({
      currentCapacity: nextCapacity,
      esManagedCapacity: this.esManagedCapacity,
      startingCapacity: this.startingCapacity,
      processIsUnhealthy: processHealthForEvaluation.isUnhealthy,
    });
    nextCapacity = esAdjustment.nextCapacity;
    reason = esAdjustment.reason;

    if (processHealthForEvaluation.isUnhealthy) {
      if (nextCapacity > this.floorCapacity) {
        const scaleDownResult = applyProportionalScaleDown({
          currentCapacity: nextCapacity,
          floorCapacity: this.floorCapacity,
          processHealth: processHealthForEvaluation,
          config: this.config,
        });
        nextCapacity = scaleDownResult.nextCapacity;
        scaleDownStepUsed = scaleDownResult.stepUsed;
        worstOvershootRatio = scaleDownResult.worstOvershootRatio;
        nextCooldownUntilMs = nowMs + this.config.dynamic_capacity.scale_down_cooldown_ms;
        reason = 'unhealthy_process_signals';
      }
    } else if (
      projectedHealthyForScaleUp &&
      nowMs >= nextCooldownUntilMs &&
      nextCapacity < this.upperBoundCapacity
    ) {
      nextCapacity = Math.min(
        nextCapacity + this.config.dynamic_capacity.scale_up_step,
        this.upperBoundCapacity
      );
      reason = 'high_post_claim_utilization';
    }

    nextCapacity = Math.min(nextCapacity, this.upperBoundCapacity);

    const decision = getCapacityDecision(previousCapacity, nextCapacity);
    const evaluationReason = getEvaluationReason({
      reason,
      processHealth: processHealthForEvaluation,
      rawProcessHealth: rawProcessHealthForEvaluation,
      config: this.config,
      cooldownUntilMs: nextCooldownUntilMs,
      nowMs,
      upperBoundCapacity: this.upperBoundCapacity,
      nextCapacity,
      projectedAtFullCapacity,
      projectionFactor,
      scaleDownStepUsed,
      worstOvershootRatio,
    });

    const humanSummary = buildHumanDynamicCapacitySummary({
      decision,
      reason,
      previousCapacity,
      nextCapacity,
      floorCapacity: this.floorCapacity,
      upperBoundCapacity: this.upperBoundCapacity,
      postClaimUtilizationPct: this.postClaimUtilizationPct,
      processHealth: processHealthForEvaluation,
      config: this.config,
      nowMs,
      cooldownUntilMs: nextCooldownUntilMs,
      projectedHealthyForScaleUp,
      scaleDownStepUsed,
      worstOvershootRatio,
    });

    this.logger.info(`${humanSummary} technical=${evaluationReason}`);

    const changed = nextCapacity !== this.state.capacity;
    if (changed) {
      this.state.capacity = nextCapacity;
    }

    this.state.cooldownUntilMs = nextCooldownUntilMs;

    return { changed, capacity: this.state.capacity };
  }

  private refreshProcessHealth() {
    const rawEventLoopUtilization = performance.eventLoopUtilization(
      this.eventLoopUtilizationBaseline
    ).utilization;
    this.eventLoopUtilizationBaseline = performance.eventLoopUtilization();

    this.eventLoopDelayMonitor.disable();
    const rawEventLoopDelayMs = toMilliseconds(this.eventLoopDelayMonitor.percentile(95));
    this.eventLoopDelayMonitor.reset();
    this.eventLoopDelayMonitor.enable();

    const memoryUsage = process.memoryUsage();
    const heapSizeLimit = v8.getHeapStatistics().heap_size_limit || 1;
    const rawHeapUsedFraction = memoryUsage.heapUsed / heapSizeLimit;

    const rawMetrics: ProcessHealthMetrics = {
      eventLoopUtilization: rawEventLoopUtilization,
      heapUsedFraction: rawHeapUsedFraction,
      eventLoopDelayMs: rawEventLoopDelayMs,
    };

    this.rawProcessHealth = getProcessHealthSignals(rawMetrics, this.config);

    this.smoothedEventLoopUtilization = ema(
      this.smoothedEventLoopUtilization,
      rawMetrics.eventLoopUtilization
    );
    this.smoothedHeapUsedFraction = ema(this.smoothedHeapUsedFraction, rawMetrics.heapUsedFraction);
    this.smoothedEventLoopDelayMs = ema(this.smoothedEventLoopDelayMs, rawMetrics.eventLoopDelayMs);

    this.processHealth = getProcessHealthSignals(
      {
        eventLoopUtilization: this.smoothedEventLoopUtilization,
        heapUsedFraction: this.smoothedHeapUsedFraction,
        eventLoopDelayMs: this.smoothedEventLoopDelayMs,
      },
      this.config
    );
  }
}

function getProcessHealthSignals(
  processHealthMetrics: ProcessHealthMetrics,
  config: TaskManagerConfig
): ProcessHealthSignals {
  const eventLoopUnhealthy =
    processHealthMetrics.eventLoopUtilization > config.dynamic_capacity.max_event_loop_utilization;
  const heapUnhealthy =
    processHealthMetrics.heapUsedFraction > config.dynamic_capacity.max_heap_used_fraction;
  const delayUnhealthy =
    config.dynamic_capacity.max_event_loop_delay_ms > 0 &&
    processHealthMetrics.eventLoopDelayMs > config.dynamic_capacity.max_event_loop_delay_ms;

  return {
    ...processHealthMetrics,
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
  rawProcessHealth,
  config,
  cooldownUntilMs,
  nowMs,
  upperBoundCapacity,
  nextCapacity,
  projectedAtFullCapacity,
  projectionFactor,
  scaleDownStepUsed,
  worstOvershootRatio,
}: {
  reason: string;
  processHealth: ProcessHealthSignals;
  rawProcessHealth: ProcessHealthSignals;
  config: TaskManagerConfig;
  cooldownUntilMs: number;
  nowMs: number;
  upperBoundCapacity: number;
  nextCapacity: number;
  projectedAtFullCapacity: ProjectedAtFullCapacityMetrics;
  projectionFactor: number;
  scaleDownStepUsed?: number;
  worstOvershootRatio?: number;
}) {
  const metricDetails = getMetricDetails(
    processHealth,
    rawProcessHealth,
    config,
    projectedAtFullCapacity,
    projectionFactor,
    scaleDownStepUsed,
    worstOvershootRatio
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
  rawProcessHealth: ProcessHealthSignals,
  config: TaskManagerConfig,
  projectedAtFullCapacity: ProjectedAtFullCapacityMetrics,
  projectionFactor: number,
  scaleDownStepUsed?: number,
  worstOvershootRatio?: number
) {
  const eluStatus = getStatusForThreshold(
    processHealth.eventLoopUtilization,
    config.dynamic_capacity.max_event_loop_utilization
  );
  const heapStatus = getStatusForThreshold(
    processHealth.heapUsedFraction,
    config.dynamic_capacity.max_heap_used_fraction
  );
  const delayStatus =
    config.dynamic_capacity.max_event_loop_delay_ms > 0 &&
    processHealth.eventLoopDelayMs > config.dynamic_capacity.max_event_loop_delay_ms
      ? 'unhealthy'
      : config.dynamic_capacity.max_event_loop_delay_ms === 0
      ? 'disabled'
      : 'healthy';
  const scaleUpGateDetails = getScaleUpGateDetails(projectedAtFullCapacity, config);

  return `elu=${processHealth.eventLoopUtilization.toFixed(
    3
  )}/${config.dynamic_capacity.max_event_loop_utilization.toFixed(
    3
  )}(${eluStatus}) [raw=${rawProcessHealth.eventLoopUtilization.toFixed(
    3
  )}], heap=${processHealth.heapUsedFraction.toFixed(
    3
  )}/${config.dynamic_capacity.max_heap_used_fraction.toFixed(
    3
  )}(${heapStatus}) [raw=${rawProcessHealth.heapUsedFraction.toFixed(
    3
  )}], eventLoopDelayMs(p95)=${processHealth.eventLoopDelayMs.toFixed(
    1
  )}/${config.dynamic_capacity.max_event_loop_delay_ms.toFixed(
    1
  )}(${delayStatus}) [raw=${rawProcessHealth.eventLoopDelayMs.toFixed(
    1
  )}], projectedAtFull(scaleFactor=${projectionFactor.toFixed(
    2
  )}): elu=${projectedAtFullCapacity.eventLoopUtilization.toFixed(
    3
  )}, eventLoopDelayMs=${projectedAtFullCapacity.eventLoopDelayMs.toFixed(1)}, scaleDownStep=${
    scaleDownStepUsed ?? 0
  }, worstOvershootRatio=${(worstOvershootRatio ?? 0).toFixed(
    3
  )}, scaleUpGate=${scaleUpGateDetails}`;
}

function getStatusForThreshold(value: number, threshold: number): 'healthy' | 'unhealthy' {
  return value > threshold ? 'unhealthy' : 'healthy';
}

function getExceededLimitDescriptions(
  processHealth: ProcessHealthSignals,
  config: TaskManagerConfig
): string[] {
  const out: string[] = [];
  if (processHealth.eventLoopUtilization > config.dynamic_capacity.max_event_loop_utilization) {
    out.push('event loop utilization is above its limit');
  }
  if (processHealth.heapUsedFraction > config.dynamic_capacity.max_heap_used_fraction) {
    out.push('heap usage fraction is above its limit');
  }
  if (
    config.dynamic_capacity.max_event_loop_delay_ms > 0 &&
    processHealth.eventLoopDelayMs > config.dynamic_capacity.max_event_loop_delay_ms
  ) {
    out.push('event loop delay is above its limit');
  }
  return out;
}

function computeWorstOvershootRatio(
  processHealth: ProcessHealthSignals,
  config: TaskManagerConfig
): number | undefined {
  const overshoots = [
    processHealth.eventLoopUtilization / config.dynamic_capacity.max_event_loop_utilization,
    processHealth.heapUsedFraction / config.dynamic_capacity.max_heap_used_fraction,
  ];

  if (config.dynamic_capacity.max_event_loop_delay_ms > 0) {
    overshoots.push(
      processHealth.eventLoopDelayMs / config.dynamic_capacity.max_event_loop_delay_ms
    );
  }

  const ratio = Math.max(...overshoots);
  return ratio > 1 ? ratio : undefined;
}

function applyProportionalScaleDown({
  currentCapacity,
  floorCapacity,
  processHealth,
  config,
}: {
  currentCapacity: number;
  floorCapacity: number;
  processHealth: ProcessHealthSignals;
  config: TaskManagerConfig;
}): ProportionalScaleDownResult {
  const worstOvershootRatio = computeWorstOvershootRatio(processHealth, config);
  const maxStep = Math.max(
    1,
    Math.ceil(currentCapacity * config.dynamic_capacity.scale_down_max_step_fraction)
  );
  const rawStep =
    worstOvershootRatio && worstOvershootRatio > 1
      ? currentCapacity - Math.floor(currentCapacity / worstOvershootRatio)
      : 1;
  const proposedStep = Math.min(rawStep, maxStep);
  const stepUsed = Math.max(1, Math.min(proposedStep, currentCapacity - floorCapacity));

  return {
    nextCapacity: Math.max(currentCapacity - stepUsed, floorCapacity),
    stepUsed,
    worstOvershootRatio,
  };
}

function projectAtFullCapacity({
  projectionUtilizationPct,
  minUtilizationForProjection,
  processHealth,
}: {
  projectionUtilizationPct: number;
  minUtilizationForProjection: number;
  processHealth: ProcessHealthSignals;
}): ProjectionResult {
  const utilizationRatio = Math.max(projectionUtilizationPct / 100, minUtilizationForProjection);
  const projectionFactor = 1 / utilizationRatio;

  return {
    projectionFactor,
    projectedAtFullCapacity: {
      eventLoopUtilization: processHealth.eventLoopUtilization * projectionFactor,
      eventLoopDelayMs: processHealth.eventLoopDelayMs * projectionFactor,
    },
  };
}

function applyEsManagedCapacityAdjustment({
  currentCapacity,
  esManagedCapacity,
  startingCapacity,
  processIsUnhealthy,
}: {
  currentCapacity: number;
  esManagedCapacity: number;
  startingCapacity: number;
  processIsUnhealthy: boolean;
}): EsCapacityAdjustmentResult {
  const esCapacityIsDegraded = esManagedCapacity < startingCapacity;
  if (!esCapacityIsDegraded) {
    return { nextCapacity: currentCapacity, reason: '' };
  }

  // ES-side reductions are always applied quickly when ES has degraded capacity below
  // the baseline. ES-side recovery increases are skipped while process signals are
  // unhealthy to avoid oscillation.
  if (esManagedCapacity < currentCapacity) {
    return { nextCapacity: esManagedCapacity, reason: 'elasticsearch_errors' };
  }

  if (esManagedCapacity > currentCapacity && !processIsUnhealthy) {
    return { nextCapacity: esManagedCapacity, reason: 'elasticsearch_recovery' };
  }

  return { nextCapacity: currentCapacity, reason: '' };
}

function getScaleUpGateDetails(
  projectedAtFullCapacity: ProjectedAtFullCapacityMetrics,
  config: TaskManagerConfig
): string {
  const eluGate = config.dynamic_capacity.max_event_loop_utilization * HYSTERESIS_FACTOR;
  const delayGate =
    config.dynamic_capacity.max_event_loop_delay_ms === 0
      ? 0
      : config.dynamic_capacity.max_event_loop_delay_ms * HYSTERESIS_FACTOR;
  const eluGateStatus = projectedAtFullCapacity.eventLoopUtilization < eluGate ? 'pass' : 'fail';
  const delayGateStatus =
    config.dynamic_capacity.max_event_loop_delay_ms === 0
      ? 'disabled'
      : projectedAtFullCapacity.eventLoopDelayMs < delayGate
      ? 'pass'
      : 'fail';

  return `hysteresisFactor=${HYSTERESIS_FACTOR.toFixed(
    2
  )}; elu=${projectedAtFullCapacity.eventLoopUtilization.toFixed(3)}/${eluGate.toFixed(
    3
  )}(${eluGateStatus}), eventLoopDelayMs=${projectedAtFullCapacity.eventLoopDelayMs.toFixed(
    1
  )}/${delayGate.toFixed(1)}(${delayGateStatus})`;
}

function buildHumanDynamicCapacitySummary({
  decision,
  reason,
  previousCapacity,
  nextCapacity,
  floorCapacity,
  upperBoundCapacity,
  postClaimUtilizationPct,
  processHealth,
  config,
  nowMs,
  cooldownUntilMs,
  projectedHealthyForScaleUp,
  scaleDownStepUsed,
  worstOvershootRatio,
}: {
  decision: 'up' | 'down' | 'same';
  reason: string;
  previousCapacity: number;
  nextCapacity: number;
  floorCapacity: number;
  upperBoundCapacity: number;
  postClaimUtilizationPct: number;
  processHealth: ProcessHealthSignals;
  config: TaskManagerConfig;
  nowMs: number;
  cooldownUntilMs: number;
  projectedHealthyForScaleUp: boolean;
  scaleDownStepUsed?: number;
  worstOvershootRatio?: number;
}): string {
  const utilizationNote = `Recent rolling task utilization (post-claim) is about ${postClaimUtilizationPct.toFixed(
    2
  )}% of capacity; that is separate from Node process health, which drives these capacity changes.`;
  const includeUtilizationNote =
    processHealth.isUnhealthy || decision !== 'same' || !projectedHealthyForScaleUp;
  const utilizationSuffix = includeUtilizationNote ? ` ${utilizationNote}` : '';
  const exceeded = getExceededLimitDescriptions(processHealth, config);
  const signalDetail =
    exceeded.length > 0
      ? ` ${exceeded.slice(0, -1).join('; ')}${exceeded.length > 1 ? '; and ' : ''}${
          exceeded[exceeded.length - 1]
        }.`
      : processHealth.isUnhealthy
      ? ' One or more process health inputs are over their limits.'
      : '';

  if (decision === 'down') {
    if (reason === 'unhealthy_process_signals') {
      const step = scaleDownStepUsed ?? 1;
      const overshootSummary = worstOvershootRatio
        ? ` The worst observed signal was ${worstOvershootRatio.toFixed(2)}x over its threshold.`
        : '';
      return (
        `Task Manager lowered claim concurrency from ${previousCapacity} to ${nextCapacity}: ` +
        `Node process health (event loop utilization, heap, and event loop delay against configured ceilings) exceeded configured limits, so concurrency was reduced immediately by ${step}.${signalDetail}` +
        overshootSummary +
        utilizationSuffix
      );
    }
    if (reason === 'elasticsearch_errors') {
      return (
        `Task Manager lowered claim concurrency from ${previousCapacity} to ${nextCapacity}: ` +
        `Elasticsearch error handling reduced the safe throughput ceiling for claims on this node.` +
        utilizationSuffix
      );
    }
  }

  if (decision === 'up') {
    if (reason === 'high_post_claim_utilization') {
      return (
        `Task Manager raised claim concurrency from ${previousCapacity} to ${nextCapacity}: ` +
        `Projected event loop and event loop delay headroom suggest the node can safely run more overlapping tasks.` +
        utilizationSuffix
      );
    }
    if (reason === 'elasticsearch_recovery') {
      return (
        `Task Manager raised claim concurrency from ${previousCapacity} to ${nextCapacity}: ` +
        `Elasticsearch recovered enough to raise the safe throughput ceiling, and process health was within limits.` +
        utilizationSuffix
      );
    }
  }

  if (decision === 'same' && reason === 'elasticsearch_recovery') {
    return (
      `Task Manager left claim concurrency at ${nextCapacity}: ` +
      `Elasticsearch throughput ceiling matches the current setting and process health is acceptable.` +
      utilizationSuffix
    );
  }

  if (processHealth.isUnhealthy) {
    if (nextCapacity <= floorCapacity) {
      return (
        `Task Manager left claim concurrency at ${nextCapacity} (the configured floor): ` +
        `process signals are still unhealthy, so it cannot reduce further.${signalDetail}` +
        utilizationSuffix
      );
    }
    return (
      `Task Manager left claim concurrency at ${nextCapacity}: ` +
      `process health is over limits, but no additional reduction was applied this cycle.${signalDetail}` +
      utilizationSuffix
    );
  }

  if (!projectedHealthyForScaleUp) {
    return (
      `Task Manager left claim concurrency at ${nextCapacity}: ` +
      `if concurrency were increased, projected event loop or event loop delay would likely exceed hysteresis-adjusted scale-up safety limits, so scaling up is paused.` +
      utilizationSuffix
    );
  }

  if (cooldownUntilMs > nowMs) {
    const remainingMs = (cooldownUntilMs - nowMs).toFixed(0);
    return (
      `Task Manager left claim concurrency at ${nextCapacity}: ` +
      `still in a post-scale-down cooldown (${remainingMs} ms remaining) before attempting to raise concurrency again.` +
      utilizationSuffix
    );
  }

  if (nextCapacity >= upperBoundCapacity) {
    return (
      `Task Manager left claim concurrency at ${nextCapacity}: ` +
      `already at the configured upper bound.` +
      utilizationSuffix
    );
  }

  return (
    `Task Manager left claim concurrency at ${nextCapacity}: ` +
    `no change needed this interval.` +
    utilizationSuffix
  );
}

function isHealthyForScaleUp(
  projectedAtFullCapacity: ProjectedAtFullCapacityMetrics,
  config: TaskManagerConfig
) {
  const eluHealthy =
    projectedAtFullCapacity.eventLoopUtilization <
    config.dynamic_capacity.max_event_loop_utilization * HYSTERESIS_FACTOR;
  const delayHealthy =
    config.dynamic_capacity.max_event_loop_delay_ms === 0 ||
    projectedAtFullCapacity.eventLoopDelayMs <
      config.dynamic_capacity.max_event_loop_delay_ms * HYSTERESIS_FACTOR;
  return eluHealthy && delayHealthy;
}

function getDefaultProcessHealthMetrics(): ProcessHealthMetrics {
  return {
    eventLoopUtilization: 0,
    heapUsedFraction: 0,
    eventLoopDelayMs: 0,
  };
}

function ema(previous: number | undefined, current: number): number {
  return previous === undefined ? current : EMA_ALPHA * current + (1 - EMA_ALPHA) * previous;
}

function toMilliseconds(nanoseconds: number): number {
  return nanoseconds / ONE_MILLISECOND_AS_NANOSECONDS;
}
