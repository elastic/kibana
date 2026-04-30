/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { DispatcherPipeline, type DispatcherPipelineContract } from './execution_pipeline';
import type { DispatcherExecutionParams, DispatcherExecutionResult } from './types';

export interface DispatcherServiceContract {
  run(params: DispatcherExecutionParams): Promise<DispatcherExecutionResult>;
}

@injectable()
export class DispatcherService implements DispatcherServiceContract {
  constructor(@inject(DispatcherPipeline) private readonly pipeline: DispatcherPipelineContract) {}

  public async run({
    previousStartedAt = new Date(),
    eventWatermark,
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();

    // If the pipeline throws, the error propagates and `task_runner` never
    // gets a result — Task Manager treats this as a failed run and the
    // persisted `eventWatermark` from the prior tick is preserved. That is
    // what guarantees no silent data loss when a step fails mid-pipeline.
    const pipelineResult = await this.pipeline.execute({
      startedAt,
      previousStartedAt,
      eventWatermark,
    });

    return {
      startedAt,
      nextEventWatermark: pipelineResult.finalState.nextEventWatermark,
    };
  }
}
