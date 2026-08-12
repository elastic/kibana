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

  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract,
    @inject(ResourceManager) private readonly resourceManager: ResourceManagerContract
  ) {
    this.logger = loggerService.forSubsystem('dispatcher');
  }

  public async execute(_state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    this.logger.debug({ message: 'Waiting for resources', labels: { step: this.name } });

    await this.resourceManager.waitUntilReady();

    this.logger.debug({ message: 'Resources ready', labels: { step: this.name } });

    return { type: 'continue' };
  }
}
