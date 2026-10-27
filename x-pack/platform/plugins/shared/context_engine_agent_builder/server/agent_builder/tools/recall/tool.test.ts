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
import { coreMock } from '@kbn/core/server/mocks';
import { createRecallTool } from './tool';

describe('recall tool', () => {
  const client = { search: jest.fn(), markUsed: jest.fn().mockResolvedValue(undefined) };

  const tool = createRecallTool({
    getCoreStart: async () => coreMock.createStart(),
  });

  const handle: NonNullable<typeof tool.handler> = (...args) => {
    if (!tool.handler) {
      throw new Error('Expected a tool handler');
    }
    return tool.handler(...args);
  };

  const context = {
    ...agentBuilderMocks.tools.createHandlerContext(),
    getShortTermMemoryClient: async () => client,
    runContext: {
      runId: 'run-1',
      stack: [
        { type: 'agent' as const, agentId: 'agent-1', conversationId: 'conversation-1' },
        { type: 'tool' as const, toolId: contextEngineMemoryTools.recall },
      ],
    },
  } as unknown as ToolHandlerContext;

  beforeEach(() => jest.clearAllMocks());

  it("searches only the caller's memories with the current agent", async () => {
    client.search.mockResolvedValue([
      {
        id: 'memory-1',
        type: 'memory.session_fact',
        title: 'Duration mapping',
        description: 'duration_ms is a keyword.',
        content: 'Cast it.',
        tags: ['logs'],
        updated_at: '2026-10-26T12:00:00.000Z',
        user_id: 'u_alice_0',
        user_name: 'alice',
        agent_id: 'agent-1',
        session_id: 'conversation-1',
        space: 'default',
        created_at: '2026-10-26T12:00:00.000Z',
        promotion: { status: 'pending' },
      },
    ]);

    const result = await handle({ query: 'duration' }, context);

    expect(client.search).toHaveBeenCalledWith({ query: 'duration', agentId: 'agent-1', limit: 5 });
    // Owner and promotion details stay server-side.
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: {
            memories: [
              {
                id: 'memory-1',
                type: 'memory.session_fact',
                title: 'Duration mapping',
                description: 'duration_ms is a keyword.',
                content: 'Cast it.',
                tags: ['logs'],
                updated_at: '2026-10-26T12:00:00.000Z',
              },
            ],
          },
        },
      ],
    });
  });

  it('records the recalled memories as used, without failing when that fails', async () => {
    const recalled = [{ id: 'memory-1', type: 'memory.session_fact', tags: [] }];
    client.search.mockResolvedValue(recalled);
    client.markUsed.mockRejectedValueOnce(new Error('bulk failed'));

    const result = await handle({ query: 'duration' }, context);

    expect(client.markUsed).toHaveBeenCalledWith(recalled);
    expect(result.results[0].type).toBe(ToolResultType.other);
  });

  it('bounds the query and the limit', () => {
    expect(tool.schema.safeParse({ query: '' }).success).toBe(false);
    expect(tool.schema.safeParse({ query: 'x'.repeat(1025) }).success).toBe(false);
    expect(tool.schema.safeParse({ query: 'x', limit: 21 }).success).toBe(false);
  });
});
