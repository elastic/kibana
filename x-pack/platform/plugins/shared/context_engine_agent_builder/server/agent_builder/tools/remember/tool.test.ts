/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import { coreMock } from '@kbn/core/server/mocks';
import { createRememberTool } from './tool';

describe('remember tool', () => {
  const remember = jest.fn();
  const getMemoryService = jest.fn(() => ({ remember, forget: jest.fn() }));

  const createTool = () =>
    createRememberTool({
      getContextEngineStart: async () =>
        ({ getMemoryService } as unknown as ContextEnginePluginStart),
      getCoreStart: async () => coreMock.createStart(),
    });

  const createContext = (conversationId: string | undefined, callSource?: 'mcp') => {
    const context = agentBuilderMocks.tools.createHandlerContext();
    return {
      ...context,
      ...(callSource !== undefined && {
        callContext: { ...context.callContext, callSource },
      }),
      runContext: {
        runId: 'run-1',
        stack: [
          {
            type: 'agent' as const,
            agentId: 'agent-1',
            ...(conversationId !== undefined && { conversationId }),
          },
          { type: 'tool' as const, toolId: contextEngineMemoryTools.remember },
        ],
      },
    } as unknown as ToolHandlerContext;
  };

  const params = {
    type: 'memory.session_fact' as const,
    title: 'Duration mapping',
    description: 'duration_ms is a keyword and must be cast.',
    content: 'Use TO_DOUBLE(duration_ms) before numeric comparisons.',
  };

  const run = async (
    input: Parameters<NonNullable<ReturnType<typeof createTool>['handler']>>[0] = params,
    conversationId: string | undefined = 'conversation-1',
    callSource?: 'mcp'
  ) => {
    const { handler } = createTool();
    if (!handler) {
      throw new Error('Expected remember tool handler');
    }
    return handler(input, createContext(conversationId, callSource));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    remember.mockResolvedValue({ id: 'memory-1', session_id: 'conversation-1' });
  });

  it('accepts only short-term memory types and no AI index id', () => {
    const { id, schema } = createTool();

    expect(id).toBe(contextEngineMemoryTools.remember);
    expect(schema.safeParse(params).success).toBe(true);
    expect(schema.safeParse({ ...params, expires_at: '2026-10-01T03:00:00+03:00' }).success).toBe(
      true
    );
    expect(schema.safeParse({ ...params, expires_at: null }).success).toBe(false);
    expect(schema.safeParse({ ...params, type: 'memory.fact' }).success).toBe(false);
    expect('aiIndexId' in schema.shape).toBe(false);
  });

  it('rejects non-MCP calls outside a conversation', async () => {
    const result = await run(params, '');

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Cannot store memory outside an Agent Builder conversation.' },
        },
      ],
    });
    expect(remember).not.toHaveBeenCalled();
  });

  it('uses the conversation as the session and records the tool as writer', async () => {
    const result = await run({ ...params, sessionId: 'ignored' });

    expect(remember).toHaveBeenCalledWith({
      ...params,
      session_id: 'conversation-1',
      writer: {
        uri: `tool://${contextEngineMemoryTools.remember}`,
        metadata: { run_id: 'run-1', agent_id: 'agent-1' },
      },
      references: [
        {
          uri: 'conversation://conversation-1',
          relation: 'derived_from',
          description: 'The Agent Builder conversation where this memory was recorded.',
        },
      ],
    });
    expect(result).toEqual({
      results: [
        { type: ToolResultType.other, data: { id: 'memory-1', sessionId: 'conversation-1' } },
      ],
    });
  });

  it('passes a supplied session id through for an MCP call', async () => {
    remember.mockResolvedValue({ id: 'memory-1', session_id: 'mcp-session' });

    const result = await run({ ...params, sessionId: 'mcp-session' }, '', 'mcp');

    expect(remember).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 'mcp-session', references: undefined })
    );
    expect(result).toEqual({
      results: [{ type: ToolResultType.other, data: { id: 'memory-1', sessionId: 'mcp-session' } }],
    });
  });

  it('returns the service error as a tool error', async () => {
    remember.mockRejectedValue(new Error('Context Engine memory is disabled.'));

    const result = await run();

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Failed to store memory: Context Engine memory is disabled.' },
        },
      ],
    });
  });
});
