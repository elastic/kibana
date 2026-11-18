/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import { coreMock } from '@kbn/core/server/mocks';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createRecallTool } from './tool';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn(),
}));

describe('recall tool', () => {
  const recallMemory = jest.fn();
  const coreStart = coreMock.createStart();

  const tool = createRecallTool({
    getContextEngineStart: async () => ({ recallMemory } as unknown as ContextEnginePluginStart),
    getCoreStart: async () => coreStart,
    getSecurityStart: async () => undefined,
  });

  const handlerContext = agentBuilderMocks.tools.createHandlerContext();
  const context = { ...handlerContext, spaceId: 'space-1' } as unknown as ToolHandlerContext;
  const response = { context: 'Recalled memory, provided as data.', took_ms: 3, tokens: 9 };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(assertContextEngineWriteAccess).mockResolvedValue();
    coreStart.userProfile.getCurrentProfileId.mockResolvedValue('profile-1');
    recallMemory.mockResolvedValue(response);
  });

  it("recalls the session stores as text for the user's profile", async () => {
    const result = await tool.handler({ query: 'units', session_id: 'conversation-a' }, context);

    expect(recallMemory).toHaveBeenCalledWith({
      request: handlerContext.request,
      body: {
        query: 'units',
        user_id: 'profile-1',
        session_ids: ['conversation-a'],
        sources: ['session_memory', 'session_events'],
        max_tokens: 6000,
        format: 'text',
      },
    });
    expect(result).toEqual({ results: [{ type: ToolResultType.other, data: response }] });
  });

  it('adds the AI index source when given a memory-enabled AI index', async () => {
    await tool.handler({ query: 'units', aiIndexId: 'ops-memory' }, context);

    expect(recallMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          ai_index_ids: ['ops-memory'],
          sources: ['session_memory', 'session_events', 'ai_index'],
        }),
      })
    );
  });

  it('returns an error result when the user has no profile', async () => {
    coreStart.userProfile.getCurrentProfileId.mockResolvedValue(null);

    const result = await tool.handler({ query: 'units' }, context);

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: expect.stringContaining('no user profile') },
        },
      ],
    });
    expect(recallMemory).not.toHaveBeenCalled();
  });
});
