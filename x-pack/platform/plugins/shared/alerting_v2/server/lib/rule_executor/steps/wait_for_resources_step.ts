/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
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

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(ResourceManager) private readonly resourcesService: ResourceManagerContract
  ) {}

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { input } = state;

    this.logger.debug({
      message: `[${this.name}] Starting step for rule ${input.ruleId}`,
    });

    await this.resourcesService.waitUntilReady();

    this.logger.debug({
      message: `[${this.name}] Resources ready for rule ${input.ruleId}`,
    });

    return { type: 'continue' };
  }
}
