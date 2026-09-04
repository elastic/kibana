/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import {
  ResourceManager,
  type ResourceManagerContract,
} from '../../services/resource_service/resource_manager';
import type { DispatcherPipelineState, DispatcherStep, DispatcherStepOutput } from '../types';

@injectable()
export class WaitForResourcesStep implements DispatcherStep {
  public readonly name = 'wait_for_resources';

  constructor(@inject(ResourceManager) private readonly resourceManager: ResourceManagerContract) {}

  public async execute(
    _: Readonly<DispatcherPipelineState>,
    logger: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    logger.debug({ message: 'Waiting for resources to be ready' });

    await this.resourceManager.waitUntilReady();

    logger.debug({ message: 'Resources ready' });

    return { type: 'continue' };
  }
}
