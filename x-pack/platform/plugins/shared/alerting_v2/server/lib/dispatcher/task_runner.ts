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

    if (!isEnabled) {
      return { state: taskInstance.state };
    }

    const params = this.createDispatcherParams(taskInstance, abortController);

    const result = await this.dispatcherService.run(params);

    return this.buildRunResult(result);
  }

  private async safeIsEnabled(): Promise<boolean> {
    try {
      return await this.dispatcherEnabledProvider();
    } catch {
      return true;
    }
  }

  private createDispatcherParams(
    taskInstance: TaskRunParams['taskInstance'],
    abortController: AbortController
  ): DispatcherExecutionParams {
    const state: DispatcherTaskState = taskInstance.state;

    return {
      previousStartedAt: state.previousStartedAt ? new Date(state.previousStartedAt) : undefined,
      abortController,
    };
  }

  private buildRunResult(result: DispatcherExecutionResult): RunResult {
    return { state: { previousStartedAt: result.startedAt.toISOString() } };
  }
}
