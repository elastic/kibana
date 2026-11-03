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
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createRememberTool } from './tool';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn(),
}));

const assertContextEngineWriteAccessMock = jest.mocked(assertContextEngineWriteAccess);

describe('remember tool', () => {
  const remember = jest.fn();
  let username: string | undefined;

  const createTool = () =>
    createRememberTool({
      getContextEngineStart: async () =>
        ({ getSessionMemoryService: () => ({ remember }) } as unknown as ContextEnginePluginStart),
      getCoreStart: async () => {
        const coreStart = coreMock.createStart();
        jest
          .mocked(coreStart.security.authc.getCurrentUser)
          .mockReturnValue((username ? { username } : null) as never);
        return coreStart;
      },
      getSecurityStart: async () => undefined,
      generateSessionId: () => 'generated-session-id',
    });

  const createContext = (conversationId: string | undefined, callSource?: 'mcp') => {
    const context = agentBuilderMocks.tools.createHandlerContext();
    return {
      ...context,
      ...(callSource !== undefined && {
        callContext: { ...context.callContext, callSource },
      }),
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
    } as unknown as ToolHandlerContext;
  };

  const params = { content: 'Prefers dark mode.', type: 'preference' };

  const run = async (
    input: Parameters<NonNullable<ReturnType<typeof createTool>['handler']>>[0] = params,
    conversationId: string | undefined = 'conversation-1',
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
    username = 'kathleen';
    assertContextEngineWriteAccessMock.mockResolvedValue();
    remember.mockImplementation(async (body) => ({
      ...body,
      id: 'memory-1',
      '@timestamp': '2026-09-24T12:00:00.000Z',
    }));
  });

  it('uses the expected id and accepts content with an optional type and AI index', () => {
    const tool = createTool();
    expect(tool.id).toBe(contextEngineMemoryTools.remember);
    expect(tool.availability?.cacheMode).toBe('none');
    expect(tool.schema.safeParse({ content: 'x' }).success).toBe(true);
    expect(tool.schema.safeParse({ ...params, aiIndexId: 'support' }).success).toBe(true);
    expect(tool.schema.safeParse({ content: '' }).success).toBe(false);
    expect(tool.schema.safeParse({ type: 'preference' }).success).toBe(false);
    expect(tool.schema.shape.type.description).toContain('preference');
    expect(tool.schema.shape.sessionId.description).toContain(
      'sessionId returned by an earlier remember call'
    );
  });

  it('rejects non-MCP calls without a conversation-derived session id', async () => {
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

  it('stores the memory for the current user, conversation, agent, and space', async () => {
    const result = await run({ ...params, aiIndexId: 'support' });

    expect(assertContextEngineWriteAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'space-1' })
    );
    expect(remember).toHaveBeenCalledWith({
      session_id: 'conversation-1',
      user_id: 'kathleen',
      agent_id: 'agent-1',
      space: 'space-1',
      ai_index_id: ['support'],
      type: 'preference',
      content: 'Prefers dark mode.',
    });
    expect(result).toEqual({
      results: [
        { type: ToolResultType.other, data: { id: 'memory-1', sessionId: 'conversation-1' } },
      ],
    });
  });

  it('omits type and AI index when not given', async () => {
    await run({ content: 'Prefers dark mode.' });

    expect(remember).toHaveBeenCalledWith({
      session_id: 'conversation-1',
      user_id: 'kathleen',
      agent_id: 'agent-1',
      space: 'space-1',
      content: 'Prefers dark mode.',
    });
  });

  it('generates and returns a session id for an MCP call without one', async () => {
    const result = await run(params, '', 'mcp');

    expect(remember).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 'generated-session-id' })
    );
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: { id: 'memory-1', sessionId: 'generated-session-id' },
        },
      ],
    });
  });

  it('reuses a supplied session id for an MCP call', async () => {
    await run({ ...params, sessionId: 'mcp-session' }, '', 'mcp');

    expect(remember).toHaveBeenCalledWith(expect.objectContaining({ session_id: 'mcp-session' }));
  });

  it('fails when the current user cannot be determined', async () => {
    username = undefined;

    const result = await run();

    expect(remember).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Failed to store memory: Cannot determine the current user.' },
        },
      ],
    });
  });

  it('returns an error result when the write is not permitted', async () => {
    assertContextEngineWriteAccessMock.mockRejectedValue(new Error('No write access.'));

    const result = await run();

    expect(remember).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Failed to store memory: No write access.' },
        },
      ],
    });
  });
});
