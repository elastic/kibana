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

@injectable()
export class WaitForResourcesStep implements RuleExecutionStep {
  public readonly name = 'wait_for_resources';

  constructor(
    @inject(ResourceManager) private readonly resourcesService: ResourceManagerContract
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return mapStep(streamState, async (state) => {
      const logger = state.logger.withLabels({ step: this.name });

      logger.debug({ message: 'Waiting for resources' });

      await this.resourcesService.waitUntilReady();

      logger.debug({ message: 'Resources ready' });

      return { type: 'continue', state };
    });
  }
}
