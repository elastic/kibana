/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryPayload } from './get_query_payload';
import type { RuleResponse } from '../rules_client';
import type { AlertEvent } from '../../resources/datastreams/alert_events';
import type { ExecutionContext } from '../execution_context';
import type { RuleExecutionCounter } from './metrics/counters';

export interface RuleExecutorTaskParams {
  ruleId: string;
  spaceId: string;
}

export interface RuleExecutionInput {
  readonly ruleId: string;
  readonly spaceId: string;
  readonly scheduledAt: string;
  readonly executionContext: ExecutionContext;
}

export interface RulePipelineState {
  readonly input: RuleExecutionInput;
  readonly rule?: RuleResponse;
  readonly queryPayload?: QueryPayload;
  readonly esqlRowBatch?: ReadonlyArray<Record<string, unknown>>;
  readonly alertEventsBatch?: ReadonlyArray<AlertEvent>;
  readonly dataPresentGroupHashes?: ReadonlySet<string>;
  readonly newEpisodeIds?: ReadonlyArray<string>;
}

export type HaltReason = 'rule_deleted' | 'rule_disabled' | 'state_not_ready';

/**
 * Ephemeral, per-emission side-channel for observability data. Steps attach
 * transient annotations here that domain-aware recorders consume without
 * polluting {@link RulePipelineState}. `meta` is naturally dropped by the
 * next step, which rebuilds its own emission, so it never threads forward
 * and never reaches persisted docs.
 *
 * Two emission channels, distinguished by who owns the metric shape:
 *
 * 1. `counters` — DIRECT channel. The step has already decided the metric
 *    name and value. Keys are constrained to {@link RuleExecutionCounter}
 *    (the `metrics/counters.ts` catalog) for typo-safety and discoverability;
 *    `Partial` because any single emission sets only the subset it produced.
 *    `EmittedCountersRecorder` is name-agnostic and merges every key into the
 *    run's collector.
 * 2. `observations` — RAW channel. The step exposes structured,
 *    domain-shaped data; a domain-aware recorder derives metrics from it.
 *    Keeps steps focused on their domain (storage, querying, ...) and out
 *    of metric-naming decisions.
 *
 * Both channels are top-level containers, not step-specific instances —
 * adding a new observation kind extends {@link EmissionObservations}, not
 * `EmissionMeta`.
 */
export interface EmissionMeta {
  readonly counters?: Partial<Readonly<Record<RuleExecutionCounter, number>>>;
  readonly observations?: EmissionObservations;
}

/**
 * Catalog of typed observations a step may expose on
 * {@link EmissionMeta.observations}. Each field is one known observation
 * kind; the paired recorder opts in to the specific kind it consumes.
 *
 * Adding a new observation is a schema change: extend this interface (and,
 * typically, publish a recorder that consumes it). The payload type lives
 * here so both the producing step and the consuming recorder see the same
 * shape.
 */
export interface EmissionObservations {
  /**
   * Outcome of a bulk write. Set by writer steps that called the
   * `StorageService`; consumed by
   * {@link PersistedRuleEventsRecorder} (and other future persistence-aware
   * recorders) to derive counters like `ruleEventsGenerated` and
   * `signalsGenerated` from what actually landed in Elasticsearch — not
   * from what was built in memory.
   */
  readonly bulkIndexResult?: BulkIndexObservation;
}

/**
 * Storage-agnostic per-batch bulk-write outcome. Structurally mirrors the
 * storage service's `BulkIndexResult` so the store step forwards the result
 * without transformation, but declared here to avoid a rule-executor →
 * storage-service module dependency.
 *
 * Symmetric arrays: `docs` for what persisted, `errors` for what didn't.
 * `attempted` equals `docs.length + errors.length` and is kept for logging
 * / sanity checks without having to walk either array.
 */
export interface BulkIndexObservation {
  readonly attempted: number;
  readonly docs: readonly Record<string, unknown>[];
  readonly errors: readonly BulkIndexObservationError[];
}

/**
 * Per-document rejection surfaced on
 * {@link BulkIndexObservation.errors}. Structurally mirrors `BulkIndexError`
 * from the storage service (see `storage_service.ts` for the field-level
 * rationale on `code` / `details.statusCode`). `document` holds the same
 * reference the emitting step passed to the storage service, so recorders
 * correlate failures by identity.
 */
export interface BulkIndexObservationError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly index: string;
  readonly document: Record<string, unknown>;
}

export type StepStreamResult =
  | { type: 'continue'; state: RulePipelineState; meta?: EmissionMeta }
  | { type: 'halt'; reason: HaltReason; state: RulePipelineState };

export type PipelineStateStream = AsyncIterableIterator<StepStreamResult>;

export interface RuleExecutionStep {
  readonly name: string;
  executeStream(input: PipelineStateStream): PipelineStateStream;
}
