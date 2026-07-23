/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { SML_DASHBOARD_INGESTION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { AgentBuilderSmlPlugin } from './plugin';

const makeSetupDeps = (overrides = {}) => ({
  features: featuresPluginMock.createSetup(),
  taskManager: taskManagerMock.createSetup(),
  workflowsExtensions: workflowsExtensionsMock.createSetup(),
  ...overrides,
});

describe('AgentBuilderSmlPlugin.setup()', () => {
  it('calls contextEngine.registerAiIndex with the SML registration when contextEngine is present', () => {
    const plugin = new AgentBuilderSmlPlugin(coreMock.createPluginInitializerContext());
    const registerAiIndex = jest.fn();
    const coreSetup = coreMock.createSetup();

    plugin.setup(coreSetup, makeSetupDeps({ contextEngine: { registerAiIndex } }));

    expect(registerAiIndex).toHaveBeenCalledTimes(1);
    expect(registerAiIndex).toHaveBeenCalledWith(
      'elastic',
      expect.objectContaining({
        name: 'Elastic',
        description: expect.stringContaining('Agent Builder'),
        dest: { type: 'index', value: 'ai-index-idx-sml-data' },
        // The dashboard ingestion workflow is declared as the populating automation.
        automations: [{ type: 'workflow', value: SML_DASHBOARD_INGESTION_WORKFLOW_ID }],
        sources: [],
        // Runtime fields + DLS role are applied by context_engine from these.
        index_config: expect.objectContaining({ mappings: expect.any(Object) }),
        dls: expect.objectContaining({ role: 'ai-index-elastic-reader' }),
      })
    );
  });

  it('registers the SML plugin as a managed-workflow owner', () => {
    const plugin = new AgentBuilderSmlPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const workflowsExtensions = workflowsExtensionsMock.createSetup();

    plugin.setup(coreSetup, makeSetupDeps({ workflowsExtensions }));

    expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledWith(
      'agentBuilderSml'
    );
  });

  it('does not throw when contextEngine is absent', () => {
    const plugin = new AgentBuilderSmlPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();

    expect(() => plugin.setup(coreSetup, makeSetupDeps())).not.toThrow();
  });
});
