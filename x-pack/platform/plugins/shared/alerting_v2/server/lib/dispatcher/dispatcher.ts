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
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();

    await this.pipeline.execute({ startedAt, previousStartedAt });

    return { startedAt };
  }
}
