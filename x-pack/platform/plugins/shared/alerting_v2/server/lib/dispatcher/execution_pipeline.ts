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
  DispatcherPipelineInput,
  DispatcherPipelineState,
  DispatcherStageCounts,
  DispatcherStageTiming,
  DispatcherStep,
  DispatcherStepOutput,
} from './types';
import { DispatcherExecutionStepsToken } from './steps/tokens';
import { withDispatcherSpan } from './with_dispatcher_span';

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
  readonly nextState: DispatcherPipelineState;
}

@injectable()
export class DispatcherPipeline implements DispatcherPipelineContract {
  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @multiInject(DispatcherExecutionStepsToken) private readonly steps: DispatcherStep[]
  ) {}

  public async execute(input: DispatcherPipelineInput): Promise<DispatcherPipelineResult> {
    let pipelineState: DispatcherPipelineState = { input };
    const stageTimings: DispatcherStageTiming[] = [];

    for (const step of this.steps) {
      this.logger.debug({ message: `Dispatcher: Executing step: ${step.name}` });

      const { timing, haltReason, nextState } = await this.runStage(step, pipelineState);
      stageTimings.push(timing);
      pipelineState = nextState;

      if (haltReason) {
        this.logger.debug({
          message: `Dispatcher: Pipeline halted at step: ${step.name}, reason: ${haltReason}`,
        });
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

  private async runStage(
    step: DispatcherStep,
    state: DispatcherPipelineState
  ): Promise<StageExecutionResult> {
    const startedAt = process.hrtime.bigint();

    const output = await withDispatcherSpan(
      step.name,
      () => step.execute(state),
      (stepOutput) => toSpanLabels(computeStateCounts(applyStepOutput(state, stepOutput)))
    );

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const nextState = applyStepOutput(state, output);

    return {
      timing: {
        name: step.name,
        duration_ms: roundMs(durationMs),
        halted: output.type === 'halt',
        counts: computeStateCounts(nextState),
      },
      haltReason: output.type === 'halt' ? output.reason : undefined,
      nextState,
    };
  }
}

function applyStepOutput(
  state: DispatcherPipelineState,
  output: DispatcherStepOutput
): DispatcherPipelineState {
  if (output.type === 'continue' && output.data) {
    return { ...state, ...output.data };
  }
  return state;
}

function computeStateCounts(state: DispatcherPipelineState): DispatcherStageCounts {
  return {
    episodes: state.episodes?.length ?? 0,
    suppressions: state.suppressions?.length ?? 0,
    dispatchable: state.dispatchable?.length ?? 0,
    suppressed: state.suppressed?.length ?? 0,
    rules: state.rules?.size ?? 0,
    policies: state.policies?.size ?? 0,
    matched: state.matched?.length ?? 0,
    groups: state.groups?.length ?? 0,
    dispatch: state.dispatch?.length ?? 0,
    throttled: state.throttled?.length ?? 0,
  };
}

function toSpanLabels(counts: DispatcherStageCounts): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [`count_${key}`, value as number])
  );
}

function roundMs(value: number): number {
  return Math.round(value * 1000) / 1000;
}
