/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { WorkflowsExtensionsPublicPlugin } from './plugin';
import type { PublicStepDefinition } from './step_registry/types';

jest.mock('./steps', () => ({
  registerInternalStepDefinitions: jest.fn(),
}));

const { registerInternalStepDefinitions } = jest.requireMock('./steps');

const createPlugin = () => {
  const initContext = coreMock.createPluginInitializerContext({
    experimentalSteps: { javaScriptStep: false },
  });
  return new WorkflowsExtensionsPublicPlugin(initContext);
};

describe('WorkflowsExtensionsPublicPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete window.__workflowsExtensionsTestBridge;
  });

  describe('setup', () => {
    it('calls registerInternalStepDefinitions with experimentalSteps config', () => {
      const plugin = createPlugin();
      plugin.setup(coreMock.createSetup(), {});

      expect(registerInternalStepDefinitions).toHaveBeenCalledTimes(1);
      expect(registerInternalStepDefinitions).toHaveBeenCalledWith(expect.anything(), {
        experimentalSteps: { javaScriptStep: false },
      });
    });

    it('returns registerStepDefinition that delegates to step registry', () => {
      const plugin = createPlugin();
      const setup = plugin.setup(coreMock.createSetup(), {});

      const definition = { id: 'test.step' } as any;
      setup.registerStepDefinition(definition);

      // Duplicate should throw, proving delegation to real registry
      expect(() => setup.registerStepDefinition(definition)).toThrow(/already registered/);
    });

    it('returns registerTriggerDefinition that delegates to trigger registry', () => {
      const plugin = createPlugin();
      const setup = plugin.setup(coreMock.createSetup(), {});

      const definition = { id: 'test.trigger' } as any;
      setup.registerTriggerDefinition(definition);

      expect(() => setup.registerTriggerDefinition(definition)).toThrow(/already registered/);
    });
  });

  describe('start', () => {
    it('returns step registry accessors', () => {
      const plugin = createPlugin();
      const setup = plugin.setup(coreMock.createSetup(), {});
      const definition = { id: 'my.step' } as any;
      setup.registerStepDefinition(definition);

      const start = plugin.start(coreMock.createStart(), {});

      expect(start.hasStepDefinition('my.step')).toBe(true);
      expect(start.getStepDefinition('my.step')).toEqual(
        expect.objectContaining({ id: 'my.step' })
      );
      expect(start.getAllStepDefinitions()).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'my.step' })])
      );
      expect(start.hasStepDefinition('nonexistent')).toBe(false);
    });

    it('returns trigger registry accessors', () => {
      const plugin = createPlugin();
      const setup = plugin.setup(coreMock.createSetup(), {});
      const definition = { id: 'my.trigger' } as any;
      setup.registerTriggerDefinition(definition);

      const start = plugin.start(coreMock.createStart(), {});

      expect(start.hasTriggerDefinition('my.trigger')).toBe(true);
      expect(start.getTriggerDefinition('my.trigger')).toEqual(
        expect.objectContaining({ id: 'my.trigger' })
      );
      expect(start.getAllTriggerDefinitions()).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'my.trigger' })])
      );
    });

    it('isReady resolves when both registries have settled', async () => {
      const plugin = createPlugin();
      plugin.setup(coreMock.createSetup(), {});
      const start = plugin.start(coreMock.createStart(), {});

      // No async loaders registered, should resolve immediately
      await expect(start.isReady()).resolves.toBeUndefined();
    });

    it('isReady waits for async step loaders', async () => {
      const plugin = createPlugin();
      const setup = plugin.setup(coreMock.createSetup(), {});

      let resolveLoader!: (def: any) => void;
      const loaderPromise = new Promise<any>((resolve) => {
        resolveLoader = resolve;
      });
      setup.registerStepDefinition(() => loaderPromise);

      const start = plugin.start(coreMock.createStart(), {});

      let ready = false;
      const readyPromise = start.isReady().then(() => {
        ready = true;
      });

      // Should not be ready yet
      expect(ready).toBe(false);

      // Resolve the loader
      resolveLoader({ id: 'async.step' });
      await readyPromise;

      expect(ready).toBe(true);
      expect(start.hasStepDefinition('async.step')).toBe(true);
    });
  });

  describe('test bridge', () => {
    it('exposes the ids of sync and async registered steps once loaders have settled', async () => {
      const plugin = createPlugin();
      const setup = plugin.setup(coreMock.createSetup(), {});
      setup.registerStepDefinition({ id: 'sync.step' } as PublicStepDefinition);
      setup.registerStepDefinition(
        () =>
          new Promise<PublicStepDefinition>((resolve) => {
            setTimeout(() => resolve({ id: 'async.step' } as PublicStepDefinition), 0);
          })
      );
      setup.registerStepDefinition(() => Promise.resolve(undefined));

      plugin.start(coreMock.createStart(), {});

      const stepIds = await window.__workflowsExtensionsTestBridge?.getStepDefinitionIds();
      expect(stepIds).toEqual(['sync.step', 'async.step']);
    });

    it('is removed on stop', () => {
      const plugin = createPlugin();
      plugin.setup(coreMock.createSetup(), {});
      plugin.start(coreMock.createStart(), {});
      expect(window.__workflowsExtensionsTestBridge).toBeDefined();

      plugin.stop();

      expect(window.__workflowsExtensionsTestBridge).toBeUndefined();
    });
  });

  describe('stop', () => {
    it('does not throw', () => {
      const plugin = createPlugin();
      expect(() => plugin.stop()).not.toThrow();
    });
  });
});
