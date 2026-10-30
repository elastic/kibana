/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { PluginInitializer } from '@kbn/core-di-server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { inject, injectable } from 'inversify';
import type { PluginConfig } from '../../config';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { type DispatcherServiceContract } from './dispatcher';
import { DispatcherServiceInternalToken } from './tokens';
import type {
  DispatcherExecutionParams,
  DispatcherExecutionResult,
  DispatcherTaskState,
} from './types';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'signal'>;

@injectable()
export class DispatcherTaskRunner {
  private readonly paused: boolean;
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(DispatcherServiceInternalToken)
    private readonly dispatcherService: DispatcherServiceContract,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config'],
    @inject(LoggerServiceToken) logger: LoggerServiceContract
  ) {
    this.paused = pluginConfigAccessor.get<PluginConfig>().dispatcher.paused;
    this.logger = logger.forSubsystem('dispatcher');
  }

  public async run({ taskInstance, signal }: TaskRunParams): Promise<RunResult> {
    if (this.paused) {
      return this.skipPausedTick(taskInstance);
    }

    const params = this.createDispatcherParams(taskInstance, signal);

    const result = await this.dispatcherService.run(params);

    return this.buildRunResult(result);
  }

  private skipPausedTick(taskInstance: TaskRunParams['taskInstance']): RunResult {
    const state: DispatcherTaskState = taskInstance.state;
    this.logger.withLabels({ task_id: taskInstance.id }).debug({
      message: 'dispatcher paused by config; tick skipped and watermark held',
    });

    return {
      state: {
        eventWatermark: state.eventWatermark,
        stuckTicks: state.stuckTicks ?? 0,
      },
    };
  }

  private createDispatcherParams(
    taskInstance: TaskRunParams['taskInstance'],
    signal: AbortSignal
  ): DispatcherExecutionParams {
    const state: DispatcherTaskState = taskInstance.state;

    return {
      eventWatermark: state.eventWatermark ? new Date(state.eventWatermark) : undefined,
      stuckTicks: state.stuckTicks ?? 0,
      signal,
      taskId: taskInstance.id,
    };
  }

  private buildRunResult(result: DispatcherExecutionResult): RunResult {
    return {
      state: {
        eventWatermark: result.nextWatermark.toISOString(),
        stuckTicks: result.nextStuckTicks,
      },
    };
  }
}
