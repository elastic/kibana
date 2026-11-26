/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WaitForResourcesStep } from './wait_for_resources_step';
import { collectStreamResults, createPipelineStream, createRulePipelineState } from '../test_utils';
import { createMockResourceManager } from '../../services/resource_service/resource_manager.mock';
import { ALERT_ACTIONS_RESOURCE_KEY } from '../../../resources/datastreams/alert_actions';
import { ALERT_EVENTS_RESOURCE_KEY } from '../../../resources/datastreams/alert_events';

describe('WaitForResourcesStep', () => {
  let step: WaitForResourcesStep;
  let resourceManager: ReturnType<typeof createMockResourceManager>;

  beforeEach(() => {
    resourceManager = createMockResourceManager();
    step = new WaitForResourcesStep(resourceManager);
  });

  it('waits only for the rule executor resources and continues execution', async () => {
    resourceManager.waitForResources.mockResolvedValue(undefined);

    const state = createRulePipelineState();
    const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(results).toEqual([{ type: 'continue', state }]);
    expect(resourceManager.waitForResources).toHaveBeenCalledTimes(1);
    expect(resourceManager.waitForResources).toHaveBeenCalledWith([
      ALERT_EVENTS_RESOURCE_KEY,
      ALERT_ACTIONS_RESOURCE_KEY,
    ]);
  });

  it('propagates errors from resource manager', async () => {
    const error = new Error('Resource initialization failed');
    resourceManager.waitForResources.mockRejectedValue(error);

    const state = createRulePipelineState();

    await expect(
      collectStreamResults(step.executeStream(createPipelineStream([state])))
    ).rejects.toThrow('Resource initialization failed');
  });
});
