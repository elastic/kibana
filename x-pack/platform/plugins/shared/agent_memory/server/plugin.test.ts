/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { HookLifecycle } from '@kbn/agent-builder-common';
import { defaultAgentToolIds, platformMemoryTools } from '@kbn/agent-builder-common/tools';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { AGENT_MEMORY_INDEX } from '../common';
import type { AgentMemoryConfig } from './config';
import { AgentMemoryPlugin } from './plugin';
import { rememberInputSchema } from './schemas';
import { MEMORY_SKILL_ID } from './skills/memory_skill';
import type { AgentMemorySetupDependencies, GetMemoryStorage } from './types';
import { MEMORY_RECALL_STEP_ID } from './workflow_steps';

jest.mock('./storage/memory_storage', () => ({
  createMemoryStorage: jest.fn().mockReturnValue({}),
}));

const { createMemoryStorage } = jest.requireMock('./storage/memory_storage') as {
  createMemoryStorage: jest.Mock;
};

describe('AgentMemoryPlugin', () => {
  it('registers callable Agent Builder contracts with storage guidance from the shared index', async () => {
    const initializerContext = coreMock.createPluginInitializerContext<AgentMemoryConfig>();
    initializerContext.config.get.mockReturnValue({
      enabled: true,
      writeConfirmation: 'never',
    });
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
      workflowsExtensions,
    };

    plugin.setup(coreSetup, setupDependencies);

    expect(agentBuilder.tools.register.mock.calls.map(([tool]) => tool.id)).toEqual([
      platformMemoryTools.recall,
      platformMemoryTools.remember,
      platformMemoryTools.forget,
    ]);
    const registeredTools = agentBuilder.tools.register.mock.calls.map(([tool]) => tool);
    expect(registeredTools).toEqual([
      expect.objectContaining({ id: platformMemoryTools.recall, excludeFromMcp: true }),
      expect.objectContaining({ id: platformMemoryTools.remember, excludeFromMcp: true }),
      expect.objectContaining({ id: platformMemoryTools.forget, excludeFromMcp: true }),
    ]);
    expect(registeredTools.find(({ id }) => id === platformMemoryTools.remember)).toEqual(
      expect.objectContaining({
        confirmation: expect.objectContaining({ askUser: 'never' }),
      })
    );
    expect(registeredTools.find(({ id }) => id === platformMemoryTools.forget)).toEqual(
      expect.objectContaining({
        confirmation: expect.objectContaining({ askUser: 'never' }),
      })
    );
    for (const [tool] of agentBuilder.tools.register.mock.calls) {
      expect(tool).toEqual(expect.objectContaining({ handler: expect.any(Function) }));
    }
    const rememberInput = {
      title: 'Recover the memory index',
      description: 'Use the verified recovery sequence.',
    };
    expect(rememberInputSchema.safeParse(rememberInput).success).toBe(false);
    expect(
      rememberInputSchema.parse({
        ...rememberInput,
        category: 'procedures',
        type: 'procedural',
      })
    ).toEqual({
      ...rememberInput,
      category: 'procedures',
    });

    const registeredSkill = agentBuilder.skills.register.mock.calls[0]?.[0];
    expect(registeredSkill).toEqual(
      expect.objectContaining({
        id: MEMORY_SKILL_ID,
        name: MEMORY_SKILL_ID,
        content: expect.stringContaining(`FROM ${AGENT_MEMORY_INDEX}`),
        excludeFromElasticCapabilities: true,
        getRegistryTools: expect.any(Function),
      })
    );
    expect(registeredSkill?.content).toContain(
      'Before each response, scan the categories for durable user context; do not wait for an explicit request.'
    );
    expect(registeredSkill?.content).toContain('Use one coherent memory per subject or occurrence');
    expect(registeredSkill?.content).toContain(
      'For profile and preferences, recall the same subject first.'
    );
    expect(registeredSkill?.content).toContain(
      'If asking is unavailable, keep both and do not guess or delete.'
    );
    expect(registeredSkill?.content).toContain(
      'For events and trajectories, preserve material history'
    );
    expect(registeredSkill?.content).not.toContain(
      'Create one atomic memory for each independently useful fact'
    );
    expect(registeredSkill?.content).toContain(
      '`profile` — Current beliefs about the user, such as name, role, expertise, and background.'
    );
    expect(registeredSkill?.content).toContain(
      '`preferences` — Current preferences for styles, formats, tools, and workflows.'
    );
    expect(registeredSkill?.content).toContain(
      '`events` — Completed occurrences, decisions, and outcomes, including relevant dates.'
    );
    expect(registeredSkill?.content).toContain(
      '`trajectories` — Goals, plans, deadlines, progress changes, and milestones.'
    );
    expect(registeredSkill?.content).toContain(
      '`procedures` — Verified reusable methods, successful tool sequences, corrections, and known pitfalls.'
    );
    expect(registeredSkill?.content).toContain(
      'Save a procedure only after an explicit correction or a verified successful resolution.'
    );
    expect(registeredSkill?.content).toMatch(
      /Record when it applies, the pitfall,\s+the corrected method, and the verification signal\./
    );
    expect(registeredSkill?.content).toContain(
      'Before similar work, recall the `procedures` category'
    );
    expect(registeredSkill?.content).not.toContain(
      'Information the user has not consented to storing'
    );
    if (!registeredSkill?.getRegistryTools) {
      throw new Error('Expected Agent Memory skill to bind registry tools');
    }
    expect(await registeredSkill.getRegistryTools()).toEqual([
      platformMemoryTools.remember,
      platformMemoryTools.recall,
      platformMemoryTools.forget,
    ]);
    for (const memoryToolId of Object.values(platformMemoryTools)) {
      expect(defaultAgentToolIds).not.toContain(memoryToolId);
    }

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
    const rememberStepLoader = registerStepDefinition.mock.calls[1]?.[0];
    expect(recallStep).toEqual(
      expect.objectContaining({ id: MEMORY_RECALL_STEP_ID, handler: expect.any(Function) })
    );
    expect(rememberStepLoader).toEqual(expect.any(Function));
    if (typeof rememberStepLoader !== 'function') {
      throw new Error('Expected memory.remember to use a workflow step loader');
    }
    const rememberStep = await rememberStepLoader();
    expect(rememberStep).toEqual(
      expect.objectContaining({ id: 'memory.remember', handler: expect.any(Function) })
    );
    expect(rememberStep).not.toEqual(expect.objectContaining({ id: 'memory.retain' }));
  });

  it('uses the request client for data and the internal client for index templates', async () => {
    const initializerContext = coreMock.createPluginInitializerContext<AgentMemoryConfig>();
    initializerContext.config.get.mockReturnValue({
      enabled: true,
      writeConfirmation: 'always',
    });
    const plugin = new AgentMemoryPlugin(initializerContext);
    const coreStart = coreMock.createStart();
    const internalEsClient = coreStart.elasticsearch.client.asInternalUser;

    await plugin.start(coreStart, { agentBuilder: agentBuilderMocks.createStart() });

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
