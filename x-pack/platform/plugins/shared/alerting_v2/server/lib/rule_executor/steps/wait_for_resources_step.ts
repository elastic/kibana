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

@injectable()
export class WaitForResourcesStep implements RuleExecutionStep {
  public readonly name = 'wait_for_resources';

  constructor(
    @inject(ResourceManager) private readonly resourcesService: ResourceManagerContract
  ) {}

  public async execute(_state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    // Wait for the plugin-wide resource initialization started during plugin setup.
    await this.resourcesService.waitUntilReady();

    return { type: 'continue' };
  }
}
