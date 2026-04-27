/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginDefinition } from '@kbn/agent-builder-common';
import { createPluginRegistry } from './plugin_registry';
import type { ReadonlyPluginProvider, WritablePluginProvider } from './plugin_provider';

const createBuiltinPlugin = (overrides?: Partial<PluginDefinition>): PluginDefinition => ({
  id: 'builtin.plugin',
  name: 'Built-in Plugin',
  version: '1.0.0',
  description: 'A built-in plugin',
  readonly: true,
  manifest: {},
  skill_ids: ['skill-a'],
  unmanaged_assets: {
    agents: [],
    hooks: [],
    mcp_servers: [],
    output_styles: [],
    lsp_servers: [],
  },
  created_at: '',
  updated_at: '',
  ...overrides,
});

const createPersistedPlugin = (overrides?: Partial<PluginDefinition>): PluginDefinition => ({
  id: 'persisted-1',
  name: 'Persisted Plugin',
  version: '2.0.0',
  description: 'A persisted plugin',
  readonly: false,
  manifest: {},
  skill_ids: ['skill-b'],
  unmanaged_assets: {
    agents: [],
    hooks: [],
    mcp_servers: [],
    output_styles: [],
    lsp_servers: [],
  },
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const createMockBuiltinProvider = (plugins: PluginDefinition[] = []): ReadonlyPluginProvider => {
  const map = new Map(plugins.map((p) => [p.id, p]));
  return {
    id: 'builtin',
    readonly: true,
    has: (id) => map.has(id),
    get: (id) => map.get(id),
    findByName: (name) => {
      for (const p of map.values()) {
        if (p.name === name) return p;
      }
      return undefined;
    },
    list: () => [...map.values()],
  };
};

const createMockPersistedProvider = (plugins: PluginDefinition[] = []): WritablePluginProvider => {
  const map = new Map(plugins.map((p) => [p.id, p]));
  return {
    id: 'persisted',
    readonly: false,
    has: (id) => map.has(id),
    get: (id) => map.get(id),
    findByName: (name) => {
      for (const p of map.values()) {
        if (p.name === name) return p;
      }
      return undefined;
    },
    list: () => [...map.values()],
    create: jest.fn().mockImplementation(async (req) => {
      const plugin = createPersistedPlugin({ id: req.id ?? 'new-id', name: req.name });
      map.set(plugin.id, plugin);
      return plugin;
    }),
    update: jest.fn().mockImplementation(async (id, update) => {
      const existing = map.get(id)!;
      return { ...existing, ...update };
    }),
    delete: jest.fn().mockImplementation(async (id) => {
      map.delete(id);
    }),
  };
};

describe('PluginRegistry', () => {
  const builtinPlugin = createBuiltinPlugin();
  const persistedPlugin = createPersistedPlugin();

  describe('has', () => {
    it('returns true for builtin plugins', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider([builtinPlugin]),
        persistedProvider: createMockPersistedProvider(),
      });

      expect(await registry.has('builtin.plugin')).toBe(true);
    });

    it('returns true for persisted plugins', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider(),
        persistedProvider: createMockPersistedProvider([persistedPlugin]),
      });

      expect(await registry.has('persisted-1')).toBe(true);
    });

    it('returns false for unknown plugins', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider(),
        persistedProvider: createMockPersistedProvider(),
      });

      expect(await registry.has('unknown')).toBe(false);
    });
  });

  describe('get', () => {
    it('returns a builtin plugin', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider([builtinPlugin]),
        persistedProvider: createMockPersistedProvider(),
      });

      expect(await registry.get('builtin.plugin')).toEqual(builtinPlugin);
    });

    it('returns a persisted plugin', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider(),
        persistedProvider: createMockPersistedProvider([persistedPlugin]),
      });

      expect(await registry.get('persisted-1')).toEqual(persistedPlugin);
    });

    it('throws when plugin is not found', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider(),
        persistedProvider: createMockPersistedProvider(),
      });

      await expect(registry.get('unknown')).rejects.toThrow(/not found/i);
    });

    it('prefers builtin over persisted when IDs collide', async () => {
      const builtin = createBuiltinPlugin({ id: 'same-id' });
      const persisted = createPersistedPlugin({ id: 'same-id', description: 'persisted version' });

      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider([builtin]),
        persistedProvider: createMockPersistedProvider([persisted]),
      });

      const result = await registry.get('same-id');
      expect(result.readonly).toBe(true);
    });
  });

  describe('findByName', () => {
    it('finds a builtin plugin by name', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider([builtinPlugin]),
        persistedProvider: createMockPersistedProvider(),
      });

      expect(await registry.findByName('Built-in Plugin')).toEqual(builtinPlugin);
    });

    it('finds a persisted plugin by name', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider(),
        persistedProvider: createMockPersistedProvider([persistedPlugin]),
      });

      expect(await registry.findByName('Persisted Plugin')).toEqual(persistedPlugin);
    });

    it('returns undefined when no plugin matches', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider([builtinPlugin]),
        persistedProvider: createMockPersistedProvider([persistedPlugin]),
      });

      expect(await registry.findByName('Nonexistent')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns plugins from both providers', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider([builtinPlugin]),
        persistedProvider: createMockPersistedProvider([persistedPlugin]),
      });

      const result = await registry.list();
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([builtinPlugin, persistedPlugin]));
    });
  });

  describe('create', () => {
    it('creates a plugin via the persisted provider', async () => {
      const persistedProvider = createMockPersistedProvider();
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider(),
        persistedProvider,
      });

      await registry.create({
        name: 'New Plugin',
        version: '1.0.0',
        description: '',
        manifest: {},
        unmanaged_assets: {
          agents: [],
          hooks: [],
          mcp_servers: [],
          output_styles: [],
          lsp_servers: [],
        },
      });

      expect(persistedProvider.create).toHaveBeenCalled();
    });

    it('throws when a builtin plugin with the same ID exists', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider([builtinPlugin]),
        persistedProvider: createMockPersistedProvider(),
      });

      await expect(
        registry.create({
          id: 'builtin.plugin',
          name: 'Conflict',
          version: '1.0.0',
          description: '',
          manifest: {},
          unmanaged_assets: {
            agents: [],
            hooks: [],
            mcp_servers: [],
            output_styles: [],
            lsp_servers: [],
          },
        })
      ).rejects.toThrow(/already exists as a built-in plugin/);
    });
  });

  describe('update', () => {
    it('updates a persisted plugin', async () => {
      const persistedProvider = createMockPersistedProvider([persistedPlugin]);
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider(),
        persistedProvider,
      });

      await registry.update('persisted-1', { version: '3.0.0' });

      expect(persistedProvider.update).toHaveBeenCalledWith('persisted-1', { version: '3.0.0' });
    });

    it('throws when updating a builtin plugin', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider([builtinPlugin]),
        persistedProvider: createMockPersistedProvider(),
      });

      await expect(registry.update('builtin.plugin', { version: '2.0.0' })).rejects.toThrow(
        /read-only/
      );
    });

    it('throws when plugin is not found', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider(),
        persistedProvider: createMockPersistedProvider(),
      });

      await expect(registry.update('unknown', { version: '1.0.0' })).rejects.toThrow(/not found/i);
    });
  });

  describe('delete', () => {
    it('deletes a persisted plugin', async () => {
      const persistedProvider = createMockPersistedProvider([persistedPlugin]);
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider(),
        persistedProvider,
      });

      await registry.delete('persisted-1');

      expect(persistedProvider.delete).toHaveBeenCalledWith('persisted-1');
    });

    it('throws when deleting a builtin plugin', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider([builtinPlugin]),
        persistedProvider: createMockPersistedProvider(),
      });

      await expect(registry.delete('builtin.plugin')).rejects.toThrow(/read-only/);
    });

    it('throws when plugin is not found', async () => {
      const registry = createPluginRegistry({
        builtinProvider: createMockBuiltinProvider(),
        persistedProvider: createMockPersistedProvider(),
      });

      await expect(registry.delete('unknown')).rejects.toThrow(/not found/i);
    });
  });
});
