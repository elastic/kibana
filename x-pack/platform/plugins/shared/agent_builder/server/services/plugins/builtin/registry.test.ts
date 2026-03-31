/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInPluginDefinition } from '@kbn/agent-builder-server/plugins';
import { createBuiltinPluginRegistry } from './registry';

const createPlugin = (overrides?: Partial<BuiltInPluginDefinition>): BuiltInPluginDefinition => ({
  id: 'test.plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'A test built-in plugin',
  ...overrides,
});

describe('BuiltinPluginRegistry', () => {
  describe('register', () => {
    it('registers a plugin successfully', () => {
      const registry = createBuiltinPluginRegistry();
      const plugin = createPlugin();

      registry.register(plugin);

      expect(registry.has('test.plugin')).toBe(true);
    });

    it('throws when registering a plugin with a duplicate id', () => {
      const registry = createBuiltinPluginRegistry();
      registry.register(createPlugin());

      expect(() => registry.register(createPlugin())).toThrow(/already registered/);
    });
  });

  describe('has', () => {
    it('returns true for registered plugins', () => {
      const registry = createBuiltinPluginRegistry();
      registry.register(createPlugin());

      expect(registry.has('test.plugin')).toBe(true);
    });

    it('returns false for unregistered plugins', () => {
      const registry = createBuiltinPluginRegistry();

      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('get', () => {
    it('returns the plugin definition for a registered plugin', () => {
      const registry = createBuiltinPluginRegistry();
      const plugin = createPlugin();
      registry.register(plugin);

      expect(registry.get('test.plugin')).toEqual(plugin);
    });

    it('returns undefined for an unregistered plugin', () => {
      const registry = createBuiltinPluginRegistry();

      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('findByName', () => {
    it('returns the plugin matching the given name', () => {
      const registry = createBuiltinPluginRegistry();
      const plugin = createPlugin({ id: 'obs.plugin', name: 'Observability Plugin' });
      registry.register(plugin);

      expect(registry.findByName('Observability Plugin')).toEqual(plugin);
    });

    it('returns undefined when no plugin matches the name', () => {
      const registry = createBuiltinPluginRegistry();
      registry.register(createPlugin());

      expect(registry.findByName('Nonexistent')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns all registered plugins', () => {
      const registry = createBuiltinPluginRegistry();
      const plugin1 = createPlugin({ id: 'plugin-1', name: 'Plugin 1' });
      const plugin2 = createPlugin({ id: 'plugin-2', name: 'Plugin 2' });
      registry.register(plugin1);
      registry.register(plugin2);

      expect(registry.list()).toEqual([plugin1, plugin2]);
    });

    it('returns an empty array when no plugins are registered', () => {
      const registry = createBuiltinPluginRegistry();

      expect(registry.list()).toEqual([]);
    });
  });
});
