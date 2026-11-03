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
import { hasContextEngineReadPrivilege } from '../../has_context_engine_read_privilege';
import { createRecallTool } from './tool';

jest.mock('../../has_context_engine_read_privilege', () => ({
  hasContextEngineReadPrivilege: jest.fn(),
}));

const hasContextEngineReadPrivilegeMock = jest.mocked(hasContextEngineReadPrivilege);

const memory = {
  id: 'memory-1',
  '@timestamp': '2026-09-24T12:00:00.000Z',
  session_id: 'conversation-0',
  user_id: 'kathleen',
  agent_id: 'agent-1',
  type: 'preference',
  content: 'Prefers dark mode.',
};

describe('recall tool', () => {
  const search = jest.fn();
  let username: string | undefined;

  const createTool = () =>
    createRecallTool({
      getContextEngineStart: async () =>
        ({ getSessionMemoryService: () => ({ search }) } as unknown as ContextEnginePluginStart),
      getCoreStart: async () => {
        const coreStart = coreMock.createStart();
        jest
          .mocked(coreStart.security.authc.getCurrentUser)
          .mockReturnValue((username ? { username } : null) as never);
        return coreStart;
      },
      getSecurityStart: async () => undefined,
    });

  const createContext = (conversationId: string | undefined) => {
    const context = agentBuilderMocks.tools.createHandlerContext();
    return {
      ...context,
      spaceId: 'space-1',
      runContext: {
        runId: 'run-1',
        stack: [
          {
            type: 'agent' as const,
            agentId: 'agent-1',
            ...(conversationId !== undefined && { conversationId }),
          },
          { type: 'tool' as const, toolId: contextEngineMemoryTools.recall },
        ],
      },
    } as unknown as ToolHandlerContext;
  };

  const run = async (
    input: Parameters<NonNullable<ReturnType<typeof createTool>['handler']>>[0],
    conversationId: string | undefined = 'conversation-1'
  ) => {
    const handler = createTool().handler;
    if (!handler) {
      throw new Error('Expected recall tool handler');
    }
    return handler(input, createContext(conversationId));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    username = 'kathleen';
    hasContextEngineReadPrivilegeMock.mockResolvedValue(true);
    search.mockResolvedValue({ count: 1, results: [{ _score: 0.9, memory }] });
  });

  it('uses the expected id, defaults scope and size, and bounds size', () => {
    const tool = createTool();
    expect(tool.id).toBe(contextEngineMemoryTools.recall);
    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.schema.parse({ query: 'dark mode' })).toEqual({
      query: 'dark mode',
      scope: 'user',
      size: 10,
    });
    expect(tool.schema.safeParse({ query: '' }).success).toBe(false);
    expect(tool.schema.safeParse({ query: 'x', size: 101 }).success).toBe(false);
    expect(tool.schema.safeParse({ query: 'x', scope: 'agent' }).success).toBe(false);
  });

  it('searches every session of the current user in the current space by default', async () => {
    const result = await run({ query: 'dark mode', scope: 'user', size: 10 });

    expect(search).toHaveBeenCalledWith({
      query: 'dark mode',
      user_id: 'kathleen',
      space: 'space-1',
      size: 10,
    });
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: {
            memories: [
              {
                id: 'memory-1',
                score: 0.9,
                timestamp: '2026-09-24T12:00:00.000Z',
                session_id: 'conversation-0',
                type: 'preference',
                content: 'Prefers dark mode.',
              },
            ],
          },
        },
      ],
    });
  });

  it('narrows to the current conversation and an AI index when asked', async () => {
    await run({ query: 'dark mode', scope: 'session', aiIndexId: 'support', size: 5 });

    expect(search).toHaveBeenCalledWith({
      query: 'dark mode',
      user_id: 'kathleen',
      space: 'space-1',
      session_id: 'conversation-1',
      ai_index_id: 'support',
      size: 5,
    });
  });

  it('reports media memories by media type only', async () => {
    search.mockResolvedValue({
      count: 1,
      results: [
        {
          _score: 0.5,
          memory: {
            ...memory,
            content: undefined,
            media: [{ type: 'image', value: 'data:image/png;base64,AA' }],
          },
        },
      ],
    });

    const result = await run({ query: 'the diagram', scope: 'user', size: 10 });

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: {
            memories: [expect.objectContaining({ id: 'memory-1', media: [{ type: 'image' }] })],
          },
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('base64');
  });

  it('rejects session scope outside a conversation', async () => {
    const result = await run({ query: 'dark mode', scope: 'session', size: 10 }, '');

    expect(search).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Cannot recall session memory outside an Agent Builder conversation.' },
        },
      ],
    });
  });

  it('returns an error result without the read privilege', async () => {
    hasContextEngineReadPrivilegeMock.mockResolvedValue(false);

    const result = await run({ query: 'dark mode', scope: 'user', size: 10 });

    expect(search).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Failed to recall memory: Context Engine read privilege is required.' },
        },
      ],
    });
  });

  it('fails when the current user cannot be determined', async () => {
    username = undefined;

    const result = await run({ query: 'dark mode', scope: 'user', size: 10 });

    expect(search).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Failed to recall memory: Cannot determine the current user.' },
        },
      ],
    });
  });
});
