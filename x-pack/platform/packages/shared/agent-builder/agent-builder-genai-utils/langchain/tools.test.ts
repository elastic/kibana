/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { loggerMock } from '@kbn/logging-mocks';
import { ChatEventType, ToolType } from '@kbn/agent-builder-common';
import type { ExecutableTool } from '@kbn/agent-builder-server';
import { toDynamicToolEvent } from '@kbn/agent-builder-server/runner';
import {
  createToolIdMappings,
  renderDynamicToolDefinition,
  toolToLangchain,
  sanitizeToolId,
} from './tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

const createTool = (
  toolId: string,
  parts: Partial<Omit<ExecutableTool, 'id'>> = {}
): ExecutableTool => {
  return {
    id: toolId,
    type: ToolType.builtin,
    description: '',
    configuration: {},
    readonly: false,
    experimental: false,
    tags: [],
    getSchema: () => z.object({}),
    execute: jest.fn(),
    ...parts,
  };
};

const logger = loggerMock.create();

describe('toolToLangchain', () => {
  it('converts the tool to langchain', async () => {
    const tool = createTool('toolA', {
      description: 'desc',
      getSchema: () => z.object({ foo: z.string() }),
    });

    const langchainTool = await toolToLangchain({ tool, toolId: tool.id, logger });
    expect(langchainTool.name).toEqual('toolA');
    expect(langchainTool.description).toEqual('desc');
    expect(langchainTool.responseFormat).toEqual('content_and_artifact');

    const toolKeys = Object.keys((langchainTool.schema as any).shape);
    expect(toolKeys.sort()).toEqual(['foo']);
  });

  it('adds the intent param when specified', async () => {
    const tool = createTool('toolA', {
      description: 'desc',
      getSchema: () => z.object({ foo: z.string() }),
    });

    const langchainTool = await toolToLangchain({
      tool,
      toolId: tool.id,
      logger,
      addIntentParam: true,
    });

    const shape = (langchainTool.schema as any).shape;
    expect(Object.keys(shape).sort()).toEqual(['_intent', 'foo']);
    expect(shape._intent.description).toBe(
      'Clear, concise description of what you are doing by calling this tool'
    );
    expect(shape._intent.isOptional()).toBe(true);
  });

  it('keeps the strictness of the tool schema when adding the intent param', async () => {
    const tool = createTool('toolA', {
      description: 'desc',
      getSchema: () => z.object({ foo: z.string() }).strict(),
    });

    const langchainTool = await toolToLangchain({
      tool,
      toolId: tool.id,
      logger,
      addIntentParam: true,
    });

    await expect(
      langchainTool.invoke({ foo: 'a', _intent: 'Doing a', unknown: 'b' })
    ).rejects.toThrow();
    expect(tool.execute).not.toHaveBeenCalled();
  });

  it('does not add the intent param by default', async () => {
    const tool = createTool('toolA', {
      description: 'desc',
      getSchema: () => z.object({ foo: z.string() }),
    });

    const langchainTool = await toolToLangchain({ tool, toolId: tool.id, logger });

    expect(Object.keys((langchainTool.schema as any).shape)).toEqual(['foo']);
  });

  it('strips _intent before calling the tool handler', async () => {
    const tool = createTool('toolA', {
      description: 'desc',
      getSchema: () => z.object({ hello: z.string() }),
      execute: jest
        .fn()
        .mockResolvedValue({ results: [{ type: ToolResultType.other, data: 'foo' }] }),
    });

    const langchainTool = await toolToLangchain({
      tool,
      toolId: tool.id,
      logger,
      addIntentParam: true,
    });
    await langchainTool.invoke({ hello: 'world', _intent: 'Saying hello' });

    expect(tool.execute).toHaveBeenCalledWith(
      expect.objectContaining({ toolParams: { hello: 'world' } })
    );
  });

  it('wraps the tool handler', async () => {
    const tool = createTool('toolA', {
      description: 'desc',
      getSchema: () => z.object({ hello: z.string() }),
      execute: jest
        .fn()
        .mockResolvedValue({ results: [{ type: ToolResultType.other, data: 'foo' }] }),
    });

    const langchainTool = await toolToLangchain({ tool, toolId: tool.id, logger });
    const results = await langchainTool.invoke({ hello: 'world' });

    expect(tool.execute).toHaveBeenCalledTimes(1);
    expect(tool.execute).toHaveBeenCalledWith({
      toolParams: { hello: 'world' },
      toolCallId: 'unknown',
      source: 'agent',
    });

    expect(JSON.parse(results).results).toEqual([{ type: ToolResultType.other, data: 'foo' }]);
  });

  it('uses buildContent to build the LLM-facing content when provided', async () => {
    const tool = createTool('toolA', {
      description: 'desc',
      getSchema: () => z.object({ hello: z.string() }),
      execute: jest
        .fn()
        .mockResolvedValue({ results: [{ type: ToolResultType.other, data: 'foo' }] }),
    });

    const buildContent = jest.fn().mockReturnValue('custom-content');

    const langchainTool = await toolToLangchain({ tool, toolId: tool.id, logger, buildContent });
    const results = await langchainTool.invoke({ hello: 'world' });

    expect(buildContent).toHaveBeenCalledWith({
      results: [{ type: ToolResultType.other, data: 'foo' }],
      toolId: 'toolA',
      toolCallId: 'unknown',
    });
    expect(results).toEqual('custom-content');
  });

  it('stamps emitted events with the tool id and call id', async () => {
    const tool = createTool('toolA', {
      execute: jest.fn().mockImplementation(async ({ onEvent }) => {
        onEvent({ type: ChatEventType.toolUi, data: { custom_event: 'ev', data: { a: 1 } } });
        onEvent({ type: ChatEventType.toolProgress, data: { message: 'hi' } });
        return { results: [] };
      }),
    });
    const sendEvent = jest.fn();

    const langchainTool = await toolToLangchain({ tool, toolId: tool.id, logger, sendEvent });
    await langchainTool.invoke({});

    expect(sendEvent).toHaveBeenNthCalledWith(1, {
      type: ChatEventType.toolUi,
      data: { custom_event: 'ev', data: { a: 1 }, tool_id: 'toolA', tool_call_id: 'unknown' },
    });
    expect(sendEvent).toHaveBeenNthCalledWith(2, {
      type: ChatEventType.toolProgress,
      data: { message: 'hi', tool_call_id: 'unknown' },
    });
  });

  it('attributes a dynamic tool event to the inner tool, on the same call', async () => {
    const tool = createTool('execute_dynamic_tool', {
      execute: jest.fn().mockImplementation(async ({ onEvent }) => {
        onEvent(
          toDynamicToolEvent('inner.tool', {
            type: ChatEventType.toolUi,
            data: { custom_event: 'ev', data: { a: 1 } },
          })
        );
        onEvent(
          toDynamicToolEvent('inner.tool', {
            type: ChatEventType.toolProgress,
            data: { message: 'hi' },
          })
        );
        return { results: [] };
      }),
    });
    const sendEvent = jest.fn();

    const langchainTool = await toolToLangchain({ tool, toolId: tool.id, logger, sendEvent });
    await langchainTool.invoke({});

    expect(sendEvent).toHaveBeenNthCalledWith(1, {
      type: ChatEventType.toolUi,
      data: { custom_event: 'ev', data: { a: 1 }, tool_id: 'inner.tool', tool_call_id: 'unknown' },
    });
    expect(sendEvent).toHaveBeenNthCalledWith(2, {
      type: ChatEventType.toolProgress,
      data: { message: 'hi', tool_call_id: 'unknown' },
    });
  });

  it('passes the inner tool id of a dynamic tool return to buildContent', async () => {
    const results = [{ type: ToolResultType.other, data: 'foo' }];
    const tool = createTool('execute_dynamic_tool', {
      execute: jest.fn().mockResolvedValue({ results, dynamicToolId: 'inner.tool' }),
    });
    const buildContent = jest.fn().mockReturnValue('content');

    const langchainTool = await toolToLangchain({ tool, toolId: tool.id, logger, buildContent });
    await langchainTool.invoke({});

    expect(buildContent).toHaveBeenCalledWith({
      results,
      toolId: 'execute_dynamic_tool',
      toolCallId: 'unknown',
      dynamicToolId: 'inner.tool',
    });
  });

  it('passes no dynamic tool id for a plain return', async () => {
    const tool = createTool('toolA', {
      execute: jest.fn().mockResolvedValue({ results: [] }),
    });
    const buildContent = jest.fn().mockReturnValue('content');

    const langchainTool = await toolToLangchain({ tool, toolId: tool.id, logger, buildContent });
    await langchainTool.invoke({});

    expect(buildContent.mock.calls[0][0].dynamicToolId).toBeUndefined();
  });
});

describe('createToolIdMappings', () => {
  function toRecord<T>(map: Map<string, T>): Record<string, T> {
    return Object.fromEntries(map.entries());
  }

  it('generates id-to-name mappings', () => {
    const tools = [createTool('toolA'), createTool('toolB')];

    const mappings = toRecord(createToolIdMappings(tools));

    expect(mappings).toEqual({
      toolA: 'toolA',
      toolB: 'toolB',
    });
  });

  it('rewrites tool ids to match the allowed pattern when necessary', () => {
    const tools = [createTool('.internal_tool'), createTool('user-defined-tool')];

    const mappings = toRecord(createToolIdMappings(tools));

    expect(mappings).toEqual({
      '.internal_tool': '_internal_tool',
      'user-defined-tool': 'user-defined-tool',
    });
  });

  it('handles naming conflicts', () => {
    const tools = [createTool('^some_tool'), createTool('some_tool')];

    const mappings = toRecord(createToolIdMappings(tools));

    expect(mappings).toEqual({
      '^some_tool': 'some_tool',
      some_tool: 'some_tool_1',
    });
  });
});

describe('sanitizeToolId', () => {
  it('replace `.` with `_` in tool names', () => {
    expect(sanitizeToolId('test.foo')).toEqual('test_foo');
    expect(sanitizeToolId('platform.core.search')).toEqual('platform_core_search');
  });

  it('removes forbidden characters', () => {
    expect(sanitizeToolId('test+()')).toEqual('test');
    expect(sanitizeToolId('a&b^c')).toEqual('abc');
  });
});

describe('renderDynamicToolDefinition', () => {
  it('renders the id, description and the input JSON schema', async () => {
    const tool = createTool('platform.core.cases', {
      description: 'Description of platform.core.cases',
      getSchema: () =>
        z.object({
          query: z.string().describe('The search query'),
          limit: z.number().optional(),
        }),
    });

    const definition = await renderDynamicToolDefinition(tool);

    expect(definition).toEqual({
      tool_id: 'platform.core.cases',
      description: 'Description of platform.core.cases',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
          limit: { type: 'number' },
        },
        required: ['query'],
      },
    });
  });

  it('uses the same description as the native binding', async () => {
    const tool = createTool('a', {
      description: 'Description of a',
      configuration: { index: 'logs-*' },
      getLlmDescription: ({ description, config }) =>
        `${description} (configured for ${(config as { index: string }).index})`,
    });

    const definition = await renderDynamicToolDefinition(tool);
    const langchainTool = await toolToLangchain({ tool, toolId: tool.id, logger });

    expect(definition.description).toBe('Description of a (configured for logs-*)');
    expect(definition.description).toBe(langchainTool.description);
  });

  it('awaits an async schema', async () => {
    const tool = createTool('a', {
      getSchema: async () => z.object({ flag: z.boolean() }),
    });

    const definition = await renderDynamicToolDefinition(tool);

    expect(definition.parameters.properties).toEqual({ flag: { type: 'boolean' } });
    expect(definition.parameters.required).toEqual(['flag']);
  });
});
