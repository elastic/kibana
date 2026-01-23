/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WaitForResourcesStep } from './wait_for_resources_step';
import type { RulePipelineState } from '../types';
import { createRuleExecutionInput } from '../test_utils';
import { createMockResourceManager } from '../../services/resource_service/resource_manager.mock';

describe('WaitForResourcesStep', () => {
  const createState = (): RulePipelineState => ({
    input: createRuleExecutionInput(),
  });

  it('waits for resources and continues execution', async () => {
    const resourceManager = createMockResourceManager();
    resourceManager.waitUntilReady.mockResolvedValue(undefined);

    const step = new WaitForResourcesStep(resourceManager);
    const state = createState();

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(resourceManager.waitUntilReady).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from resource manager', async () => {
    const resourceManager = createMockResourceManager();
    const error = new Error('Resource initialization failed');
    resourceManager.waitUntilReady.mockRejectedValue(error);

    const step = new WaitForResourcesStep(resourceManager);
    const state = createState();

    await expect(step.execute(state)).rejects.toThrow('Resource initialization failed');
  });
});
