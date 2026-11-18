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
import { getWritableMemoryAiIndex } from '../get_writable_memory_ai_index';
import { createRememberTool } from './tool';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn(),
}));
jest.mock('../get_writable_memory_ai_index', () => ({
  getWritableMemoryAiIndex: jest.fn(),
}));

describe('remember tool', () => {
  const remember = jest.fn();
  const coreStart = coreMock.createStart();

  const tool = createRememberTool({
    getContextEngineStart: async () =>
      ({
        getSessionMemoryService: () => ({ remember }),
        getAiIndexService: jest.fn(),
      } as unknown as ContextEnginePluginStart),
    getCoreStart: async () => coreStart,
    getSecurityStart: async () => undefined,
    generateSessionId: () => 'generated-session-id',
  });

  const createContext = (conversationId: string | undefined, callSource?: 'mcp') => {
    const context = agentBuilderMocks.tools.createHandlerContext();
    return {
      ...context,
      ...(callSource !== undefined && { callContext: { ...context.callContext, callSource } }),
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

  const content = 'The user prefers metric units.';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(assertContextEngineWriteAccess).mockResolvedValue();
    coreStart.userProfile.getCurrentProfileId.mockResolvedValue('profile-1');
    remember.mockImplementation(async (_scope, { id }) => ({ id: id ?? 'memory-1' }));
  });

  it("writes to the user's session memory with the conversation as the session", async () => {
    const result = await tool.handler({ content }, createContext('conversation-a'));

    expect(remember).toHaveBeenCalledWith(
      { space: 'space-1', userId: 'profile-1' },
      { id: undefined, sessionId: 'conversation-a', content, aiIndexIds: [] }
    );
    expect(getWritableMemoryAiIndex).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        { type: ToolResultType.other, data: { id: 'memory-1', sessionId: 'conversation-a' } },
      ],
    });
  });

  it('checks a given AI index takes memories and records it on the memory', async () => {
    await tool.handler({ content, aiIndexId: 'ops-memory' }, createContext('conversation-a'));

    expect(getWritableMemoryAiIndex).toHaveBeenCalledWith(
      expect.objectContaining({ aiIndexId: 'ops-memory', spaceId: 'space-1' })
    );
    expect(remember).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ aiIndexIds: ['ops-memory'] })
    );
  });

  it('uses the MCP sessionId outside a conversation, or generates one', async () => {
    await tool.handler({ content, sessionId: 'mcp-session' }, createContext(undefined, 'mcp'));
    await tool.handler({ content }, createContext(undefined, 'mcp'));

    expect(remember.mock.calls.map(([, input]) => input.sessionId)).toEqual([
      'mcp-session',
      'generated-session-id',
    ]);
  });

  it('refuses to store memory outside a conversation for non-MCP calls', async () => {
    const result = await tool.handler({ content }, createContext(undefined));

    expect(result).toEqual({
      results: [{ type: ToolResultType.error, data: { message: expect.any(String) } }],
    });
    expect(remember).not.toHaveBeenCalled();
  });

  it('returns an error result when the user has no profile', async () => {
    coreStart.userProfile.getCurrentProfileId.mockResolvedValue(null);

    const result = await tool.handler({ content }, createContext('conversation-a'));

    expect(result).toEqual({
      results: [{ type: ToolResultType.error, data: { message: expect.any(String) } }],
    });
    expect(remember).not.toHaveBeenCalled();
  });
});
