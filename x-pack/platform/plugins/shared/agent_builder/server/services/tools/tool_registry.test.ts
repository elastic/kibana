/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ToolType } from '@kbn/agent-builder-common';
import type { InternalToolDefinition } from '@kbn/agent-builder-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { createMockedTool, type MockedTool } from '../../test_utils/tools';
import { createToolRegistry } from './tool_registry';
import type {
  ReadonlyToolProvider,
  WritableToolProvider,
  ToolProviderListFilters,
} from './tool_provider';
import type { ToolHealthClient } from './health';

const applyFilters = (
  tools: InternalToolDefinition[],
  filters?: ToolProviderListFilters
): InternalToolDefinition[] => {
  let result = tools;
  if (filters?.types && filters.types.length > 0) {
    const typeSet = new Set(filters.types);
    result = result.filter((t) => typeSet.has(t.type));
  }
  if (filters?.tags && filters.tags.length > 0) {
    const tagSet = new Set(filters.tags);
    result = result.filter((t) => t.tags.some((tag) => tagSet.has(tag)));
  }
  return result;
};

const createMockBuiltinProvider = (tools: InternalToolDefinition[]): ReadonlyToolProvider => ({
  id: 'builtin',
  readonly: true,
  has: jest.fn((toolId) => tools.some((t) => t.id === toolId)),
  get: jest.fn((toolId) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) throw new Error(`Tool ${toolId} not found`);
    return tool;
  }),
  list: jest.fn((filters?: ToolProviderListFilters) => applyFilters(tools, filters)),
});

const createMockPersistedProvider = (tools: InternalToolDefinition[]): WritableToolProvider => ({
  id: 'persisted',
  readonly: false,
  has: jest.fn(async (toolId) => tools.some((t) => t.id === toolId)),
  get: jest.fn(async (toolId) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) throw new Error(`Tool ${toolId} not found`);
    return tool;
  }),
  list: jest.fn(async (filters?: ToolProviderListFilters) => applyFilters(tools, filters)),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const createMockHealthClient = (): jest.Mocked<ToolHealthClient> => ({
  get: jest.fn(),
  upsert: jest.fn(),
  recordSuccess: jest.fn(),
  recordFailure: jest.fn(),
  delete: jest.fn(),
  listBySpace: jest.fn(),
});

const availableTool = (overrides: Partial<MockedTool> = {}) =>
  createMockedTool({
    isAvailable: jest.fn(async () => ({ status: 'available' as const })),
    ...overrides,
  }) as unknown as InternalToolDefinition;

describe('ToolRegistryImpl', () => {
  const request = httpServerMock.createKibanaRequest();
  const uiSettings = uiSettingsServiceMock.createStartContract();
  const savedObjects = savedObjectsServiceMock.createStartContract();

  const setup = ({
    builtinTools = [],
    persistedTools = [],
    experimentalFeaturesEnabled = false,
  }: {
    builtinTools?: InternalToolDefinition[];
    persistedTools?: InternalToolDefinition[];
    experimentalFeaturesEnabled?: boolean;
  } = {}) => {
    const builtinProvider = createMockBuiltinProvider(builtinTools);
    const persistedProvider = createMockPersistedProvider(persistedTools);
    const healthClient = createMockHealthClient();

    const registry = createToolRegistry({
      logger: loggerMock.create(),
      getRunner: jest.fn() as any,
      builtinProvider,
      persistedProvider,
      request,
      space: 'default',
      uiSettings,
      savedObjects,
      healthClient,
      healthTrackedToolTypes: new Set(),
      experimentalFeaturesEnabled,
    });

    return { registry, builtinProvider, persistedProvider };
  };

  describe('list', () => {
    const builtinTool = availableTool({
      id: 'builtin-search',
      type: ToolType.builtin,
      tags: ['search', 'sml'],
    });

    const esqlTool = availableTool({
      id: 'my-esql-query',
      type: ToolType.esql,
      tags: ['custom', 'analytics'],
    });

    const mcpTool = availableTool({
      id: 'mcp.tavily.search',
      type: ToolType.mcp,
      tags: ['search', 'external'],
    });

    const workflowTool = availableTool({
      id: 'my-workflow',
      type: ToolType.workflow,
      tags: [],
    });

    it('returns all tools when no filters are provided', async () => {
      const { registry } = setup({
        builtinTools: [builtinTool],
        persistedTools: [esqlTool, mcpTool],
      });

      const tools = await registry.list();

      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.id)).toEqual([
        'builtin-search',
        'my-esql-query',
        'mcp.tavily.search',
      ]);
    });

    it('returns all tools when empty opts are provided', async () => {
      const { registry } = setup({
        builtinTools: [builtinTool],
        persistedTools: [esqlTool],
      });

      const tools = await registry.list({});

      expect(tools).toHaveLength(2);
    });

    describe('filter delegation to providers', () => {
      it('passes type filters to providers', async () => {
        const { registry, builtinProvider, persistedProvider } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool, mcpTool],
        });

        await registry.list({ types: [ToolType.mcp] });

        expect(builtinProvider.list).toHaveBeenCalledWith({
          types: [ToolType.mcp],
          tags: undefined,
        });
        expect(persistedProvider.list).toHaveBeenCalledWith({
          types: [ToolType.mcp],
          tags: undefined,
        });
      });

      it('passes tag filters to providers', async () => {
        const { registry, builtinProvider, persistedProvider } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool, mcpTool],
        });

        await registry.list({ tags: ['search'] });

        expect(builtinProvider.list).toHaveBeenCalledWith({
          types: undefined,
          tags: ['search'],
        });
        expect(persistedProvider.list).toHaveBeenCalledWith({
          types: undefined,
          tags: ['search'],
        });
      });

      it('passes combined filters to providers', async () => {
        const { registry, builtinProvider, persistedProvider } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool, mcpTool],
        });

        await registry.list({ types: [ToolType.mcp], tags: ['search'] });

        expect(builtinProvider.list).toHaveBeenCalledWith({
          types: [ToolType.mcp],
          tags: ['search'],
        });
        expect(persistedProvider.list).toHaveBeenCalledWith({
          types: [ToolType.mcp],
          tags: ['search'],
        });
      });

      it('normalizes empty arrays to undefined', async () => {
        const { registry, builtinProvider, persistedProvider } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool],
        });

        await registry.list({ types: [], tags: [] });

        expect(builtinProvider.list).toHaveBeenCalledWith({
          types: undefined,
          tags: undefined,
        });
        expect(persistedProvider.list).toHaveBeenCalledWith({
          types: undefined,
          tags: undefined,
        });
      });
    });

    describe('type filter', () => {
      it('filters tools by a single type', async () => {
        const { registry } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool, mcpTool, workflowTool],
        });

        const tools = await registry.list({ types: [ToolType.mcp] });

        expect(tools).toHaveLength(1);
        expect(tools[0].id).toBe('mcp.tavily.search');
      });

      it('filters tools by multiple types', async () => {
        const { registry } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool, mcpTool, workflowTool],
        });

        const tools = await registry.list({ types: [ToolType.mcp, ToolType.esql] });

        expect(tools).toHaveLength(2);
        expect(tools.map((t) => t.id)).toEqual(['my-esql-query', 'mcp.tavily.search']);
      });

      it('returns nothing when type matches no tools', async () => {
        const { registry } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool],
        });

        const tools = await registry.list({ types: [ToolType.index_search] });

        expect(tools).toHaveLength(0);
      });

      it('ignores empty type array', async () => {
        const { registry } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool],
        });

        const tools = await registry.list({ types: [] });

        expect(tools).toHaveLength(2);
      });
    });

    describe('tags filter', () => {
      it('filters tools by a single tag', async () => {
        const { registry } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool, mcpTool, workflowTool],
        });

        const tools = await registry.list({ tags: ['search'] });

        expect(tools).toHaveLength(2);
        expect(tools.map((t) => t.id)).toEqual(['builtin-search', 'mcp.tavily.search']);
      });

      it('filters tools by multiple tags (OR logic)', async () => {
        const { registry } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool, mcpTool, workflowTool],
        });

        const tools = await registry.list({ tags: ['sml', 'external'] });

        expect(tools).toHaveLength(2);
        expect(tools.map((t) => t.id)).toEqual(['builtin-search', 'mcp.tavily.search']);
      });

      it('returns nothing when tag matches no tools', async () => {
        const { registry } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool],
        });

        const tools = await registry.list({ tags: ['nonexistent'] });

        expect(tools).toHaveLength(0);
      });

      it('excludes tools with empty tags', async () => {
        const { registry } = setup({
          persistedTools: [workflowTool],
        });

        const tools = await registry.list({ tags: ['search'] });

        expect(tools).toHaveLength(0);
      });

      it('ignores empty tags array', async () => {
        const { registry } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool],
        });

        const tools = await registry.list({ tags: [] });

        expect(tools).toHaveLength(2);
      });
    });

    describe('combined filters', () => {
      it('applies both type and tags filters (AND logic)', async () => {
        const { registry } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool, mcpTool, workflowTool],
        });

        const tools = await registry.list({
          types: [ToolType.mcp, ToolType.builtin],
          tags: ['search'],
        });

        expect(tools).toHaveLength(2);
        expect(tools.map((t) => t.id)).toEqual(['builtin-search', 'mcp.tavily.search']);
      });

      it('narrows results when both filters apply', async () => {
        const { registry } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool, mcpTool, workflowTool],
        });

        const tools = await registry.list({
          types: [ToolType.mcp],
          tags: ['search'],
        });

        expect(tools).toHaveLength(1);
        expect(tools[0].id).toBe('mcp.tavily.search');
      });

      it('returns nothing when filters are mutually exclusive', async () => {
        const { registry } = setup({
          builtinTools: [builtinTool],
          persistedTools: [esqlTool, mcpTool],
        });

        const tools = await registry.list({
          types: [ToolType.esql],
          tags: ['search'],
        });

        expect(tools).toHaveLength(0);
      });
    });

    it('still applies availability check when filtering', async () => {
      const unavailableTool = createMockedTool({
        id: 'unavailable-mcp',
        type: ToolType.mcp,
        tags: ['search'],
        isAvailable: jest.fn(async () => ({ status: 'unavailable' as const })),
      }) as unknown as InternalToolDefinition;

      const { registry } = setup({
        persistedTools: [mcpTool, unavailableTool],
      });

      const tools = await registry.list({ types: [ToolType.mcp] });

      expect(tools).toHaveLength(1);
      expect(tools[0].id).toBe('mcp.tavily.search');
    });
  });

  describe('experimental filtering', () => {
    const normalTool = availableTool({
      id: 'normal-tool',
      type: ToolType.builtin,
      experimental: false,
    });
    const experimentalTool = availableTool({
      id: 'experimental-tool',
      type: ToolType.builtin,
      experimental: true,
    });

    describe('when experimentalFeaturesEnabled is false', () => {
      it('has() returns false for experimental tools', async () => {
        const { registry } = setup({
          builtinTools: [experimentalTool],
          experimentalFeaturesEnabled: false,
        });
        expect(await registry.has('experimental-tool')).toBe(false);
      });

      it('has() returns true for non-experimental tools', async () => {
        const { registry } = setup({
          builtinTools: [normalTool],
          experimentalFeaturesEnabled: false,
        });
        expect(await registry.has('normal-tool')).toBe(true);
      });

      it('get() throws not-found for experimental tools', async () => {
        const { registry } = setup({
          builtinTools: [experimentalTool],
          experimentalFeaturesEnabled: false,
        });
        await expect(registry.get('experimental-tool')).rejects.toThrow();
      });

      it('get() returns the tool for non-experimental tools', async () => {
        const { registry } = setup({
          builtinTools: [normalTool],
          experimentalFeaturesEnabled: false,
        });
        const result = await registry.get('normal-tool');
        expect(result.id).toBe('normal-tool');
      });

      it('list() excludes experimental tools', async () => {
        const { registry } = setup({
          builtinTools: [normalTool, experimentalTool],
          experimentalFeaturesEnabled: false,
        });
        const result = await registry.list();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('normal-tool');
      });
    });

    describe('when experimentalFeaturesEnabled is true', () => {
      it('has() returns true for experimental tools', async () => {
        const { registry } = setup({
          builtinTools: [experimentalTool],
          experimentalFeaturesEnabled: true,
        });
        expect(await registry.has('experimental-tool')).toBe(true);
      });

      it('get() returns experimental tools', async () => {
        const { registry } = setup({
          builtinTools: [experimentalTool],
          experimentalFeaturesEnabled: true,
        });
        const result = await registry.get('experimental-tool');
        expect(result.id).toBe('experimental-tool');
      });

      it('list() includes experimental tools', async () => {
        const { registry } = setup({
          builtinTools: [normalTool, experimentalTool],
          experimentalFeaturesEnabled: true,
        });
        const result = await registry.list();
        expect(result).toHaveLength(2);
      });
    });

    it('non-experimental tools are returned regardless of the flag', async () => {
      const off = setup({
        builtinTools: [normalTool],
        experimentalFeaturesEnabled: false,
      });
      const on = setup({
        builtinTools: [normalTool],
        experimentalFeaturesEnabled: true,
      });
      expect(await off.registry.has('normal-tool')).toBe(true);
      expect(await on.registry.has('normal-tool')).toBe(true);
    });
  });
});
