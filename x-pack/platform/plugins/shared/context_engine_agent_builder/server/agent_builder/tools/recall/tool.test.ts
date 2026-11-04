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
import { hasContextEngineReadPrivilege } from '../../has_context_engine_read_privilege';
import type { CreateMemorySearch, MemoryStoreScope } from '../memory_store';
import { createRecallTool } from './tool';

jest.mock('../../has_context_engine_read_privilege', () => ({
  hasContextEngineReadPrivilege: jest.fn(),
}));

const hasContextEngineReadPrivilegeMock = jest.mocked(hasContextEngineReadPrivilege);

describe('recall tool', () => {
  const get = jest.fn();
  const search = jest.fn();
  const createMemorySearch = jest.fn((_scope: MemoryStoreScope) => ({ search }));

  const getCoreStart = async () => {
    const coreStart = coreMock.createStart();
    coreStart.uiSettings.globalAsScopedToClient = jest
      .fn()
      .mockReturnValue({ get: jest.fn().mockResolvedValue(true) });
    return coreStart;
  };

  const createTool = (memorySearch?: CreateMemorySearch) =>
    createRecallTool({
      getAiIndexService: async () => ({ get } as unknown as AiIndexService),
      getCoreStart,
      getSecurityStart: async () => undefined,
      createMemorySearch: memorySearch,
    });

  const createContext = () =>
    ({
      ...agentBuilderMocks.tools.createHandlerContext(),
      spaceId: 'space-1',
    } as unknown as ToolHandlerContext);

  const params = { aiIndexId: 'support', query: 'how do I compare durations?', limit: 10 };

  const run = async (tool = createTool(createMemorySearch)) => {
    const { handler } = tool;
    if (!handler) {
      throw new Error('Expected recall tool handler');
    }
    return handler(params, createContext());
  };

  beforeEach(() => {
    jest.clearAllMocks();
    hasContextEngineReadPrivilegeMock.mockResolvedValue(true);
    get.mockResolvedValue({
      id: 'support',
      memory_enabled: true,
      dest: { type: 'index', value: 'ai-index-idx-support' },
    });
    search.mockResolvedValue([
      { id: 'memory-1', title: 'Duration mapping', text: 'Cast duration_ms', similarity: 0.9 },
    ]);
  });

  it('is a read-only memory tool with a bounded query', () => {
    const tool = createTool(createMemorySearch);

    expect(tool.id).toBe(contextEngineMemoryTools.recall);
    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.schema.safeParse(params).success).toBe(true);
    expect(tool.schema.safeParse({ ...params, query: 'x'.repeat(2001) }).success).toBe(false);
    expect(tool.schema.safeParse({ ...params, limit: 51 }).success).toBe(false);
  });

  it('searches the memory store scoped to the space and AI index', async () => {
    const result = await run();

    expect(get).toHaveBeenCalledWith('support', 'space-1');
    expect(createMemorySearch).toHaveBeenCalledWith(
      expect.objectContaining({
        aiIndexId: 'support',
        spaceId: 'space-1',
        dest: { type: 'index', value: 'ai-index-idx-support' },
      })
    );
    expect(search).toHaveBeenCalledWith({ query: params.query, limit: 10 });
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: {
            memories: [
              {
                id: 'memory-1',
                title: 'Duration mapping',
                text: 'Cast duration_ms',
                similarity: 0.9,
              },
            ],
          },
        },
      ],
    });
  });

  it('rejects callers without Context Engine read privileges', async () => {
    hasContextEngineReadPrivilegeMock.mockResolvedValue(false);

    const result = await run();

    expect(search).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Failed to recall memories: You do not have privileges to read Context Engine memories.',
          },
        },
      ],
    });
  });

  it('rejects AI indices without memory enabled', async () => {
    get.mockResolvedValue({
      id: 'support',
      memory_enabled: false,
      dest: { type: 'index', value: 'ai-index-idx-support' },
    });

    const result = await run();

    expect(search).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: "Failed to recall memories: AI index 'support' does not have memory enabled.",
          },
        },
      ],
    });
  });

  it('is unavailable when the memory store is recalled through AI index queries', async () => {
    const tool = createTool();

    const availability = await tool.availability?.handler({
      request: {},
      uiSettings: { get: jest.fn().mockResolvedValue(true) },
    } as unknown as Parameters<NonNullable<typeof tool.availability>['handler']>[0]);

    expect(availability).toEqual({
      status: 'unavailable',
      reason: 'Memories in this deployment are recalled by querying AI Indices.',
    });
  });
});
