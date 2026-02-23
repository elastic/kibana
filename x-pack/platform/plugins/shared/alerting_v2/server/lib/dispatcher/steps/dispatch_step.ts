/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type { DispatcherPipelineState, DispatcherStep, DispatcherStepOutput } from '../types';

export class DispatchStep implements DispatcherStep {
  public readonly name = 'dispatch';

  constructor(private readonly logger: LoggerServiceContract) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { dispatch = [] } = state;

    for (const group of dispatch) {
      this.logger.debug({
        message: () =>
          `Dispatching notification group ${group.id} for policy ${group.policyId} with workflow ${group.workflowId}`,
      });
    }

    return { type: 'continue' };
  }
}
