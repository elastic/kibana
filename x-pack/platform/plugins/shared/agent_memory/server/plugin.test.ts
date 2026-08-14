/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { HookLifecycle } from '@kbn/agent-builder-common';
import { platformMemoryTools } from '@kbn/agent-builder-common/tools';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { AGENT_MEMORY_INDEX } from '@kbn/agent-memory-common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { AgentMemoryConfig } from './config';
import { AgentMemoryPlugin } from './plugin';
import type {
  AgentMemorySetupDependencies,
  AgentMemoryStartDependencies,
  GetMemoryStorage,
} from './types';
import { MEMORY_RECALL_STEP_ID, MEMORY_RETAIN_STEP_ID } from './workflow_steps';

jest.mock('./storage/memory_storage', () => ({
  createMemoryStorage: jest.fn().mockReturnValue({}),
}));

jest.mock('@kbn/data-streams', () => ({
  DataStreamClient: {
    fromDefinition: jest.fn().mockReturnValue({}),
    initializeTemplate: jest.fn().mockResolvedValue(undefined),
  },
}));

const { createMemoryStorage } = jest.requireMock('./storage/memory_storage') as {
  createMemoryStorage: jest.Mock;
};

describe('AgentMemoryPlugin', () => {
  it('registers callable Agent Builder contracts with storage guidance from the shared index', async () => {
    const initializerContext = coreMock.createPluginInitializerContext<AgentMemoryConfig>();
    initializerContext.config.get.mockReturnValue({ enabled: true });
    const plugin = new AgentMemoryPlugin(initializerContext);
    const coreSetup = coreMock.createSetup();
    const agentBuilder = agentBuilderMocks.createSetup();
    const registerStepDefinition = jest.fn<
      ReturnType<WorkflowsExtensionsServerPluginSetup['registerStepDefinition']>,
      Parameters<WorkflowsExtensionsServerPluginSetup['registerStepDefinition']>
    >();
    const workflowsExtensions: WorkflowsExtensionsServerPluginSetup = {
      registerStepDefinition,
      registerTriggerDefinition: jest.fn(),
      registerWorkflowsClientProvider: jest.fn(),
      registerManagedWorkflowsSystemApiProvider: jest.fn(),
      registerManagedWorkflowOwner: jest.fn(),
    };
    const setupDependencies: AgentMemorySetupDependencies = {
      agentBuilder,
      features: featuresPluginMock.createSetup(),
      licensing: licensingMock.createSetup(),
      security: securityMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
      workflowsExtensions,
    };

    plugin.setup(coreSetup, setupDependencies);

    expect(agentBuilder.tools.register.mock.calls.map(([tool]) => tool.id)).toEqual([
      platformMemoryTools.recall,
      platformMemoryTools.remember,
      platformMemoryTools.forget,
    ]);
    for (const [tool] of agentBuilder.tools.register.mock.calls) {
      expect(tool).toEqual(expect.objectContaining({ handler: expect.any(Function) }));
    }

    expect(agentBuilder.skills.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'agent-memory',
        name: 'agent-memory',
        content: expect.stringContaining(`FROM ${AGENT_MEMORY_INDEX}`),
      })
    );

    const hook = agentBuilder.hooks.register.mock.calls[0]?.[0];
    expect(hook).toEqual(
      expect.objectContaining({
        id: 'agent-memory-inject',
        hooks: expect.objectContaining({
          [HookLifecycle.beforeAgent]: expect.objectContaining({ handler: expect.any(Function) }),
        }),
      })
    );

    const recallStep = registerStepDefinition.mock.calls[0]?.[0];
    const retainStepLoader = registerStepDefinition.mock.calls[1]?.[0];
    expect(recallStep).toEqual(
      expect.objectContaining({ id: MEMORY_RECALL_STEP_ID, handler: expect.any(Function) })
    );
    expect(retainStepLoader).toEqual(expect.any(Function));
    if (typeof retainStepLoader !== 'function') {
      throw new Error('Expected memory.retain to use a workflow step loader');
    }
    const retainStep = await retainStepLoader();
    expect(retainStep).toEqual(
      expect.objectContaining({ id: MEMORY_RETAIN_STEP_ID, handler: expect.any(Function) })
    );
  });

  it('uses the request client for data and the internal client for index templates', async () => {
    const initializerContext = coreMock.createPluginInitializerContext<AgentMemoryConfig>();
    initializerContext.config.get.mockReturnValue({ enabled: true });
    const plugin = new AgentMemoryPlugin(initializerContext);
    const coreStart = coreMock.createStart();
    const internalEsClient = coreStart.elasticsearch.client.asInternalUser;

    await plugin.start(coreStart, {
      security: {},
    } as AgentMemoryStartDependencies);

    const { createStorage } = plugin as unknown as {
      createStorage: GetMemoryStorage;
    };
    const currentUserEsClient = {} as ElasticsearchClient;
    createStorage(currentUserEsClient);

    expect(createMemoryStorage).toHaveBeenCalledWith({
      logger: expect.anything(),
      esClient: currentUserEsClient,
      indexManagementClient: internalEsClient,
    });
  });
});
