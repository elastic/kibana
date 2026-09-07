/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmissionMeta, RulePipelineState } from '../types';

/**
 * Read-only view of a per-run metric collector. The symmetrical counterpart
 * to {@link MetricCollectorWriter}: exposes identity, timing and the current
 * snapshot but cannot mutate or freeze the collector.
 *
 * Intended for consumers that need to observe metrics without owning
 * the finalize transition — e.g. a diagnostics endpoint reading mid-flight
 * counters, a bus subscriber that samples the snapshot, or a periodic
 * exporter. Kept intentionally symmetrical to the writer so read-only
 * consumers can be added without widening the pipeline's exclusive
 * `finalize()` capability.
 */
export interface MetricCollectorReader {
  readonly executionId: string;
  readonly startedAt: Date;
  readonly endedAt?: Date;
  snapshot(): RuleExecutionMetricsSnapshot;
}

/**
 * Write-only view of a per-run metric collector.
 *
 * The metrics middleware threads this narrower interface to recorders so that
 * recorders can contribute measurements but cannot finalize the collector or
 * read the current snapshot. New aggregation kinds (gauges, attributes,
 * histograms) will extend this interface additively; existing recorders and
 * producers remain untouched.
 */
export interface MetricCollectorWriter {
  readonly executionId: string;

  /**
   * Sums `by` (default `1`) into the counter named `name`. Counter semantics
   * are additive across the run — the collector aggregates every increment
   * and reports the total on the snapshot.
   */
  increment(name: string, by?: number): void;
}

/**
 * Full collector surface exposing both the writer and reader views plus the
 * pipeline-only `finalize()` transition. The pipeline is the sole holder of
 * this interface for a run.
 */
export interface MetricCollector extends MetricCollectorReader, MetricCollectorWriter {
  /**
   * Freezes the collector, records `endedAt` and returns the final snapshot.
   * Safe to call multiple times: subsequent calls return the same snapshot.
   */
  finalize(endedAt?: Date): RuleExecutionMetricsSnapshot;
}

/**
 * Immutable snapshot of the collector at the end of a run. Returned on the
 * pipeline result and included in the `rule.execution.completed` bus event.
 */
export interface RuleExecutionMetricsSnapshot {
  readonly executionId: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationMs: number;
  readonly counters: Readonly<Record<string, number>>;
}

/**
 * Per-emission context passed to a {@link MetricRecorder}. Recorders are pure,
 * synchronous functions over `(collector, ctx)`.
 */
export interface MetricRecorderContext {
  readonly state: RulePipelineState;
  readonly meta?: EmissionMeta;
  readonly stepName: string;
  readonly emissionIndex: number;
}

/**
 * Plugin contract for recording metrics from step emissions.
 *
 * Recorders observe either a specific step (`observes: { stepName }`) or every
 * step (`observes: 'all'`). Each `continue` emission from the observed step(s)
 * invokes `record()` exactly once with the current state, the ephemeral
 * emission `meta`, and the emission index.
 *
 * Recorders MUST be synchronous, MUST NOT perform I/O, and MUST NOT throw
 * for reasons that would break a run. Failures are isolated by the middleware.
 */
export interface MetricRecorder {
  readonly name: string;
  readonly observes: { stepName: string } | 'all';
  record(collector: MetricCollectorWriter, ctx: MetricRecorderContext): void;
}

/**
 * Factory contract that creates a fresh {@link MetricCollector} for each
 * pipeline run.
 *
 * `executionId` is supplied by the caller (the pipeline threads Task Manager's
 * `RunContext.executionUuid`) so the collector shares a single execution
 * identity with the rest of the run instead of minting its own. `startedAt`
 * remains an internal seam (see {@link MetricCollectorFactory}) so tests can
 * stamp deterministic timing.
 */
export interface MetricCollectorFactoryContract {
  create(params: { executionId: string }): MetricCollector;
}
