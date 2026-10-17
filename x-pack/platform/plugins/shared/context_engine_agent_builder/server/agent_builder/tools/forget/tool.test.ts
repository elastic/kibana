/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { coreMock } from '@kbn/core/server/mocks';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createForgetTool } from './tool';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn(),
}));

const assertContextEngineWriteAccessMock = jest.mocked(assertContextEngineWriteAccess);

describe('forget tool', () => {
  const forgetMemory = jest.fn();
  const params = { aiIndexId: 'support', id: 'memory-1' };

  const createTool = () =>
    createForgetTool({
      getMemoryWriteService: async () => ({
        createMemory: jest.fn(),
        reviseMemory: jest.fn(),
        forgetMemory,
      }),
      getCoreStart: async () => coreMock.createStart(),
      getSecurityStart: async () => undefined,
    });

  const createContext = (): ToolHandlerContext => {
    const context = agentBuilderMocks.tools.createHandlerContext();
    return {
      ...context,
      spaceId: 'space-1',
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
    } as ToolHandlerContext;
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
    forgetMemory.mockResolvedValue({ id: 'memory-1' });
  });

  it('keeps the ID-only destructive tool contract', () => {
    const tool = createTool();

    expect(tool.id).toBe(contextEngineMemoryTools.forget);
    expect(tool.availability?.cacheMode).toBe('none');
    expect(tool.schema.safeParse(params).success).toBe(true);
    expect(tool.schema.safeParse({ aiIndexId: 'support' }).success).toBe(false);
    expect(tool.annotations?.destructiveHint).toBe(true);
  });

  it('adapts Agent Builder metadata to the shared service', async () => {
    const result = await run();

    expect(assertContextEngineWriteAccessMock).toHaveBeenCalled();
    expect(forgetMemory).toHaveBeenCalledWith({
      aiIndexId: 'support',
      id: 'memory-1',
      writer: {
        uri: 'tool://platform.context_engine.forget',
        metadata: { run_id: 'run-1', agent_id: 'agent-1' },
      },
    });
    expect(result).toEqual({
      results: [{ type: ToolResultType.other, data: { id: 'memory-1' } }],
    });
  });

  it('returns authorization failures without calling the service', async () => {
    assertContextEngineWriteAccessMock.mockRejectedValue(
      new Error('Insufficient privileges to update Context Engine AI indices.')
    );

    await expect(run()).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Failed to forget memory: Insufficient privileges to update Context Engine AI indices.',
          },
        },
      ],
    });
    expect(forgetMemory).not.toHaveBeenCalled();
  });

  it('preserves the existing error result message', async () => {
    forgetMemory.mockRejectedValue(new Error("AI index 'support' does not have memory enabled."));

    await expect(run()).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: "Failed to forget memory: AI index 'support' does not have memory enabled.",
          },
        },
      ],
    });
  });
});
