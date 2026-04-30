/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable, multiInject } from 'inversify';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import type {
  DispatcherHaltReason,
  DispatcherParallelGroup,
  DispatcherPipelineEntry,
  DispatcherPipelineInput,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
} from './types';
import { DispatcherExecutionStepsToken } from './steps/tokens';
import { withDispatcherSpan } from './with_dispatcher_span';
import {
  computeStateCounts,
  elapsedMs,
  roundMs,
  startHrtime,
  toSpanLabels,
  toStageError,
  type DispatcherStageTiming,
} from './telemetry';

/**
 * Build a parallel group of dispatcher steps. Use only for steps that read
 * non-overlapping fields from prior pipeline state and produce non-overlapping
 * deltas.
 *
 * Group semantics for {@link DispatcherParallelGroup} — chosen to preserve
 * today's serial behavior exactly, up to per-stage `duration_ms`:
 *   - All children always start (no skip-on-first-error within the group).
 *   - All children run to completion (settled). Sibling errors do not
 *     cancel one another: the existing per-step `runStage` already converts
 *     throws into `step_error` halts, so siblings observe consistent state.
 *   - Each child sees the same pre-group state snapshot.
 *   - State deltas are merged in declaration order. Bindings must keep
 *     each state field owned by exactly one step in the group; overlapping
 *     keys would otherwise produce non-deterministic merges.
 *   - Per-child stage timings are appended to `stageTimings` in
 *     declaration order, not finish order, so downstream consumers
 *     (`tick_summary.totals`, ES|QL aggregations on `stages[].name`) see
 *     a stable, deterministic shape.
 *   - Halt precedence is declaration order: the first child that halted
 *     or threw decides the group's halt reason. This matches the serial
 *     "first halt wins" intuition and is independent of finish order.
 */
export const parallelGroup = (...steps: readonly DispatcherStep[]): DispatcherParallelGroup => ({
  kind: 'parallel',
  steps,
});

const isParallelGroup = (entry: DispatcherPipelineEntry): entry is DispatcherParallelGroup =>
  'kind' in entry && entry.kind === 'parallel';

export interface DispatcherPipelineResult {
  readonly completed: boolean;
  readonly haltReason?: DispatcherHaltReason;
  readonly finalState: DispatcherPipelineState;
  readonly stageTimings: readonly DispatcherStageTiming[];
}

export interface DispatcherPipelineContract {
  execute(input: DispatcherPipelineInput): Promise<DispatcherPipelineResult>;
}

interface StageExecutionResult {
  readonly timing: DispatcherStageTiming;
  readonly haltReason?: DispatcherHaltReason;
  readonly delta?: Partial<Omit<DispatcherPipelineState, 'input'>>;
}

interface EntryExecutionResult {
  readonly haltReason?: DispatcherHaltReason;
  readonly nextState: DispatcherPipelineState;
}

@injectable()
export class DispatcherPipeline implements DispatcherPipelineContract {
  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @multiInject(DispatcherExecutionStepsToken)
    private readonly entries: readonly DispatcherPipelineEntry[]
  ) {}

  public async execute(input: DispatcherPipelineInput): Promise<DispatcherPipelineResult> {
    let pipelineState: DispatcherPipelineState = { input };
    const stageTimings: DispatcherStageTiming[] = [];

    for (const entry of this.entries) {
      const { haltReason, nextState } = isParallelGroup(entry)
        ? await this.executeParallelGroup(entry, pipelineState, stageTimings)
        : await this.executeSerialStep(entry, pipelineState, stageTimings);

      pipelineState = nextState;

      if (haltReason) {
        return {
          completed: false,
          haltReason,
          finalState: pipelineState,
          stageTimings,
        };
      }
    }

    return {
      completed: true,
      finalState: pipelineState,
      stageTimings,
    };
  }

  private async executeSerialStep(
    step: DispatcherStep,
    state: DispatcherPipelineState,
    stageTimings: DispatcherStageTiming[]
  ): Promise<EntryExecutionResult> {
    this.logger.debug({ message: `Dispatcher: Executing step: ${step.name}` });

    const result = await this.runStage(step, state);
    stageTimings.push(result.timing);

    const nextState = result.delta ? mergeDelta(state, result.delta) : state;

    if (result.haltReason) {
      this.logger.debug({
        message: `Dispatcher: Pipeline halted at step: ${step.name}, reason: ${result.haltReason}`,
      });
    }

    return { haltReason: result.haltReason, nextState };
  }

  /**
   * Execute every child of a parallel group concurrently, then merge the
   * results back into pipeline state in declaration order.
   *
   * Each child observes the SAME pre-group state — that is what makes the
   * concurrency safe and what allows the serial-vs-parallel equivalence
   * proof to hold for any binding whose group members are state-disjoint.
   */
  private async executeParallelGroup(
    group: DispatcherParallelGroup,
    state: DispatcherPipelineState,
    stageTimings: DispatcherStageTiming[]
  ): Promise<EntryExecutionResult> {
    const groupNames = group.steps.map((s) => s.name).join(',');
    this.logger.debug({ message: `Dispatcher: Executing parallel group: [${groupNames}]` });

    const results = await Promise.all(group.steps.map((step) => this.runStage(step, state)));

    let nextState = state;
    for (const result of results) {
      stageTimings.push(result.timing);
      if (result.delta) {
        nextState = mergeDelta(nextState, result.delta);
      }
    }

    const firstHalt = results.find((r) => r.haltReason !== undefined);
    if (firstHalt) {
      this.logger.debug({
        message: `Dispatcher: Pipeline halted at parallel group: [${groupNames}], reason: ${firstHalt.haltReason}`,
      });
    }

    return { haltReason: firstHalt?.haltReason, nextState };
  }

  /**
   * Execute a single step and return its timing entry, halt reason, and
   * state delta.
   *
   * A step can end a tick in three ways:
   *   1. Resolve with `{ type: 'continue' }` — pipeline proceeds.
   *   2. Resolve with `{ type: 'halt', reason }`   — controlled halt; the
   *      timing is recorded with `halted: true` and the reason bubbles up.
   *   3. Throw                                    — treated as a halt with
   *      reason `step_error`; the error is logged at `error` level (for
   *      stack trace) and a compact `error` field is attached to the
   *      timing so the per-tick summary stays queryable. The pipeline
   *      itself never throws out of `execute`.
   *
   * Returns `delta` instead of a fully merged next state so the caller
   * can compose deltas from multiple steps (parallel group) onto the
   * shared pre-group state without re-doing the merge per child.
   */
  private async runStage(
    step: DispatcherStep,
    state: DispatcherPipelineState
  ): Promise<StageExecutionResult> {
    const startedAt = startHrtime();

    try {
      const output = await withDispatcherSpan(
        step.name,
        () => step.execute(state),
        (stepOutput) => toSpanLabels(computeStateCounts(applyStepOutput(state, stepOutput)))
      );

      return {
        timing: {
          name: step.name,
          duration_ms: roundMs(elapsedMs(startedAt)),
          halted: output.type === 'halt',
          counts: computeStateCounts(applyStepOutput(state, output)),
        },
        haltReason: output.type === 'halt' ? output.reason : undefined,
        delta: output.data,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      this.logger.error({ error, type: `dispatcher:${step.name}` });

      return {
        timing: {
          name: step.name,
          duration_ms: roundMs(elapsedMs(startedAt)),
          halted: true,
          counts: computeStateCounts(state),
          error: toStageError(error),
        },
        haltReason: 'step_error',
      };
    }
  }
}

const mergeDelta = (
  state: DispatcherPipelineState,
  delta: Partial<Omit<DispatcherPipelineState, 'input'>>
): DispatcherPipelineState => ({ ...state, ...delta });

const applyStepOutput = (
  state: DispatcherPipelineState,
  output: DispatcherStepOutput
): DispatcherPipelineState => (output.data ? mergeDelta(state, output.data) : state);
