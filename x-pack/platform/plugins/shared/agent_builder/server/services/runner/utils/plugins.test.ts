/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { PluginDefinition } from '@kbn/agent-builder-common';
import type { PluginRegistry } from '../../plugins/plugin_registry';
import type { PluginsServiceStart } from '../../plugins/plugin_service';
import { createPluginsService } from './plugins';

const createPluginDefinition = (id: string, skillIds: string[]): PluginDefinition => ({
  id,
  name: `plugin-${id}`,
  version: '1.0.0',
  description: `Description for ${id}`,
  readonly: false,
  manifest: {},
  skill_ids: skillIds,
  unmanaged_assets: {
    agents: [],
    hooks: [],
    mcp_servers: [],
    output_styles: [],
    lsp_servers: [],
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const createMockRegistry = (getMock: jest.Mock = jest.fn()): PluginRegistry => ({
  has: jest.fn(),
  get: getMock,
  findByName: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const createPluginsServiceStartMock = (
  registryOverrides: Partial<PluginRegistry> = {}
): PluginsServiceStart => {
  const registry = { ...createMockRegistry(), ...registryOverrides };
  return {
    getRegistry: jest.fn().mockReturnValue(registry),
    installPlugin: jest.fn(),
    deletePlugin: jest.fn(),
  };
};

describe('createPluginsService', () => {
  const request = httpServerMock.createKibanaRequest();

  describe('resolveSkillIds', () => {
    it('returns empty array when pluginIds is empty', async () => {
      const pluginsServiceStart = createPluginsServiceStartMock();
      const service = createPluginsService({ pluginsServiceStart, request });

      const result = await service.resolveSkillIds([]);

      expect(result).toEqual([]);
      expect(pluginsServiceStart.getRegistry).not.toHaveBeenCalled();
    });

    it('returns skill IDs from a single plugin', async () => {
      const plugin = createPluginDefinition('plugin-1', ['skill-a', 'skill-b']);
      const pluginsServiceStart = createPluginsServiceStartMock({
        get: jest.fn().mockResolvedValue(plugin),
      });
      const service = createPluginsService({ pluginsServiceStart, request });

      const result = await service.resolveSkillIds(['plugin-1']);

      expect(result).toEqual(['skill-a', 'skill-b']);
    });

    it('collects skill IDs from multiple plugins', async () => {
      const plugin1 = createPluginDefinition('plugin-1', ['skill-a', 'skill-b']);
      const plugin2 = createPluginDefinition('plugin-2', ['skill-c']);
      const getMock = jest.fn().mockImplementation((id: string) => {
        if (id === 'plugin-1') return Promise.resolve(plugin1);
        if (id === 'plugin-2') return Promise.resolve(plugin2);
        return Promise.reject(new Error('not found'));
      });
      const pluginsServiceStart = createPluginsServiceStartMock({ get: getMock });
      const service = createPluginsService({ pluginsServiceStart, request });

      const result = await service.resolveSkillIds(['plugin-1', 'plugin-2']);

      expect(result).toEqual(['skill-a', 'skill-b', 'skill-c']);
    });

    it('silently ignores plugins that throw (not found)', async () => {
      const plugin1 = createPluginDefinition('plugin-1', ['skill-a']);
      const getMock = jest.fn().mockImplementation((id: string) => {
        if (id === 'plugin-1') return Promise.resolve(plugin1);
        return Promise.reject(new Error('plugin not found'));
      });
      const pluginsServiceStart = createPluginsServiceStartMock({ get: getMock });
      const service = createPluginsService({ pluginsServiceStart, request });

      const result = await service.resolveSkillIds(['plugin-1', 'missing-plugin']);

      expect(result).toEqual(['skill-a']);
    });

    it('returns empty array when all plugins are not found', async () => {
      const pluginsServiceStart = createPluginsServiceStartMock({
        get: jest.fn().mockRejectedValue(new Error('not found')),
      });
      const service = createPluginsService({ pluginsServiceStart, request });

      const result = await service.resolveSkillIds(['missing-1', 'missing-2']);

      expect(result).toEqual([]);
    });

    it('returns empty array when a plugin has no skill_ids', async () => {
      const plugin = createPluginDefinition('plugin-1', []);
      const pluginsServiceStart = createPluginsServiceStartMock({
        get: jest.fn().mockResolvedValue(plugin),
      });
      const service = createPluginsService({ pluginsServiceStart, request });

      const result = await service.resolveSkillIds(['plugin-1']);

      expect(result).toEqual([]);
    });
  });
});
