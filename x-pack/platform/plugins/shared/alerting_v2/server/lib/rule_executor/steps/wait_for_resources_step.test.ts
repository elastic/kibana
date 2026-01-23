/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WaitForResourcesStep } from './wait_for_resources_step';
import type { RulePipelineState, RuleExecutionInput } from '../types';
import { createMockResourceManager } from '../../services/resource_service/resource_manager.mock';

describe('WaitForResourcesStep', () => {
  const createInput = (): RuleExecutionInput => ({
    ruleId: 'rule-1',
    spaceId: 'default',
    scheduledAt: '2025-01-01T00:00:00.000Z',
    abortSignal: new AbortController().signal,
  });

  const createState = (): RulePipelineState => ({
    input: createInput(),
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

  it('has correct step name', () => {
    const resourceManager = createMockResourceManager();
    const step = new WaitForResourcesStep(resourceManager);

    expect(step.name).toBe('wait_for_resources');
  });
});
