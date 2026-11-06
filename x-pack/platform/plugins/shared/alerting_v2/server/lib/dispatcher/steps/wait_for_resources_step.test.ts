/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createMockResourceManager } from '../../services/resource_service/resource_manager.mock';
import { createDispatcherPipelineState } from '../fixtures/test_utils';
import { WaitForResourcesStep } from './wait_for_resources_step';

describe('WaitForResourcesStep', () => {
  let step: WaitForResourcesStep;
  let resourceManager: ReturnType<typeof createMockResourceManager>;

  beforeEach(() => {
    resourceManager = createMockResourceManager();
    step = new WaitForResourcesStep(resourceManager);
  });

  it('waits for resources and continues execution', async () => {
    const { loggerService } = createLoggerService();
    resourceManager.waitUntilReady.mockResolvedValue(undefined);

    const state = createDispatcherPipelineState();
    const result = await step.execute(state, loggerService);

    expect(result).toEqual({ type: 'continue' });
    expect(resourceManager.waitUntilReady).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from resource manager', async () => {
    const { loggerService } = createLoggerService();
    const error = new Error('Resource initialization failed');
    resourceManager.waitUntilReady.mockRejectedValue(error);

    const state = createDispatcherPipelineState();

    await expect(step.execute(state, loggerService)).rejects.toThrow(
      'Resource initialization failed'
    );
  });
});
