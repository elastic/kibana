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
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { coreMock } from '@kbn/core/server/mocks';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createForgetTool } from './tool';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn(),
}));

const assertContextEngineWriteAccessMock = jest.mocked(assertContextEngineWriteAccess);

const MEMORY_INDEX = 'ai-index-idx-support';

describe('forget tool', () => {
  const get = jest.fn();
  const getDocument = jest.fn();
  const index = jest.fn();
  const getCurrentUser = jest.fn();

  const createTool = () =>
    createForgetTool({
      getAiIndexService: async () => ({ get } as unknown as AiIndexService),
      getCoreStart: async () => {
        const coreStart = coreMock.createStart();
        coreStart.security.authc.getCurrentUser = getCurrentUser;
        coreStart.uiSettings.globalAsScopedToClient = jest
          .fn()
          .mockReturnValue({ get: jest.fn().mockResolvedValue(true) });
        return coreStart;
      },
      getSecurityStart: async () => undefined,
    });

  const createContext = (): ToolHandlerContext => {
    const context = agentBuilderMocks.tools.createHandlerContext();
    return {
      ...context,
      spaceId: 'space-1',
      esClient: {
        ...context.esClient,
        asCurrentUser: { get: getDocument, index },
      },
      runContext: {
        runId: 'run-1',
        stack: [
          {
            type: 'agent' as const,
            agentId: 'agent-1',
            conversationId: 'conversation-1',
          },
          { type: 'tool' as const, toolId: contextEngineMemoryTools.forget },
        ],
      },
    } as unknown as ToolHandlerContext;
  };

  const params = {
    aiIndexId: 'support',
    id: 'memory-1',
  };

  const existingMemory = (source: Record<string, unknown>) => ({
    found: true,
    _index: MEMORY_INDEX,
    _id: 'memory-1',
    _seq_no: 7,
    _primary_term: 2,
    _source: source,
  });

  const run = async () => {
    const handler = createTool().handler;
    if (!handler) {
      throw new Error('Expected forget tool handler');
    }
    return handler(params, createContext());
  };

  beforeEach(() => {
    jest.clearAllMocks();
    assertContextEngineWriteAccessMock.mockResolvedValue();
    getCurrentUser.mockReturnValue({ username: 'alice', profile_uid: 'u_alice' });
    get.mockResolvedValue({
      id: 'support',
      memory_enabled: true,
      dest: { type: 'index', value: MEMORY_INDEX },
    });
    getDocument.mockResolvedValue(
      existingMemory({
        '@timestamp': '2026-09-01T00:00:00.000Z',
        id: 'memory-1',
        type: 'memory.session_fact',
        title: 'Duration mapping',
        description: 'duration_ms is a keyword.',
        content: 'Cast duration_ms before numeric comparisons.',
        updated_at: '2026-09-01T00:00:00.000Z',
        attributes: { 'memory.session_id': 'conversation-1' },
        governance: {
          provenance: {
            created_by: {
              uri: 'user://u_alice',
              metadata: { tool_id: 'platform.context_engine.remember', run_id: 'run-0' },
            },
            updated_by: {
              uri: 'user://u_alice',
              metadata: { tool_id: 'platform.context_engine.remember', run_id: 'run-0' },
            },
          },
        },
      })
    );
  });

  it('registers an ID-only destructive tool without confirmation', () => {
    const tool = createTool();

    expect(tool.id).toBe(contextEngineMemoryTools.forget);
    expect(tool.availability?.cacheMode).toBe('none');
    expect(tool.schema.safeParse(params).success).toBe(true);
    expect(tool.schema.safeParse({ aiIndexId: 'support' }).success).toBe(false);
    expect(tool.schema.shape.aiIndexId.description).toContain(
      'not the backing Elasticsearch index or data stream name'
    );
    expect(tool.annotations?.destructiveHint).toBe(true);
    expect(tool.confirmation).toBeUndefined();
  });

  it('tombstones the memory in the caller slice using concurrency metadata', async () => {
    const result = await run();

    expect(assertContextEngineWriteAccessMock).toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith('support', 'space-1');
    expect(getDocument).toHaveBeenCalledWith(
      { index: MEMORY_INDEX, id: 'memory-1', _slice: 'u_alice' },
      { ignore: [404] }
    );
    expect(index).toHaveBeenCalledWith({
      index: MEMORY_INDEX,
      id: 'memory-1',
      _slice: 'u_alice',
      if_seq_no: 7,
      if_primary_term: 2,
      document: expect.objectContaining({
        '@timestamp': '2026-09-01T00:00:00.000Z',
        id: 'memory-1',
        updated_at: expect.any(String),
        attributes: { 'memory.session_id': 'conversation-1' },
        governance: {
          provenance: {
            created_by: {
              uri: 'user://u_alice',
              metadata: { tool_id: 'platform.context_engine.remember', run_id: 'run-0' },
            },
            updated_by: {
              uri: 'user://u_alice',
              metadata: {
                tool_id: 'platform.context_engine.forget',
                run_id: 'run-1',
                agent_id: 'agent-1',
              },
            },
          },
          lifecycle: {
            status: 'deleted',
          },
        },
      }),
      refresh: 'wait_for',
    });
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: { id: 'memory-1' },
        },
      ],
    });
  });

  it('rejects a caller without a user identity', async () => {
    getCurrentUser.mockReturnValue({ username: 'alice' });

    const result = await run();

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: 'Failed to forget memory: Cannot store user memory without a user identity.',
          },
        },
      ],
    });
    expect(getDocument).not.toHaveBeenCalled();
    expect(index).not.toHaveBeenCalled();
  });

  it('reports a memory outside the caller slice as not found', async () => {
    getDocument.mockResolvedValue({ found: false });

    const result = await run();

    expect(index).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              "Failed to forget memory: Memory 'memory-1' was not found in AI index 'support'.",
          },
        },
      ],
    });
  });

  it('does not write another revision when the memory is already tombstoned', async () => {
    getDocument.mockResolvedValue(
      existingMemory({
        '@timestamp': '2026-09-01T00:00:00.000Z',
        id: 'memory-1',
        type: 'memory.session_fact',
        title: 'Duration mapping',
        description: 'duration_ms is a keyword.',
        content: 'Cast duration_ms before numeric comparisons.',
        updated_at: '2026-09-01T00:00:00.000Z',
        attributes: { 'memory.session_id': 'conversation-1' },
        governance: { lifecycle: { status: 'deleted' } },
      })
    );

    const result = await run();

    expect(index).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: { id: 'memory-1' },
        },
      ],
    });
  });

  it('rejects an AI index that does not have memory enabled', async () => {
    get.mockResolvedValue({
      id: 'support',
      memory_enabled: false,
      dest: { type: 'index', value: MEMORY_INDEX },
    });

    const result = await run();

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: "Failed to forget memory: AI index 'support' does not have memory enabled.",
          },
        },
      ],
    });
    expect(getDocument).not.toHaveBeenCalled();
    expect(index).not.toHaveBeenCalled();
  });

  it('does not delete a non-memory document', async () => {
    getDocument.mockResolvedValue(
      existingMemory({
        '@timestamp': '2026-09-01T00:00:00.000Z',
        id: 'memory-1',
        type: 'index_metadata',
        title: 'Index metadata',
        description: 'Metadata',
        content: 'Metadata',
        updated_at: '2026-09-01T00:00:00.000Z',
      })
    );

    const result = await run();

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              "Failed to forget memory: Document 'memory-1' in AI index 'support' is not a memory.",
          },
        },
      ],
    });
    expect(index).not.toHaveBeenCalled();
  });
});
