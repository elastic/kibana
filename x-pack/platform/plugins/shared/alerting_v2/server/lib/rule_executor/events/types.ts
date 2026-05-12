/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HaltReason, RulePipelineState } from '../types';

/**
 * Categorical payload kinds carried by domain events.
 * Live next to the events so they evolve with the protocol.
 */
export type AlertEventStatusKind = 'breached' | 'recovered' | 'no_data';
export type EpisodeTransitionKind = 'active' | 'recovering' | 'inactive';
export type RecoveryMode = 'no_breach' | 'query';
export type CancellationReason = 'cancelled_timeout';

/**
 * Common fields carried on every emitted event.
 *
 * `executionUuid` joins all events for a single rule execution and is
 * minted by the task runner. `at` is the wall-clock instant at which the
 * emitter produced the event (not when an observer received it).
 */
export interface BaseEvent {
  readonly executionUuid: string;
  readonly at: Date;
}

/* ───── Lifecycle events (emitted by task_runner / pipeline / middlewares) ──── */

export interface ExecutionStartedEvent extends BaseEvent {
  readonly kind: 'execution_started';
  readonly ruleId: string;
  readonly spaceId: string;
  readonly scheduledAt: string;
}

export interface ExecutionCompletedEvent extends BaseEvent {
  readonly kind: 'execution_completed';
  readonly finalState: RulePipelineState;
  readonly durationMs: number;
  /**
   * Set when the pipeline halted on a domain-meaningful reason
   * (`rule_deleted`, `rule_disabled`, `state_not_ready`). Absent when the
   * execution ran to its natural end. Distinct from `execution_failed`,
   * which is reserved for thrown errors.
   */
  readonly haltReason?: HaltReason;
}

export interface ExecutionFailedEvent extends BaseEvent {
  readonly kind: 'execution_failed';
  /**
   * The thrown error, typically a {@link StepExecutionError} carrying the
   * originating step name. Observers narrow on instance-of checks.
   */
  readonly error: unknown;
  readonly durationMs: number;
  /** Optional: present when the failure happened mid-step. */
  readonly finalState?: RulePipelineState;
}

export interface ExecutionCancelledEvent extends BaseEvent {
  readonly kind: 'execution_cancelled';
  readonly reason: CancellationReason;
  readonly durationMs: number;
  readonly finalState?: RulePipelineState;
}

export interface StepStartedEvent extends BaseEvent {
  readonly kind: 'step_started';
  readonly step: string;
}

export interface StepCompletedEvent extends BaseEvent {
  readonly kind: 'step_completed';
  readonly step: string;
  readonly durationMs: number;
}

export interface StepCancelledEvent extends BaseEvent {
  readonly kind: 'step_cancelled';
  readonly step: string;
  readonly reason: CancellationReason;
}

/* ───── Domain events (emitted by steps and services) ────────────────────── */

export interface BatchProcessedEvent extends BaseEvent {
  readonly kind: 'batch_processed';
  readonly step: string;
  readonly rowCount: number;
}

export interface QueryExecutedEvent extends BaseEvent {
  readonly kind: 'query_executed';
  readonly step: string;
  readonly esTookMs: number;
  readonly durationMs: number;
  readonly rowCount: number;
}

export interface AlertEventStoredEvent extends BaseEvent {
  readonly kind: 'alert_event_stored';
  readonly status: AlertEventStatusKind;
}

export interface EpisodeTransitionedEvent extends BaseEvent {
  readonly kind: 'episode_transitioned';
  readonly transition: EpisodeTransitionKind;
}

export interface RecoveryModeSelectedEvent extends BaseEvent {
  readonly kind: 'recovery_mode_selected';
  readonly mode: RecoveryMode;
}

export interface RecoveryEventBuiltEvent extends BaseEvent {
  readonly kind: 'recovery_event_built';
}

/**
 * Discriminated union of every event the rule executor emits.
 *
 * To add a new domain event:
 *  1. Define a `*Event` interface extending {@link BaseEvent} with a unique
 *     `kind` literal.
 *  2. Append it to this union.
 *  3. Emit it from the relevant step/service via
 *     `executionContext.emit({ kind: '...', executionUuid, at: new Date(), ... })`
 *     (or use the `emitEvent` helper).
 *  4. Handle it in an existing observer or add a new observer.
 *
 * The pipeline / task runner do not need to change.
 */
export type RuleExecutionEvent =
  | ExecutionStartedEvent
  | ExecutionCompletedEvent
  | ExecutionFailedEvent
  | ExecutionCancelledEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepCancelledEvent
  | BatchProcessedEvent
  | QueryExecutedEvent
  | AlertEventStoredEvent
  | EpisodeTransitionedEvent
  | RecoveryModeSelectedEvent
  | RecoveryEventBuiltEvent;

/** All possible `kind` discriminants. */
export type RuleExecutionEventKind = RuleExecutionEvent['kind'];

/**
 * Narrow {@link RuleExecutionEvent} to the variant matching a given `kind`.
 * Useful in observers that only care about a subset of events.
 */
export type RuleExecutionEventOf<K extends RuleExecutionEventKind> = Extract<
  RuleExecutionEvent,
  { kind: K }
>;
