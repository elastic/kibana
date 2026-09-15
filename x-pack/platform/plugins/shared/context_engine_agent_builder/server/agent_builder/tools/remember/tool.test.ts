/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { CONTEXT_ENGINE_REMEMBER_TOOL_ID } from '../../../../common/agent_builder_tools';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createRememberTool } from './tool';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn(),
}));

const assertContextEngineWriteAccessMock = jest.mocked(assertContextEngineWriteAccess);

describe('remember tool', () => {
  const get = jest.fn();
  const search = jest.fn();
  const index = jest.fn();

  const createTool = () =>
    createRememberTool({
      getAiIndexService: async () => ({ get } as unknown as AiIndexService),
      getCoreStart: async () => {
        throw new Error('not used');
      },
      getSecurityStart: async () => undefined,
      generateId: () => 'logical-memory-id',
    });

  const createContext = (conversationId: string | undefined) => {
    const context = agentBuilderMocks.tools.createHandlerContext();
    return {
      ...context,
      spaceId: 'space-1',
      esClient: {
        ...context.esClient,
        asCurrentUser: { search, index },
      },
      runContext: {
        runId: 'run-1',
        stack: [
          {
            type: 'agent' as const,
            agentId: 'agent-1',
            ...(conversationId !== undefined && { conversationId }),
          },
          { type: 'tool' as const, toolId: CONTEXT_ENGINE_REMEMBER_TOOL_ID },
        ],
      },
    } as unknown as ToolHandlerContext;
  };

  const params = {
    aiIndexId: 'support',
    type: 'memory_session_fact' as const,
    title: 'Duration mapping',
    description: 'duration_ms is a keyword and must be cast.',
    content: 'Use TO_DOUBLE(duration_ms) before numeric comparisons.',
  };

  const run = async (
    input: Parameters<NonNullable<ReturnType<typeof createTool>['handler']>>[0] = params,
    conversationId: string | undefined = 'conversation-1'
  ) => {
    const handler = createTool().handler;
    if (!handler) {
      throw new Error('Expected remember tool handler');
    }
    return handler(input, createContext(conversationId));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    assertContextEngineWriteAccessMock.mockResolvedValue();
    get.mockResolvedValue({
      id: 'support',
      memory_enabled: true,
      dest: { type: 'index', value: 'ai-index-idx-support' },
    });
    index.mockResolvedValue({ _id: 'generated-memory-id' });
    search.mockResolvedValue({ hits: { hits: [] } });
  });

  it('uses the expected id and accepts only the two memory KI types', () => {
    const tool = createTool();

    expect(tool.id).toBe(CONTEXT_ENGINE_REMEMBER_TOOL_ID);
    expect(tool.schema.safeParse(params).success).toBe(true);
    expect(tool.schema.safeParse({ ...params, type: 'document' }).success).toBe(false);
  });

  it('rejects calls without a conversation-derived session id', async () => {
    const result = await run(params, '');

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Cannot store memory outside an Agent Builder conversation.' },
        },
      ],
    });
    expect(assertContextEngineWriteAccessMock).not.toHaveBeenCalled();
    expect(index).not.toHaveBeenCalled();
  });

  it('rejects an AI index that does not have memory enabled', async () => {
    get.mockResolvedValue({
      id: 'support',
      memory_enabled: false,
      dest: { type: 'index', value: 'ai-index-idx-support' },
    });

    const result = await run(params, 'conversation-1');

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: "Failed to store memory: AI index 'support' does not have memory enabled.",
          },
        },
      ],
    });
    expect(index).not.toHaveBeenCalled();
  });

  it('creates a space-scoped memory with server-derived session metadata', async () => {
    const result = await run(params, 'conversation-1');

    expect(assertContextEngineWriteAccessMock).toHaveBeenCalled();
    expect(index).toHaveBeenCalledWith({
      index: 'ai-index-idx-support',
      id: 'logical-memory-id',
      document: expect.objectContaining({
        '@timestamp': expect.any(String),
        id: 'logical-memory-id',
        updated_at: expect.any(String),
        type: 'memory_session_fact',
        title: params.title,
        description: params.description,
        content: params.content,
        spaces: ['space-1'],
        attributes: {
          session_id: 'conversation-1',
          session_kind: 'conversation',
          namespace: 'agent_memory',
          revision: 1,
        },
      }),
      op_type: 'create',
      refresh: 'wait_for',
    });
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: { id: 'logical-memory-id', revision: 1 },
        },
      ],
    });
  });

  it('does not treat a caller-supplied id as a new memory id', async () => {
    const result = await run({ ...params, id: 'missing-memory' }, 'conversation-1');

    expect(index).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              "Failed to store memory: Memory 'missing-memory' was not found in AI index 'support'.",
          },
        },
      ],
    });
  });

  it('does not overwrite a non-memory document', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _index: 'ai-index-idx-support',
            _source: {
              '@timestamp': '2026-09-01T00:00:00.000Z',
              type: 'index_metadata',
              title: 'Index metadata',
              description: 'Metadata',
              content: 'Metadata',
              spaces: ['space-1'],
              updated_at: '2026-09-01T00:00:00.000Z',
              attributes: {},
            },
          },
        ],
      },
    });

    const result = await run({ ...params, id: 'metadata-1' }, 'conversation-1');

    expect(index).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              "Failed to store memory: Document 'metadata-1' in AI index 'support' is not a memory.",
          },
        },
      ],
    });
  });

  it('does not change a memory KI type during revision', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _index: 'ai-index-idx-support',
            _source: {
              '@timestamp': '2026-09-01T00:00:00.000Z',
              type: 'memory_session',
              title: 'Session summary',
              description: 'Summary',
              content: 'Summary',
              spaces: ['space-1'],
              updated_at: '2026-09-01T00:00:00.000Z',
              attributes: { revision: 1 },
            },
          },
        ],
      },
    });

    const result = await run({ ...params, id: 'session-1' }, 'conversation-1');

    expect(index).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              "Failed to store memory: Memory 'session-1' has type 'memory_session' and cannot be revised as 'memory_session_fact'.",
          },
        },
      ],
    });
  });

  it('does not revise a tombstoned memory', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _index: 'ai-index-idx-support',
            _seq_no: 7,
            _primary_term: 2,
            _source: {
              '@timestamp': '2026-09-01T00:00:00.000Z',
              id: 'memory-1',
              type: 'memory_session_fact',
              title: 'Old title',
              description: 'Old description',
              content: 'Old content',
              spaces: ['space-1'],
              updated_at: '2026-09-01T00:00:00.000Z',
              attributes: { revision: 2 },
              governance: { lifecycle: { status: 'deleted' } },
            },
          },
        ],
      },
    });

    const result = await run({ ...params, id: 'memory-1' }, 'conversation-1');

    expect(index).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: "Failed to store memory: Memory 'memory-1' was deleted and cannot be revised.",
          },
        },
      ],
    });
  });

  it('appends an existing memory revision to its data stream', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _index: '.ds-ai-index-ds-support-000001',
            _source: {
              '@timestamp': '2026-09-01T00:00:00.000Z',
              id: 'memory-1',
              type: 'memory_session_fact',
              title: 'Old title',
              description: 'Old description',
              content: 'Old content',
              tags: ['existing'],
              spaces: ['space-1'],
              expires_at: '2027-01-01T00:00:00.000Z',
              updated_at: '2026-09-01T00:00:00.000Z',
              attributes: {
                session_id: 'conversation-1',
                session_kind: 'conversation',
                namespace: 'agent_memory',
                revision: 2,
              },
            },
          },
        ],
      },
    });
    get.mockResolvedValue({
      id: 'support',
      memory_enabled: true,
      dest: { type: 'data_stream', value: 'ai-index-ds-support' },
    });

    const result = await run({ ...params, id: 'memory-1' }, 'conversation-1');

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-ds-support',
        query: { term: { id: 'memory-1' } },
        sort: [{ '@timestamp': 'desc' }],
        size: 1,
      })
    );
    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-ds-support',
        op_type: 'create',
        document: expect.objectContaining({
          '@timestamp': expect.any(String),
          id: 'memory-1',
          tags: ['existing'],
          expires_at: '2027-01-01T00:00:00.000Z',
          attributes: expect.objectContaining({ revision: 3 }),
        }),
      })
    );
    expect(index.mock.calls[0][0]).not.toHaveProperty('id');
    expect(index.mock.calls[0][0].document['@timestamp']).not.toBe('2026-09-01T00:00:00.000Z');
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: { id: 'memory-1', revision: 3 },
        },
      ],
    });
  });

  it('revises an index-backed memory in place with concurrency metadata', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _index: 'ai-index-idx-support',
            _seq_no: 7,
            _primary_term: 2,
            _source: {
              '@timestamp': '2026-09-01T00:00:00.000Z',
              id: 'memory-1',
              type: 'memory_session_fact',
              title: 'Old title',
              description: 'Old description',
              content: 'Old content',
              spaces: ['space-1'],
              updated_at: '2026-09-01T00:00:00.000Z',
              attributes: { revision: 2 },
            },
          },
        ],
      },
    });

    await run({ ...params, id: 'memory-1' }, 'conversation-1');

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { ids: { values: ['memory-1'] } },
        seq_no_primary_term: true,
      })
    );
    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-idx-support',
        id: 'memory-1',
        if_seq_no: 7,
        if_primary_term: 2,
        document: expect.objectContaining({
          '@timestamp': '2026-09-01T00:00:00.000Z',
          id: 'memory-1',
          attributes: expect.objectContaining({ revision: 3 }),
        }),
      })
    );
    expect(index.mock.calls[0][0]).not.toHaveProperty('op_type');
  });

  it('uses create semantics when writing a new memory to a data stream', async () => {
    get.mockResolvedValue({
      id: 'support',
      memory_enabled: true,
      dest: { type: 'data_stream', value: 'ai-index-ds-support' },
    });

    await run(params, 'conversation-1');

    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-ds-support',
        op_type: 'create',
        document: expect.objectContaining({ id: 'logical-memory-id' }),
      })
    );
  });
});
