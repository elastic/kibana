/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WaitForResourcesStep } from './wait_for_resources_step';
import { createRulePipelineState } from '../test_utils';
import { createMockResourceManager } from '../../services/resource_service/resource_manager.mock';

describe('WaitForResourcesStep', () => {
  let step: WaitForResourcesStep;
  let resourceManager: ReturnType<typeof createMockResourceManager>;

  beforeEach(() => {
    resourceManager = createMockResourceManager();
    step = new WaitForResourcesStep(resourceManager);
  });

  it('waits for resources and continues execution', async () => {
    resourceManager.waitUntilReady.mockResolvedValue(undefined);

    const state = createRulePipelineState();
    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(resourceManager.waitUntilReady).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from resource manager', async () => {
    const error = new Error('Resource initialization failed');
    resourceManager.waitUntilReady.mockRejectedValue(error);

    const state = createRulePipelineState();

    await expect(step.execute(state)).rejects.toThrow('Resource initialization failed');
  });
});
