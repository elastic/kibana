/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ConfigSchema } from '../config';
import { plugin } from '.';

describe('cases tasks entry', () => {
  const setupPlugin = async () => {
    const config = ConfigSchema.validate({
      attachments: { enabled: true },
      templates: { enabled: true },
    });
    const context = {
      config: { get: () => config },
      logger: loggingSystemMock.create(),
    };
    const workflowsExtensions = {
      registerStepDefinition: jest.fn(),
      registerTriggerDefinition: jest.fn(),
      registerManagedWorkflowOwner: jest.fn(),
    };
    const agentBuilder = {
      tools: { register: jest.fn() },
      skills: { register: jest.fn() },
      attachments: { registerType: jest.fn() },
    };
    const core = { getStartServices: jest.fn() };

    const tasksPlugin = await plugin(context as never);
    tasksPlugin.setup(core as never, { workflowsExtensions, agentBuilder: agentBuilder as never });

    return { workflowsExtensions, agentBuilder };
  };

  it('registers the workflow steps and triggers', async () => {
    const { workflowsExtensions } = await setupPlugin();

    // The uniform registry, create from template, set extended fields and add attachments.
    expect(workflowsExtensions.registerStepDefinition.mock.calls.length).toBeGreaterThan(25);
    expect(workflowsExtensions.registerTriggerDefinition).toHaveBeenCalledTimes(8);
  });

  it('registers the agent builder tools, skills and attachment types as unavailable', async () => {
    const { agentBuilder } = await setupPlugin();

    expect(agentBuilder.attachments.registerType).toHaveBeenCalledTimes(2);
    expect(agentBuilder.tools.register).toHaveBeenCalled();
    expect(agentBuilder.skills.register).toHaveBeenCalled();

    const definitions = [
      ...agentBuilder.tools.register.mock.calls,
      ...agentBuilder.skills.register.mock.calls,
    ].map(([definition]) => definition);
    for (const definition of definitions) {
      await expect(definition.availability.handler({ request: {} })).resolves.toEqual({
        status: 'unavailable',
        reason: expect.stringContaining('not available in a task pod'),
      });
    }
  });

  it('fails a step with a message naming what is missing', async () => {
    const { workflowsExtensions } = await setupPlugin();
    const [definition] = workflowsExtensions.registerStepDefinition.mock.calls[0];

    const result = await definition.handler({
      input: {},
      contextManager: { getFakeRequest: () => ({}) },
      logger: loggingSystemMock.create().get(),
    });

    expect(result.error.message).toMatch(/Cases client is not available in a task pod/);
  });
});
