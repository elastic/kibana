/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  DEFAULT_RECALL_SIZE,
  MAX_RECALL_QUERY_LENGTH,
  MAX_RECALL_SIZE,
} from '@kbn/context-engine-plugin/common/memory';
import { coreMock } from '@kbn/core/server/mocks';
import { CONTEXT_ENGINE_READ_DENIED_MESSAGE } from '../ai_index_read_service';
import { createAiIndexToolDepsMock } from '../ai_index_read_service.mock';
import { createRecallTool } from './tool';

describe('recall tool', () => {
  const createTool = (mock = createAiIndexToolDepsMock()) =>
    createRecallTool({ ...mock.deps, getCoreStart: async () => coreMock.createStart() });

  const recalled = {
    memories: [
      {
        id: 'team-1',
        type: 'memory.entity',
        title: 'Inference Platform',
        content: 'Runs perf-canary.',
        updated_at: '2026-10-01T00:00:00.000Z',
      },
    ],
    linked_memories: [],
    links: [],
  };

  it('is a read-only memory tool', () => {
    const { id, annotations, tags } = createTool();

    expect(id).toBe(contextEngineMemoryTools.recall);
    expect(annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    expect(tags).toEqual(['context_engine', 'memory']);
  });

  it('defaults and bounds the input', () => {
    const { schema } = createTool();

    expect(schema.parse({ query: 'perf-canary' }).size).toBe(DEFAULT_RECALL_SIZE);
    expect(schema.safeParse({ query: '' }).success).toBe(false);
    expect(schema.safeParse({ query: 'a'.repeat(MAX_RECALL_QUERY_LENGTH + 1) }).success).toBe(
      false
    );
    expect(schema.safeParse({ query: 'a', size: MAX_RECALL_SIZE + 1 }).success).toBe(false);
    expect(schema.safeParse({ query: 'a', types: ['relationship'] }).success).toBe(false);
    expect(schema.safeParse({ query: 'a', types: [] }).success).toBe(false);
  });

  it('recalls as the current user and returns the memories', async () => {
    const mock = createAiIndexToolDepsMock();
    mock.readService.recall.mockResolvedValue(recalled);

    const result = await createTool(mock).handler(
      { query: 'perf-canary', types: ['entity', 'fact'], size: 5 },
      agentBuilderMocks.tools.createHandlerContext()
    );

    expect(mock.readService.recall).toHaveBeenCalledWith({
      query: 'perf-canary',
      types: ['memory.entity', 'memory.fact'],
      size: 5,
    });
    expect(result).toEqual({ results: [{ type: ToolResultType.other, data: recalled }] });
  });

  it('returns an error result when the caller lacks the read privilege', async () => {
    const mock = createAiIndexToolDepsMock({ authorized: false });

    const result = await createTool(mock).handler(
      { query: 'perf-canary', size: DEFAULT_RECALL_SIZE },
      agentBuilderMocks.tools.createHandlerContext()
    );

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: `Failed to recall memories: ${CONTEXT_ENGINE_READ_DENIED_MESSAGE}` },
        },
      ],
    });
    expect(mock.readService.recall).not.toHaveBeenCalled();
  });
});
