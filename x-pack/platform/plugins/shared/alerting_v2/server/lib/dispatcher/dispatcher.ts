/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { LogMeta } from '@kbn/logging';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { DispatcherPipeline, type DispatcherPipelineContract } from './execution_pipeline';
import type {
  DispatcherExecutionParams,
  DispatcherExecutionResult,
  DispatcherTickSummary,
} from './types';

export interface DispatcherServiceContract {
  run(params: DispatcherExecutionParams): Promise<DispatcherExecutionResult>;
}

/**
 * Structured log meta shape for a single dispatcher tick. Lives under the
 * `kibana.alerting_v2.dispatcher.tick` namespace so consumers (ES|QL, Logs
 * app) can target a stable, unambiguous key without colliding with ECS.
 */
export interface DispatcherTickLogMeta extends LogMeta {
  kibana: {
    alerting_v2: {
      dispatcher: {
        tick: DispatcherTickSummary;
      };
    };
  };
}

@injectable()
export class DispatcherService implements DispatcherServiceContract {
  constructor(
    @inject(DispatcherPipeline) private readonly pipeline: DispatcherPipelineContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async run({
    previousStartedAt = new Date(),
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();

    const pipelineResult = await this.pipeline.execute({ startedAt, previousStartedAt });

    const finishedAt = new Date();
    const tick: DispatcherTickSummary = {
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      previous_started_at: previousStartedAt.toISOString(),
      completed: pipelineResult.completed,
      halt_reason: pipelineResult.haltReason ?? null,
      stages: pipelineResult.stageTimings,
    };

    this.logger.info<DispatcherTickLogMeta>({
      message: 'dispatcher tick complete',
      meta: {
        kibana: {
          alerting_v2: {
            dispatcher: { tick },
          },
        },
      },
    });

    return { startedAt, tick };
  }
}
