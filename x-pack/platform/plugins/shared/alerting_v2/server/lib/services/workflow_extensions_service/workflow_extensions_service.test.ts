/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { WorkflowExtensionsService } from './workflow_extensions_service';

function createService() {
  const setup = workflowsExtensionsMock.createSetup();
  const start = workflowsExtensionsMock.createStart();
  const service = new WorkflowExtensionsService(setup, () => start);
  return { service, setup, start };
}

describe('WorkflowExtensionsService', () => {
  it('registerTriggerDefinitions delegates to workflows extensions setup', () => {
    const { service, setup } = createService();
    const triggerDefinition = {
      id: 'alerting-v2-unit-test.trigger' as const,
      eventSchema: z.object({ key: z.string() }),
    };

    service.registerTriggerDefinitions([triggerDefinition]);

    expect(setup.registerTriggerDefinition).toHaveBeenCalledTimes(1);
    expect(setup.registerTriggerDefinition).toHaveBeenCalledWith(triggerDefinition);
  });

  it('registerStepDefinitions delegates to workflows extensions setup', () => {
    const { service, setup } = createService();
    const stepLoader = () => Promise.resolve(undefined);

    service.registerStepDefinitions([stepLoader]);

    expect(setup.registerStepDefinition).toHaveBeenCalledTimes(1);
    expect(setup.registerStepDefinition).toHaveBeenCalledWith(stepLoader);
  });

  it('emitEvent resolves the workflows client and delegates emitEvent', async () => {
    const { service, start } = createService();
    const emitEvent = jest.fn().mockResolvedValue(undefined);
    start.getClient.mockResolvedValue({
      isWorkflowsAvailable: true,
      emitEvent,
    });
    const request = httpServerMock.createKibanaRequest();

    await service.emitEvent(request, 'some.trigger', { a: 1 });

    expect(start.getClient).toHaveBeenCalledWith(request);
    expect(emitEvent).toHaveBeenCalledWith('some.trigger', { a: 1 });
  });
});
