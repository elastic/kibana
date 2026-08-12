/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { mapStep } from '../stream_utils';
import {
  ResourceManager,
  type ResourceManagerContract,
} from '../../services/resource_service/resource_manager';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

@injectable()
export class WaitForResourcesStep implements RuleExecutionStep {
  public readonly name = 'wait_for_resources';

  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract,
    @inject(ResourceManager) private readonly resourcesService: ResourceManagerContract
  ) {
    this.logger = loggerService.forSubsystem('ruleExecutor');
  }

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return mapStep(streamState, async (state) => {
      const { input } = state;

      this.logger.debug({
        message: 'Waiting for resources',
        labels: { step: this.name, rule_id: input.ruleId },
      });

      await this.resourcesService.waitUntilReady();

      this.logger.debug({
        message: 'Resources ready',
        labels: { step: this.name, rule_id: input.ruleId },
      });

      return { type: 'continue', state };
    });
  }
}
