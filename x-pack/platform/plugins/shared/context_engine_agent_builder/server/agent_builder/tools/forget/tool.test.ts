/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { CONTEXT_ENGINE_FORGET_TOOL_ID } from '../../../../common/agent_builder_tools';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { aiIndexToolsAvailability } from '../ai_index_tools_availability';
import { createForgetTool } from './tool';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn(),
}));

const assertContextEngineWriteAccessMock = jest.mocked(assertContextEngineWriteAccess);

describe('forget tool', () => {
  const get = jest.fn();
  const search = jest.fn();
  const index = jest.fn();

  const createTool = () =>
    createForgetTool({
      getAiIndexService: async () => ({ get } as unknown as AiIndexService),
      getCoreStart: async () => {
        throw new Error('not used');
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
        asCurrentUser: {
          search,
          index,
        },
      },
      runContext: {
        runId: 'run-1',
        stack: [
          {
            type: 'agent' as const,
            agentId: 'agent-1',
            conversationId: 'conversation-1',
          },
          { type: 'tool' as const, toolId: CONTEXT_ENGINE_FORGET_TOOL_ID },
        ],
      },
    } as unknown as ToolHandlerContext;
  };

  const params = {
    aiIndexId: 'support',
    id: 'memory-1',
  };

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
    get.mockResolvedValue({
      id: 'support',
      memory_enabled: true,
      dest: { type: 'index', value: 'ai-index-idx-support' },
    });
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'memory-1',
            _index: 'ai-index-idx-support',
            _seq_no: 7,
            _primary_term: 2,
            _source: {
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
                    uri: 'tool://platform.context_engine.remember',
                    metadata: { run_id: 'run-0', agent_id: 'agent-1' },
                  },
                  updated_by: {
                    uri: 'tool://platform.context_engine.remember',
                    metadata: { run_id: 'run-0', agent_id: 'agent-1' },
                  },
                },
              },
            },
          },
        ],
      },
    });
  });

  it('registers an ID-only destructive tool without confirmation', () => {
    const tool = createTool();

    expect(tool.id).toBe(CONTEXT_ENGINE_FORGET_TOOL_ID);
    expect(tool.availability).toBe(aiIndexToolsAvailability);
    expect(tool.schema.safeParse(params).success).toBe(true);
    expect(tool.schema.safeParse({ aiIndexId: 'support' }).success).toBe(false);
    expect(tool.schema.shape.aiIndexId.description).toContain(
      'not the backing Elasticsearch index or data stream name'
    );
    expect(tool.annotations?.destructiveHint).toBe(true);
    expect(tool.confirmation).toBeUndefined();
  });

  it('tombstones an index-backed memory using concurrency metadata', async () => {
    const result = await run();

    expect(assertContextEngineWriteAccessMock).toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith('support', 'space-1');
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-idx-support',
        query: { ids: { values: ['memory-1'] } },
        seq_no_primary_term: true,
      })
    );
    expect(index).toHaveBeenCalledWith({
      index: 'ai-index-idx-support',
      id: 'memory-1',
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
              uri: 'tool://platform.context_engine.remember',
              metadata: { run_id: 'run-0', agent_id: 'agent-1' },
            },
            updated_by: {
              uri: 'tool://platform.context_engine.forget',
              metadata: { run_id: 'run-1', agent_id: 'agent-1' },
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

  it('appends a tombstone for a data-stream-backed memory', async () => {
    get.mockResolvedValue({
      id: 'support',
      memory_enabled: true,
      dest: { type: 'data_stream', value: 'ai-index-ds-support' },
    });
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'generated-document-id',
            _index: '.ds-ai-index-ds-support-000001',
            _source: {
              '@timestamp': '2026-09-01T00:00:00.000Z',
              id: 'memory-1',
              type: 'memory.session',
              title: 'Session summary',
              description: 'Summary',
              content: 'Summary',
              updated_at: '2026-09-01T00:00:00.000Z',
              attributes: { 'memory.session_id': 'conversation-1' },
              governance: {
                provenance: {
                  created_by: {
                    uri: 'tool://platform.context_engine.remember',
                    metadata: { run_id: 'run-0', agent_id: 'agent-1' },
                  },
                },
              },
            },
          },
        ],
      },
    });

    await run();

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-ds-support',
        query: { term: { id: 'memory-1' } },
        sort: [{ '@timestamp': 'desc' }],
        size: 1,
      })
    );
    expect(index).toHaveBeenCalledWith({
      index: 'ai-index-ds-support',
      document: expect.objectContaining({
        '@timestamp': expect.any(String),
        id: 'memory-1',
        updated_at: expect.any(String),
        attributes: { 'memory.session_id': 'conversation-1' },
        governance: {
          provenance: {
            created_by: {
              uri: 'tool://platform.context_engine.remember',
              metadata: { run_id: 'run-0', agent_id: 'agent-1' },
            },
            updated_by: {
              uri: 'tool://platform.context_engine.forget',
              metadata: { run_id: 'run-1', agent_id: 'agent-1' },
            },
          },
          lifecycle: {
            status: 'deleted',
          },
        },
      }),
      op_type: 'create',
      refresh: 'wait_for',
    });
    expect(index.mock.calls[0][0]).not.toHaveProperty('id');
    expect(index.mock.calls[0][0].document['@timestamp']).not.toBe('2026-09-01T00:00:00.000Z');
  });

  it('does not write another revision when the memory is already tombstoned', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'memory-1',
            _index: 'ai-index-idx-support',
            _seq_no: 7,
            _primary_term: 2,
            _source: {
              '@timestamp': '2026-09-01T00:00:00.000Z',
              id: 'memory-1',
              type: 'memory.session_fact',
              title: 'Duration mapping',
              description: 'duration_ms is a keyword.',
              content: 'Cast duration_ms before numeric comparisons.',
              updated_at: '2026-09-01T00:00:00.000Z',
              attributes: { 'memory.session_id': 'conversation-1' },
              governance: { lifecycle: { status: 'deleted' } },
            },
          },
        ],
      },
    });

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
      dest: { type: 'index', value: 'ai-index-idx-support' },
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
    expect(search).not.toHaveBeenCalled();
    expect(index).not.toHaveBeenCalled();
  });

  it('does not delete a non-memory document', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'memory-1',
            _index: 'ai-index-idx-support',
            _seq_no: 7,
            _primary_term: 2,
            _source: {
              '@timestamp': '2026-09-01T00:00:00.000Z',
              id: 'memory-1',
              type: 'index_metadata',
              title: 'Index metadata',
              description: 'Metadata',
              content: 'Metadata',
              updated_at: '2026-09-01T00:00:00.000Z',
            },
          },
        ],
      },
    });

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
