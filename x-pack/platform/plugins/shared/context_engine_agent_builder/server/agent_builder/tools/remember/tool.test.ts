/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { coreMock } from '@kbn/core/server/mocks';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createRememberTool } from './tool';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn(),
}));

const assertContextEngineWriteAccessMock = jest.mocked(assertContextEngineWriteAccess);

describe('remember tool', () => {
  const createMemory = jest.fn();
  const reviseMemory = jest.fn();

  const params = {
    aiIndexId: 'support',
    type: 'memory.session_fact' as const,
    title: 'Duration mapping',
    description: 'duration_ms is a keyword and must be cast.',
    content: 'Use TO_DOUBLE(duration_ms) before numeric comparisons.',
  };

  const createTool = () =>
    createRememberTool({
      getMemoryWriteService: async () => ({
        createMemory,
        reviseMemory,
        forgetMemory: jest.fn(),
      }),
      getCoreStart: async () => coreMock.createStart(),
      getSecurityStart: async () => undefined,
      generateSessionId: () => 'generated-session-id',
    });

  const createContext = (conversationId?: string, callSource?: 'mcp'): ToolHandlerContext => {
    const context = agentBuilderMocks.tools.createHandlerContext();
    return {
      ...context,
      ...(callSource && { callContext: { ...context.callContext, callSource } }),
      spaceId: 'space-1',
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
    } as ToolHandlerContext;
  };

  const run = async (
    input: Parameters<NonNullable<ReturnType<typeof createTool>['handler']>>[0] = params,
    conversationId?: string,
    callSource?: 'mcp'
  ) => {
    const handler = createTool().handler;
    if (!handler) {
      throw new Error('Expected remember tool handler');
    }
    return handler(input, createContext(conversationId, callSource));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    assertContextEngineWriteAccessMock.mockResolvedValue();
    createMemory.mockResolvedValue({ id: 'memory-1', sessionId: 'conversation-1' });
    reviseMemory.mockResolvedValue({ id: 'memory-1', sessionId: 'conversation-1' });
  });

  it('keeps the tool schema and annotations', () => {
    const tool = createTool();

    expect(tool.id).toBe(contextEngineMemoryTools.remember);
    expect(tool.availability?.cacheMode).toBe('none');
    expect(tool.schema.safeParse(params).success).toBe(true);
    expect(tool.schema.safeParse({ ...params, expires_at: null }).success).toBe(true);
    expect(tool.schema.safeParse({ ...params, type: 'document' }).success).toBe(false);
  });

  it('rejects non-MCP calls outside a conversation before authorization', async () => {
    await expect(run(params)).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Cannot store memory outside an Agent Builder conversation.' },
        },
      ],
    });
    expect(assertContextEngineWriteAccessMock).not.toHaveBeenCalled();
  });

  it('returns authorization failures without calling the service', async () => {
    assertContextEngineWriteAccessMock.mockRejectedValue(
      new Error('Insufficient privileges to update Context Engine AI indices.')
    );

    await expect(run(params, 'conversation-1')).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Failed to store memory: Insufficient privileges to update Context Engine AI indices.',
          },
        },
      ],
    });
    expect(createMemory).not.toHaveBeenCalled();
  });

  it('adapts conversation metadata to a create request', async () => {
    const result = await run(
      { ...params, sessionId: 'ignored', expires_at: null },
      'conversation-1'
    );

    expect(assertContextEngineWriteAccessMock).toHaveBeenCalled();
    expect(createMemory).toHaveBeenCalledWith({
      ...params,
      aiIndexId: 'support',
      expiresAt: null,
      sessionId: 'conversation-1',
      writer: {
        uri: 'tool://platform.context_engine.remember',
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

  it('uses the supplied MCP session and calls revise when id is present', async () => {
    await run({ ...params, id: 'memory-1', sessionId: 'session-1' }, undefined, 'mcp');

    expect(reviseMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'memory-1',
        sessionId: 'session-1',
        references: undefined,
      })
    );
    expect(createMemory).not.toHaveBeenCalled();
  });

  it('generates an MCP session and preserves service errors', async () => {
    createMemory.mockRejectedValue(new Error('Context Engine memory is not enabled.'));

    const result = await run(params, undefined, 'mcp');

    expect(createMemory).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'generated-session-id' })
    );
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: 'Failed to store memory: Context Engine memory is not enabled.',
          },
        },
      ],
    });
  });
});
