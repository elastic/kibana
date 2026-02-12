/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolType } from '@kbn/agent-builder-common';
import type { ExecutableTool } from '@kbn/agent-builder-server';
import { createToolIdMappings, toolToLangchain, sanitizeToolId } from './tools';
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
    expect(toolKeys.sort()).toEqual(['_reasoning', 'foo']);
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
