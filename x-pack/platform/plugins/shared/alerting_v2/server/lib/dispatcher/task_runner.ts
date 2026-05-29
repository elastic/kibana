/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { inject, injectable } from 'inversify';
import { type DispatcherServiceContract } from './dispatcher';
import {
  DispatcherEnabledProviderToken,
  DispatcherServiceInternalToken,
  type DispatcherEnabledProvider,
} from './tokens';
import type {
  DispatcherExecutionParams,
  DispatcherExecutionResult,
  DispatcherTaskState,
} from './types';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class DispatcherTaskRunner {
  constructor(
    @inject(DispatcherServiceInternalToken)
    private readonly dispatcherService: DispatcherServiceContract,
    @inject(DispatcherEnabledProviderToken)
    private readonly dispatcherEnabledProvider: DispatcherEnabledProvider
  ) {}

  public async run({ taskInstance, abortController }: TaskRunParams): Promise<RunResult> {
    const isEnabled = await this.safeIsEnabled();
    const previousState: DispatcherTaskState = taskInstance.state ?? {};

    if (!isEnabled) {
      return { state: previousState };
    }

    const params = this.createDispatcherParams(previousState, abortController);

    const result = await this.dispatcherService.run(params);

    return this.buildRunResult(result, previousState);
  }

  private async safeIsEnabled(): Promise<boolean> {
    try {
      return await this.dispatcherEnabledProvider();
    } catch {
      return true;
    }
  }

  private createDispatcherParams(
    state: DispatcherTaskState,
    abortController: AbortController
  ): DispatcherExecutionParams {
    return {
      previousStartedAt: state.previousStartedAt ? new Date(state.previousStartedAt) : undefined,
      eventWatermark: state.eventWatermark ? new Date(state.eventWatermark) : undefined,
      abortController,
    };
  }

  private buildRunResult(
    result: DispatcherExecutionResult,
    previousState: DispatcherTaskState
  ): RunResult {
    // `previousStartedAt` always advances — it is wall-clock telemetry of the
    // last tick, not a data-processing watermark.
    //
    // `eventWatermark` advances only when the dispatcher returned a
    // `nextEventWatermark` (i.e. the pipeline completed or halted on a clean
    // reason). On `step_error` we preserve the prior value so the failed
    // window is re-read on the next tick — this is what guarantees no
    // silent data loss when fetch_episodes / fetch_suppressions throw.
    const nextWatermark = result.nextEventWatermark ?? previousState.eventWatermark;
    const nextState: DispatcherTaskState = {
      previousStartedAt: result.startedAt.toISOString(),
      ...(nextWatermark ? { eventWatermark: nextWatermark } : {}),
    };
    return { state: nextState };
  }
}
