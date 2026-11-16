/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolManager, createToolManager } from './tool_manager';
import type { StructuredTool } from '@langchain/core/tools';
import {
  ToolManagerToolType,
  type BrowserToolWithOrigin,
  type ExecutableToolWithOrigin,
} from '@kbn/agent-builder-server/runner/tool_manager';
import { ToolOrigin } from '@kbn/agent-builder-common';
import { loggerMock } from '@kbn/logging-mocks';
import { z } from '@kbn/zod/v4';

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
  sanitizeToolId: jest.fn((toolId: string) =>
    toolId.replaceAll('.', '_').replace(/[^a-zA-Z0-9_-]/g, '')
  ),
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

jest.mock('../../../tools/browser_tool_adapter', () => ({
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
    toolManager = new ToolManager();
  });

  const createMockExecutableTool = (
    id: string,
    description: string = 'Test tool',
    origin: ToolOrigin = ToolOrigin.registry
  ): ExecutableToolWithOrigin => ({
    id,
    type: 'builtin' as any,
    description,
    tags: [],
    readonly: false,
    experimental: false,
    configuration: {},
    getSchema: async () => z.object({}),
    execute: jest.fn(),
    origin,
  });

  const createMockBrowserTool = (
    id: string,
    description: string = 'Browser tool',
    origin: ToolOrigin = ToolOrigin.internal
  ): BrowserToolWithOrigin => ({
    id,
    description,
    schema: {
      type: 'object',
      properties: {},
    },
    origin,
  });

  describe('constructor', () => {
    it('creates an empty ToolManager', () => {
      expect(toolManager.list()).toEqual([]);
      expect(toolManager.getDynamicToolIds()).toEqual([]);
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

    it('creates an empty ToolManager', () => {
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

    it('binds a tool added twice once', async () => {
      const tool = createMockExecutableTool('tool-1');

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

      // Second addTools call (simulating internal tools being added after the selected ones)
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: createMockExecutableTool('internal-tool'),
        logger: mockLogger,
      });

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
  });

  describe('list', () => {
    it('returns empty array when no tools are added', () => {
      expect(toolManager.list()).toEqual([]);
    });

    it('returns the natively bound tools in the order they were added, without the dynamic tools', async () => {
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: [createMockExecutableTool('static-1'), createMockExecutableTool('static-2')],
        logger: mockLogger,
      });
      await toolManager.addTools({
        type: ToolManagerToolType.dynamic,
        tools: createMockExecutableTool('dynamic-1'),
      });

      expect(toolManager.list().map((t) => t.name)).toEqual([
        'langchain_static-1',
        'langchain_static-2',
      ]);
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

    it('returns the internal ids of the dynamic tools, with no cap on their number', async () => {
      const ids = Array.from({ length: 20 }, (_, i) => `dynamic-${i}`);

      await toolManager.addTools({
        type: ToolManagerToolType.dynamic,
        tools: ids.map((id) => createMockExecutableTool(id)),
      });

      expect(toolManager.getDynamicToolIds()).toEqual(ids);
    });

    it('does not include static tools', async () => {
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: createMockExecutableTool('static-tool'),
        logger: mockLogger,
      });
      await toolManager.addTools({
        type: ToolManagerToolType.dynamic,
        tools: createMockExecutableTool('dynamic-tool'),
      });

      expect(toolManager.getDynamicToolIds()).toEqual(['dynamic-tool']);
    });
  });

  describe('tool origin metadata', () => {
    it('stores and retrieves origin entries by internal tool id', async () => {
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: [
          createMockExecutableTool('registry.tool', 'registry tool', ToolOrigin.registry),
          createMockExecutableTool('inline.tool', 'inline tool', ToolOrigin.inline),
        ],
        logger: mockLogger,
      });

      expect(toolManager.getToolMeta('registry.tool').origin).toBe(ToolOrigin.registry);
      expect(toolManager.getToolMeta('inline.tool').origin).toBe(ToolOrigin.inline);
      expect(toolManager.getToolMeta('missing.tool').origin).toBeUndefined();
    });

    it('overwrites existing entries when a newer origin is provided', async () => {
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: createMockExecutableTool('tool.id', 'tool', ToolOrigin.inline),
        logger: mockLogger,
      });
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: createMockExecutableTool('tool.id', 'tool', ToolOrigin.registry),
        logger: mockLogger,
      });

      expect(toolManager.getToolMeta('tool.id').origin).toBe(ToolOrigin.registry);
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

  describe('getSummarizer', () => {
    it('returns undefined when no tools are added', () => {
      expect(toolManager.getSummarizer('non-existent')).toBeUndefined();
    });

    it('returns undefined for a tool without summarizeToolReturn', async () => {
      const tool = createMockExecutableTool('tool-1');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      expect(toolManager.getSummarizer('tool-1')).toBeUndefined();
    });

    it('returns the summarizer for a tool with summarizeToolReturn', async () => {
      const summarizer = jest.fn();
      const tool: ExecutableToolWithOrigin = {
        ...createMockExecutableTool('tool-with-summarizer'),
        summarizeToolReturn: summarizer,
      };

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      expect(toolManager.getSummarizer('tool-with-summarizer')).toBe(summarizer);
    });

    it('returns undefined for browser tools', async () => {
      const tool = createMockBrowserTool('browser-tool-1');

      await toolManager.addTools({
        type: ToolManagerToolType.browser,
        tools: tool,
      });

      expect(toolManager.getSummarizer('browser-tool-1')).toBeUndefined();
    });

    it('returns the latest summarizer when a tool is re-added', async () => {
      const summarizer1 = jest.fn();
      const summarizer2 = jest.fn();
      const tool1: ExecutableToolWithOrigin = {
        ...createMockExecutableTool('tool-1'),
        summarizeToolReturn: summarizer1,
      };
      const tool2: ExecutableToolWithOrigin = {
        ...createMockExecutableTool('tool-1'),
        summarizeToolReturn: summarizer2,
      };

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool1,
        logger: mockLogger,
      });

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool2,
        logger: mockLogger,
      });

      expect(toolManager.getSummarizer('tool-1')).toBe(summarizer2);
    });
  });

  describe('setMaxToolResultTokens', () => {
    const hugeResults = [
      { tool_result_id: 'r-1', type: 'other', data: { text: 'x'.repeat(100_000) } },
    ];

    const getBuildContent = () => {
      const { toolToLangchain } = jest.requireMock('@kbn/agent-builder-genai-utils/langchain') as {
        toolToLangchain: jest.Mock;
      };
      const lastCall = toolToLangchain.mock.calls[toolToLangchain.mock.calls.length - 1][0];
      return lastCall.buildContent as (params: {
        results: unknown[];
        toolId: string;
        toolCallId: string;
      }) => string;
    };

    it('uses the default budget when setMaxToolResultTokens is never called', async () => {
      const tool = createMockExecutableTool('tool-1');

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      const content = getBuildContent()({
        results: hugeResults,
        toolId: 'tool-1',
        toolCallId: 'call-1',
      });

      // Asserts on the resolved budget (maxTokens), not the fixture's own token estimate —
      // this test is about which budget got used, not exactly how large hugeResults is.
      expect(content).toContain('Preview (first 20000 tokens):');
    });

    it('uses the configured budget for tools without their own override', async () => {
      const tool = createMockExecutableTool('tool-1');

      toolManager.setMaxToolResultTokens(10);

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      const content = getBuildContent()({
        results: hugeResults,
        toolId: 'tool-1',
        toolCallId: 'call-1',
      });

      expect(content).toContain('Preview (first 10 tokens):');
    });

    it('uses the tool-level maxResultTokens override instead of the configured default', async () => {
      const tool = {
        ...createMockExecutableTool('tool-1'),
        maxResultTokens: 5,
      };

      toolManager.setMaxToolResultTokens(10_000);

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      const content = getBuildContent()({
        results: hugeResults,
        toolId: 'tool-1',
        toolCallId: 'call-1',
      });

      expect(content).toContain('Preview (first 5 tokens):');
    });

    it('never truncates a tool with maxResultTokens: Infinity, regardless of the configured default', async () => {
      const tool = {
        ...createMockExecutableTool('tool-1'),
        maxResultTokens: Infinity,
      };

      toolManager.setMaxToolResultTokens(10);

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      const content = getBuildContent()({
        results: hugeResults,
        toolId: 'tool-1',
        toolCallId: 'call-1',
      });

      expect(content).toEqual(JSON.stringify({ results: hugeResults }));
    });

    it('resolves maxResultTokens independently of summarizeToolReturn', async () => {
      const tool = {
        ...createMockExecutableTool('tool-1'),
        summarizeToolReturn: jest.fn(),
      };

      toolManager.setMaxToolResultTokens(10);

      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: tool,
        logger: mockLogger,
      });

      const content = getBuildContent()({
        results: hugeResults,
        toolId: 'tool-1',
        toolCallId: 'call-1',
      });

      // summarizeToolReturn being set has no bearing on the guardrail: it still applies.
      expect(content).toContain('Preview (first 10 tokens):');
    });
  });

  describe('dynamic tool registry', () => {
    const addDynamic = (tools: ExecutableToolWithOrigin[]) =>
      toolManager.addTools({ type: ToolManagerToolType.dynamic, tools });

    it('registers tools without binding them to the model', async () => {
      const tool = createMockExecutableTool('dynamic-1');

      await addDynamic([tool]);

      expect(toolManager.listDynamicTools()).toEqual([tool]);
      expect(toolManager.getDynamicTool('dynamic-1')).toBe(tool);
      expect(toolManager.list()).toEqual([]);
    });

    it('persists the registry ids, not the natively bound ones', async () => {
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: createMockExecutableTool('native-1'),
        logger: mockLogger,
      });
      await addDynamic([createMockExecutableTool('dynamic-1')]);

      expect(toolManager.getDynamicToolIds()).toEqual(['dynamic-1']);
    });

    it('skips ids already bound natively', async () => {
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: createMockExecutableTool('native-1'),
        logger: mockLogger,
      });
      const shadowed = createMockExecutableTool('native-1', 'dynamic copy');
      const dynamic = createMockExecutableTool('dynamic-1');

      await addDynamic([shadowed, dynamic]);

      expect(toolManager.listDynamicTools()).toEqual([dynamic]);
      expect(toolManager.getDynamicTool('native-1')).toBeUndefined();
      expect(toolManager.getExecutable('native-1')?.description).toBe('Test tool');
    });

    it('replaces a dynamic tool registered again under the same id', async () => {
      await addDynamic([createMockExecutableTool('dynamic-1', 'first')]);
      const second = createMockExecutableTool('dynamic-1', 'second');

      await addDynamic([second]);

      expect(toolManager.listDynamicTools()).toEqual([second]);
    });

    it('resolves executable, meta and summarizer from the registry when not bound natively', async () => {
      const summarizer = jest.fn();
      const tool = {
        ...createMockExecutableTool('dynamic-1', 'Dynamic', ToolOrigin.inline),
        summarizeToolReturn: summarizer,
      };
      await addDynamic([tool]);

      expect(toolManager.getExecutable('dynamic-1')).toBe(tool);
      expect(toolManager.getToolMeta('dynamic-1')).toEqual({
        origin: ToolOrigin.inline,
        type: 'builtin',
      });
      expect(toolManager.getSummarizer('dynamic-1')).toBe(summarizer);
    });

    it('resolves natively bound tools before the registry', async () => {
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: createMockExecutableTool('tool-1', 'Native', ToolOrigin.internal),
        logger: mockLogger,
      });

      expect(toolManager.getExecutable('tool-1')?.description).toBe('Native');
      expect(toolManager.getToolMeta('tool-1').origin).toBe(ToolOrigin.internal);
      expect(toolManager.getDynamicTool('tool-1')).toBeUndefined();
    });

    it('returns undefined meta and executable for unknown ids', () => {
      expect(toolManager.getExecutable('unknown')).toBeUndefined();
      expect(toolManager.getToolMeta('unknown')).toEqual({ origin: undefined, type: undefined });
      expect(toolManager.getSummarizer('unknown')).toBeUndefined();
    });

    it('removes dynamic tools, leaving natively bound ones in place', async () => {
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: createMockExecutableTool('native-1'),
        logger: mockLogger,
      });
      await addDynamic([
        createMockExecutableTool('dynamic-1'),
        createMockExecutableTool('dynamic-2'),
      ]);

      toolManager.removeDynamicTools(['dynamic-1', 'native-1', 'unknown']);

      expect(toolManager.getDynamicToolIds()).toEqual(['dynamic-2']);
      expect(toolManager.getExecutable('dynamic-1')).toBeUndefined();
      expect(toolManager.getExecutable('native-1')).toBeDefined();
      expect(toolManager.list()).toHaveLength(1);
    });
  });

  describe('dynamic tool result content', () => {
    const lastBuildContent = () => {
      const { toolToLangchain } = jest.requireMock('@kbn/agent-builder-genai-utils/langchain') as {
        toolToLangchain: jest.Mock;
      };
      const lastCall = toolToLangchain.mock.calls[toolToLangchain.mock.calls.length - 1][0];
      return lastCall.buildContent as (params: {
        results: unknown[];
        toolId: string;
        toolCallId: string;
        dynamicToolId?: string;
      }) => string;
    };
    const hugeResults = [{ type: 'other', data: 'word '.repeat(500) }];

    beforeEach(async () => {
      toolManager.setMaxToolResultTokens(10);
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: createMockExecutableTool('execute_dynamic_tool'),
        logger: mockLogger,
      });
    });

    it('applies the registered inner tool budget to a tagged return', async () => {
      await toolManager.addTools({
        type: ToolManagerToolType.dynamic,
        tools: { ...createMockExecutableTool('inner.tool'), maxResultTokens: Infinity },
      });

      const content = lastBuildContent()({
        results: hugeResults,
        toolId: 'execute_dynamic_tool',
        toolCallId: 'call-1',
        dynamicToolId: 'inner.tool',
      });

      expect(content).toEqual(JSON.stringify({ results: hugeResults }));
    });

    it('names the inner tool in the recovery path of a truncated tagged return', async () => {
      await toolManager.addTools({
        type: ToolManagerToolType.dynamic,
        tools: createMockExecutableTool('inner.tool'),
      });

      const content = lastBuildContent()({
        results: hugeResults,
        toolId: 'execute_dynamic_tool',
        toolCallId: 'call-1',
        dynamicToolId: 'inner.tool',
      });

      // the inner tool's own pipeline stored the result under the inner id, which is what the
      // model must read back; the meta-tool itself is excluded from the filestore
      expect(content).toContain('Preview (first 10 tokens):');
      expect(content).toContain('/tool_calls/inner_tool_call-1/');
      expect(content).not.toContain('not recoverable');
    });

    it('falls back to the outer tool budget for an unregistered or untagged return', () => {
      const buildContent = lastBuildContent();

      const unregistered = buildContent({
        results: hugeResults,
        toolId: 'execute_dynamic_tool',
        toolCallId: 'call-1',
        dynamicToolId: 'nope',
      });
      const untagged = buildContent({
        results: hugeResults,
        toolId: 'execute_dynamic_tool',
        toolCallId: 'call-1',
      });

      expect(unregistered).toContain('Preview (first 10 tokens):');
      expect(untagged).toContain('Preview (first 10 tokens):');
      expect(untagged).toContain('not recoverable');
    });

    it('applies a natively bound tool budget when the meta-tool fell back to it', async () => {
      // the meta-tool dispatches to a native tool called by the wrong path; its budget still applies
      await toolManager.addTools({
        type: ToolManagerToolType.executable,
        tools: { ...createMockExecutableTool('native.tool'), maxResultTokens: Infinity },
        logger: mockLogger,
      });
      // the meta-tool's own buildContent, not the native tool's
      const metaBuildContent = (() => {
        const { toolToLangchain } = jest.requireMock(
          '@kbn/agent-builder-genai-utils/langchain'
        ) as { toolToLangchain: jest.Mock };
        // last one: mock calls accumulate across tests and each test has its own manager
        const call = [...toolToLangchain.mock.calls]
          .reverse()
          .find(
            ([params]: [{ tool: { id: string } }]) => params.tool.id === 'execute_dynamic_tool'
          );
        return call[0].buildContent as ReturnType<typeof lastBuildContent>;
      })();

      const content = metaBuildContent({
        results: hugeResults,
        toolId: 'execute_dynamic_tool',
        toolCallId: 'call-1',
        dynamicToolId: 'native.tool',
      });

      expect(content).toEqual(JSON.stringify({ results: hugeResults }));
    });
  });
});
