/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WaitForResourcesStep } from './wait_for_resources_step';
import { collectStreamResults, createPipelineStream, createRulePipelineState } from '../test_utils';
import { createMockResourceManager } from '../../services/resource_service/resource_manager.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('WaitForResourcesStep', () => {
  let step: WaitForResourcesStep;
  let resourceManager: ReturnType<typeof createMockResourceManager>;

  beforeEach(() => {
    const { loggerService } = createLoggerService();
    resourceManager = createMockResourceManager();
    step = new WaitForResourcesStep(loggerService, resourceManager);
  });

  it('waits for resources and continues execution', async () => {
    resourceManager.waitUntilReady.mockResolvedValue(undefined);

    const state = createRulePipelineState();
    const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(results).toEqual([{ type: 'continue', state }]);
    expect(resourceManager.waitUntilReady).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from resource manager', async () => {
    const error = new Error('Resource initialization failed');
    resourceManager.waitUntilReady.mockRejectedValue(error);

    const state = createRulePipelineState();

    await expect(
      collectStreamResults(step.executeStream(createPipelineStream([state])))
    ).rejects.toThrow('Resource initialization failed');
  });
});
