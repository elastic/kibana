/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ShortTermMemoryNotFoundError, type ToolHandlerContext } from '@kbn/agent-builder-server';
import { coreMock } from '@kbn/core/server/mocks';
import { createForgetTool } from './tool';

describe('forget tool', () => {
  const client = { get: jest.fn(), delete: jest.fn() };

  const tool = createForgetTool({
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
        { type: 'tool' as const, toolId: contextEngineMemoryTools.forget },
      ],
    },
  } as unknown as ToolHandlerContext;

  beforeEach(() => {
    jest.clearAllMocks();
    client.get.mockResolvedValue({ id: 'memory-1', agent_id: 'agent-1' });
  });

  it('deletes an owned memory of the current agent', async () => {
    const result = await handle({ id: 'memory-1' }, context);

    expect(client.delete).toHaveBeenCalledWith('memory-1');
    expect(result).toEqual({
      results: [{ type: ToolResultType.other, data: { id: 'memory-1' } }],
    });
  });

  it("does not delete another agent's memory", async () => {
    client.get.mockResolvedValue({ id: 'memory-1', agent_id: 'agent-2' });

    const result = await handle({ id: 'memory-1' }, context);

    expect(client.delete).not.toHaveBeenCalled();
    expect(result).toMatchObject({ results: [{ type: ToolResultType.error }] });
  });

  it('reports a memory the caller does not own as not found', async () => {
    client.get.mockRejectedValue(new ShortTermMemoryNotFoundError('memory-1'));

    const result = await handle({ id: 'memory-1' }, context);

    expect(client.delete).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: expect.stringContaining("Short-term memory 'memory-1' not found") },
        },
      ],
    });
  });
});
