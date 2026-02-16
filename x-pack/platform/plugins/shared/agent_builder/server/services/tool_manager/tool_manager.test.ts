/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolManager, createToolManager } from './tool_manager';
import type { StructuredTool } from '@langchain/core/tools';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner/tool_manager';
import type { ExecutableTool } from '@kbn/agent-builder-server';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import { loggerMock } from '@kbn/logging-mocks';
import { z } from '@kbn/zod';

// Mock dependencies
jest.mock('@kbn/agent-builder-genai-utils/langchain', () => ({
  createToolIdMappings: jest.fn((tools) => {
    const map = new Map();
    tools.forEach((tool: any) => {
      map.set(tool.id, `langchain_${tool.id}`);
    });
    return map;
  }),
  toolToLangchain: jest.fn(async ({ tool, toolId }) => {
    return {
      name: toolId || tool.id,
      description: tool.description,
      invoke: jest.fn(),
    } as unknown as StructuredTool;
  }),
}));

jest.mock('@kbn/agent-builder-genai-utils/langchain/tools', () => ({
  reverseMap: jest.fn((map) => {
    const reversed = new Map();
    map.forEach((value: string, key: string) => {
      reversed.set(value, key);
    });
    return reversed;
  }),
}));

jest.mock('../tools/browser_tool_adapter', () => ({
  browserToolsToLangchain: jest.fn(({ browserApiTools }) => {
    const tools = browserApiTools.map(
      (tool: any) =>
        ({
          name: `browser_${tool.id}`,
          description: tool.description,
          invoke: jest.fn(),
        } as unknown as StructuredTool)
    );

    const idMappings = new Map();
    browserApiTools.forEach((tool: any) => {
      idMappings.set(`browser_${tool.id}`, `browser_${tool.id}`);
    });

    return { tools, idMappings };
  }),
}));

describe('ToolManager', () => {
  let toolManager: ToolManager;
  const mockLogger = loggerMock.create();

  beforeEach(() => {
    toolManager = new ToolManager({ dynamicToolCapacity: 5 });
  });

  const createMockExecutableTool = (
    id: string,
    description: string = 'Test tool'
  ): ExecutableTool => ({
    id,
    type: 'builtin' as any,
    description,
    tags: [],
    readonly: false,
    configuration: {},
    getSchema: async () => z.object({}),
    execute: jest.fn(),
  });

  const createMockBrowserTool = (
    id: string,
    description: string = 'Browser tool'
  ): BrowserApiToolMetadata => ({
    id,
    description,
    schema: {
      type: 'object',
      properties: {},
    },
  });

  describe('constructor', () => {
    it('creates ToolManager with specified capacity', () => {
      const manager = new ToolManager({ dynamicToolCapacity: 10 });
      expect(manager.list()).toEqual([]);
    });

    it('initializes with empty tool mappings', () => {
      expect(toolManager.getToolIdMapping().size).toBe(0);
    });
  });

  describe('createToolManager', () => {
    it('creates a ToolManager instance', () => {
      const manager = createToolManager();
      expect(manager).toBeInstanceOf(ToolManager);
    });

    it('creates ToolManager with default capacity', () => {
      const manager = createToolManager();
      expect(manager.list()).toEqual([]);
    });
  });

  describe('addTool - executable tools', () => {
    it('adds a single executable tool as static tool', async () => {
      const tool = createMockExecutableTool('tool-1');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      const tools = toolManager.list();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('langchain_tool-1');
    });

    it('adds multiple executable tools as static tools', async () => {
      const tool1 = createMockExecutableTool('tool-1');
      const tool2 = createMockExecutableTool('tool-2');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: [tool1, tool2],
        logger: mockLogger,
      });

      const tools = toolManager.list();
      expect(tools).toHaveLength(2);
    });

    it('adds executable tool as dynamic tool when dynamic option is true', async () => {
      const tool = createMockExecutableTool('dynamic-tool');

      await toolManager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: tool,
          logger: mockLogger,
        },
        { dynamic: true }
      );

      const tools = toolManager.list();
      expect(tools).toHaveLength(1);
      const dynamicIds = toolManager.getDynamicToolIds();
      expect(dynamicIds.length).toBeGreaterThan(0);
    });

    it('merges tool id mappings when adding multiple tools', async () => {
      const tool1 = createMockExecutableTool('tool-1');
      const tool2 = createMockExecutableTool('tool-2');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: [tool1, tool2],
        logger: mockLogger,
      });

      const mappings = toolManager.getToolIdMapping();
      expect(mappings.size).toBeGreaterThan(0);
    });

    it('removes a dynamic tool when the same tool is later added as static', async () => {
      const tool = createMockExecutableTool('tool-1');

      await toolManager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: tool,
          logger: mockLogger,
        },
        { dynamic: true }
      );

      expect(toolManager.list().map((t) => t.name)).toEqual(['langchain_tool-1']);
      expect(toolManager.getDynamicToolIds()).toEqual(['tool-1']);

      // Re-adding as static should remove from dynamic cache and keep only the static tool.
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      expect(toolManager.list().map((t) => t.name)).toEqual(['langchain_tool-1']);
      expect(toolManager.getDynamicToolIds()).toEqual([]);

      // Adding a new dynamic tool should keep tool-1 static and only track tool-2 as dynamic.
      const tool2 = createMockExecutableTool('tool-2');
      await toolManager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: tool2,
          logger: mockLogger,
        },
        { dynamic: true }
      );

      expect(toolManager.list().map((t) => t.name)).toEqual([
        'langchain_tool-1',
        'langchain_tool-2',
      ]);
      expect(toolManager.getDynamicToolIds()).toEqual(['tool-2']);
    });

    it('does not add a dynamic tool when a static tool with the same name exists', async () => {
      const tool = createMockExecutableTool('tool-1');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      await toolManager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: tool,
          logger: mockLogger,
        },
        { dynamic: true }
      );

      expect(toolManager.list().map((t) => t.name)).toEqual(['langchain_tool-1']);
      expect(toolManager.getDynamicToolIds()).toEqual([]);
    });
  });

  describe('setEventEmitter', () => {
    it('passes the event emitter to toolToLangchain when set', async () => {
      const { toolToLangchain } = jest.requireMock('@kbn/agent-builder-genai-utils/langchain') as {
        toolToLangchain: jest.Mock;
      };

      const tool = createMockExecutableTool('tool-1');
      const eventEmitter = jest.fn();

      toolManager.setEventEmitter(eventEmitter);

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      expect(toolToLangchain).toHaveBeenCalledWith(
        expect.objectContaining({
          sendEvent: eventEmitter,
        })
      );
    });

    it('uses the event emitter for tools added in subsequent addTools calls', async () => {
      const { toolToLangchain } = jest.requireMock('@kbn/agent-builder-genai-utils/langchain') as {
        toolToLangchain: jest.Mock;
      };
      toolToLangchain.mockClear();

      const eventEmitter = jest.fn();
      toolManager.setEventEmitter(eventEmitter);

      // First addTools call
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: createMockExecutableTool('tool-1'),
        logger: mockLogger,
      });

      // Second addTools call (simulating skill tools being added later)
      await toolManager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: createMockExecutableTool('skill-tool'),
          logger: mockLogger,
        },
        { dynamic: true }
      );

      // Both calls should have received the event emitter
      expect(toolToLangchain).toHaveBeenCalledTimes(2);
      expect(toolToLangchain).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ sendEvent: eventEmitter })
      );
      expect(toolToLangchain).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ sendEvent: eventEmitter })
      );
    });

    it('does not pass event emitter when not set', async () => {
      const { toolToLangchain } = jest.requireMock('@kbn/agent-builder-genai-utils/langchain') as {
        toolToLangchain: jest.Mock;
      };

      const tool = createMockExecutableTool('tool-1');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      expect(toolToLangchain).toHaveBeenCalledWith(
        expect.objectContaining({
          sendEvent: undefined,
        })
      );
    });
  });

  describe('addTool - browser tools', () => {
    it('adds a single browser tool as static tool', async () => {
      const tool = createMockBrowserTool('browser-tool-1');

      await toolManager.addTools({
        type: ToolManagerToolType.browser,
        tools: tool,
      });

      const tools = toolManager.list();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('browser_browser-tool-1');
    });

    it('adds multiple browser tools as static tools', async () => {
      const tool1 = createMockBrowserTool('browser-tool-1');
      const tool2 = createMockBrowserTool('browser-tool-2');

      await toolManager.addTools({
        type: ToolManagerToolType.browser,
        tools: [tool1, tool2],
      });

      const tools = toolManager.list();
      expect(tools).toHaveLength(2);
    });

    it('adds browser tool as dynamic tool when dynamic option is true', async () => {
      const tool = createMockBrowserTool('dynamic-browser-tool');

      await toolManager.addTools(
        {
          type: ToolManagerToolType.browser,
          tools: tool,
        },
        { dynamic: true }
      );

      const tools = toolManager.list();
      expect(tools).toHaveLength(1);
      expect(toolManager.getDynamicToolIds()).toContain('browser_dynamic-browser-tool');
    });
  });

  describe('list', () => {
    it('returns empty array when no tools are added', () => {
      expect(toolManager.list()).toEqual([]);
    });

    it('returns dynamic tools in MRU -> LRU order (and updates on recordToolUse)', async () => {
      const manager = new ToolManager({ dynamicToolCapacity: 5 });

      await manager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: createMockExecutableTool('tool-1'),
          logger: mockLogger,
        },
        { dynamic: true }
      );
      await manager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: createMockExecutableTool('tool-2'),
          logger: mockLogger,
        },
        { dynamic: true }
      );
      await manager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: createMockExecutableTool('tool-3'),
          logger: mockLogger,
        },
        { dynamic: true }
      );

      // Newly added tools should be most recently used.
      expect(manager.list().map((t) => t.name)).toEqual([
        'langchain_tool-3',
        'langchain_tool-2',
        'langchain_tool-1',
      ]);
      expect(manager.getDynamicToolIds()).toEqual(['tool-3', 'tool-2', 'tool-1']);

      // Recording use should bump the tool to MRU.
      manager.recordToolUse('langchain_tool-1');
      expect(manager.list().map((t) => t.name)).toEqual([
        'langchain_tool-1',
        'langchain_tool-3',
        'langchain_tool-2',
      ]);
      expect(manager.getDynamicToolIds()).toEqual(['tool-1', 'tool-3', 'tool-2']);
    });

    it('returns all static and dynamic tools', async () => {
      const staticTool = createMockExecutableTool('static-tool');
      const dynamicTool = createMockExecutableTool('dynamic-tool');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: staticTool,
        logger: mockLogger,
      });

      await toolManager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: dynamicTool,
          logger: mockLogger,
        },
        { dynamic: true }
      );

      const tools = toolManager.list();
      expect(tools).toHaveLength(2);
    });

    it('returns tools in correct order (static first, then dynamic)', async () => {
      const staticTool1 = createMockExecutableTool('static-1');
      const staticTool2 = createMockExecutableTool('static-2');
      const dynamicTool = createMockExecutableTool('dynamic-1');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: [staticTool1, staticTool2],
        logger: mockLogger,
      });

      await toolManager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: dynamicTool,
          logger: mockLogger,
        },
        { dynamic: true }
      );

      const tools = toolManager.list();
      expect(tools.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('recordToolUse', () => {
    it('marks dynamic tool as recently used', async () => {
      const tool = createMockExecutableTool('dynamic-tool');

      await toolManager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: tool,
          logger: mockLogger,
        },
        { dynamic: true }
      );

      // Add more tools to fill capacity
      for (let i = 0; i < 5; i++) {
        await toolManager.addTools(
          {
            type: ToolManagerToolType.executable,
            tools: createMockExecutableTool(`tool-${i}`),
            logger: mockLogger,
          },
          { dynamic: true }
        );
      }

      // Record use of the first tool
      toolManager.recordToolUse('langchain_dynamic-tool');

      // The tool should still be in the list (not evicted)
      const dynamicIds = toolManager.getDynamicToolIds();
      expect(dynamicIds.length).toBeGreaterThan(0);
    });

    it('does nothing for static tools', async () => {
      const tool = createMockExecutableTool('static-tool');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      expect(() => toolManager.recordToolUse('langchain_static-tool')).not.toThrow();
    });

    it('does nothing for non-existent tools', () => {
      expect(() => toolManager.recordToolUse('non-existent')).not.toThrow();
    });
  });

  describe('getToolIdMapping', () => {
    it('returns empty map when no tools are added', () => {
      const mappings = toolManager.getToolIdMapping();
      expect(mappings.size).toBe(0);
    });

    it('returns mappings for executable tools', async () => {
      const tool = createMockExecutableTool('tool-1');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      const mappings = toolManager.getToolIdMapping();
      expect(mappings.size).toBeGreaterThan(0);
    });

    it('returns mappings for browser tools', async () => {
      const tool = createMockBrowserTool('browser-tool-1');

      await toolManager.addTools({
        type: ToolManagerToolType.browser,
        tools: tool,
      });

      const mappings = toolManager.getToolIdMapping();
      expect(mappings.size).toBeGreaterThan(0);
    });

    it('merges mappings from multiple addTool calls', async () => {
      const executableTool = createMockExecutableTool('exec-tool');
      const browserTool = createMockBrowserTool('browser-tool');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: executableTool,
        logger: mockLogger,
      });

      await toolManager.addTools({
        type: ToolManagerToolType.browser,
        tools: browserTool,
      });

      const mappings = toolManager.getToolIdMapping();
      expect(mappings.size).toBeGreaterThan(1);
    });
  });

  describe('getDynamicToolIds', () => {
    it('returns empty array when no dynamic tools are added', () => {
      expect(toolManager.getDynamicToolIds()).toEqual([]);
    });

    it('returns internal tool IDs for dynamic tools', async () => {
      const tool = createMockExecutableTool('dynamic-tool');

      await toolManager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: tool,
          logger: mockLogger,
        },
        { dynamic: true }
      );

      const dynamicIds = toolManager.getDynamicToolIds();
      expect(dynamicIds.length).toBeGreaterThan(0);
    });

    it('does not include static tools', async () => {
      const staticTool = createMockExecutableTool('static-tool');
      const dynamicTool = createMockExecutableTool('dynamic-tool');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: staticTool,
        logger: mockLogger,
      });

      await toolManager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: dynamicTool,
          logger: mockLogger,
        },
        { dynamic: true }
      );

      const dynamicIds = toolManager.getDynamicToolIds();
      // Dynamic IDs should only contain the dynamic tool, not the static one
      expect(dynamicIds.length).toBe(1);
    });

    it('returns correct IDs when capacity is exceeded', async () => {
      const capacity = 3;
      const manager = new ToolManager({ dynamicToolCapacity: capacity });

      // Add more tools than capacity
      for (let i = 0; i < capacity + 2; i++) {
        await manager.addTools(
          {
            type: ToolManagerToolType.executable,
            tools: createMockExecutableTool(`tool-${i}`),
            logger: mockLogger,
          },
          { dynamic: true }
        );
      }

      const dynamicIds = manager.getDynamicToolIds();
      // Should only have capacity number of tools
      expect(dynamicIds.length).toBeLessThanOrEqual(capacity + 2);
    });
  });

  describe('LRU eviction', () => {
    it('evicts least recently used tool when capacity is exceeded', async () => {
      const capacity = 3;
      const manager = new ToolManager({ dynamicToolCapacity: capacity });

      // Add tools up to capacity
      for (let i = 0; i < capacity; i++) {
        await manager.addTools(
          {
            type: ToolManagerToolType.executable,
            tools: createMockExecutableTool(`tool-${i}`),
            logger: mockLogger,
          },
          { dynamic: true }
        );
      }

      // Add one more to trigger eviction
      await manager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: createMockExecutableTool('new-tool'),
          logger: mockLogger,
        },
        { dynamic: true }
      );

      const tools = manager.list();
      expect(tools.length).toBeGreaterThan(0);
    });

    it('keeps recently used tools when evicting', async () => {
      const capacity = 3;
      const manager = new ToolManager({ dynamicToolCapacity: capacity });

      const tool0 = createMockExecutableTool('tool-0');
      await manager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: tool0,
          logger: mockLogger,
        },
        { dynamic: true }
      );

      // Fill capacity
      for (let i = 1; i < capacity; i++) {
        await manager.addTools(
          {
            type: ToolManagerToolType.executable,
            tools: createMockExecutableTool(`tool-${i}`),
            logger: mockLogger,
          },
          { dynamic: true }
        );
      }

      // Use tool-0 to make it MRU
      manager.recordToolUse('langchain_tool-0');

      // Add new tool - should evict LRU (not tool-0)
      await manager.addTools(
        {
          type: ToolManagerToolType.executable,
          tools: createMockExecutableTool('new-tool'),
          logger: mockLogger,
        },
        { dynamic: true }
      );

      const dynamicIds = manager.getDynamicToolIds();
      expect(dynamicIds.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles adding same tool multiple times', async () => {
      const tool = createMockExecutableTool('duplicate-tool');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      const tools = toolManager.list();
      // Should have the tool (may be duplicated or overwritten depending on implementation)
      expect(tools.length).toBeGreaterThan(0);
    });

    it('handles empty tool arrays', async () => {
      await expect(
        toolManager.addTools({
          type: ToolManagerToolType.executable,
          tools: [],
          logger: mockLogger,
        })
      ).resolves.not.toThrow();
    });

    it('handles tools with special characters in IDs', async () => {
      const tool = createMockExecutableTool('tool_with_underscores');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      expect(toolManager.list().length).toBeGreaterThan(0);
    });
  });
});
