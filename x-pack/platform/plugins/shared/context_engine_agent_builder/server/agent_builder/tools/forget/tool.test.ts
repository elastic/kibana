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
import { createForgetTool } from './tool';

describe('forget tool', () => {
  const forget = jest.fn();
  const getMemoryService = jest.fn(() => ({ remember: jest.fn(), forget }));

  const createTool = () =>
    createForgetTool({
      getContextEngineStart: async () =>
        ({ getMemoryService } as unknown as ContextEnginePluginStart),
      getCoreStart: async () => coreMock.createStart(),
    });

  const run = async () => {
    const { handler } = createTool();
    if (!handler) {
      throw new Error('Expected forget tool handler');
    }
    const context = agentBuilderMocks.tools.createHandlerContext();
    return handler({ id: 'memory-1' }, {
      ...context,
      runContext: {
        runId: 'run-1',
        stack: [
          { type: 'agent' as const, agentId: 'agent-1', conversationId: 'conversation-1' },
          { type: 'tool' as const, toolId: contextEngineMemoryTools.forget },
        ],
      },
    } as unknown as ToolHandlerContext);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    forget.mockResolvedValue({ id: 'memory-1' });
  });

  it('registers an id-only destructive tool', () => {
    const { id, schema, annotations } = createTool();

    expect(id).toBe(contextEngineMemoryTools.forget);
    expect(annotations?.destructiveHint).toBe(true);
    expect(Object.keys(schema.shape)).toEqual(['id']);
  });

  it('forgets the memory with the tool as writer', async () => {
    const result = await run();

    expect(forget).toHaveBeenCalledWith({
      id: 'memory-1',
      writer: {
        uri: `tool://${contextEngineMemoryTools.forget}`,
        metadata: { run_id: 'run-1', agent_id: 'agent-1' },
      },
    });
    expect(result).toEqual({
      results: [{ type: ToolResultType.other, data: { id: 'memory-1' } }],
    });
  });

  it('returns the service error as a tool error', async () => {
    forget.mockRejectedValue(new Error("Memory 'memory-1' was not found."));

    const result = await run();

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: "Failed to forget memory: Memory 'memory-1' was not found." },
        },
      ],
    });
  });
});
