/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';
import { ContextEnginePlugin } from './plugin';

const createSetupDeps = () => ({ workflowsExtensions: workflowsExtensionsMock.createSetup() });

describe('ContextEnginePlugin', () => {
  it('resolves Agent Builder via core.plugins.onStart', () => {
    const plugin = new ContextEnginePlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    coreSetup.plugins.onStart.mockResolvedValue({
      agentBuilder: { found: false },
    });

    plugin.setup(coreSetup, createSetupDeps());

    expect(coreSetup.plugins.onStart).toHaveBeenCalledWith('agentBuilder');
  });

  it('does not throw when onStart throws (Agent Builder disabled for this solution/tier)', () => {
    const plugin = new ContextEnginePlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    coreSetup.plugins.onStart.mockImplementation(() => {
      throw new Error('plugin not in dependency map');
    });

    expect(() => plugin.setup(coreSetup, createSetupDeps())).not.toThrow();
  });

  it('exposes registerAgentBuilderIntegration on start', () => {
    const plugin = new ContextEnginePlugin(coreMock.createPluginInitializerContext());
    const coreStart = coreMock.createStart();
    const integration = {
      suggestAutomation: {
        canSuggest: () => false,
        suggestAutomation: jest.fn(),
        subscribeToAutomationSaved: () => () => {},
      },
    };

    const start = plugin.start(coreStart);
    start.registerAgentBuilderIntegration(integration);

    expect(start.registerAgentBuilderIntegration).toEqual(expect.any(Function));
  });
});
