/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import {
  ResourceManager,
  type ResourceManagerContract,
} from '../../services/resource_service/resource_manager';
import type { DispatcherPipelineState, DispatcherStep, DispatcherStepOutput } from '../types';

@injectable()
export class WaitForResourcesStep implements DispatcherStep {
  public readonly name = 'wait_for_resources';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(ResourceManager) private readonly resourceManager: ResourceManagerContract
  ) {}

  public async execute(_state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    this.logger.debug({ message: `[${this.name}] Waiting for resources to be ready` });

    await this.resourceManager.waitUntilReady();

    this.logger.debug({ message: `[${this.name}] Resources ready` });

    return { type: 'continue' };
  }
}
