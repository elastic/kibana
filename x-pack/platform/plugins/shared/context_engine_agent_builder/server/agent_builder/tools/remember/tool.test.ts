/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ShortTermMemory } from '@kbn/agent-builder-common';
import {
  ShortTermMemoryIdentityError,
  type ScopedShortTermMemoryClient,
  type ToolHandlerContext,
} from '@kbn/agent-builder-server';
import { coreMock } from '@kbn/core/server/mocks';
import { MCP_MEMORY_AGENT_ID } from '../short_term_memory_context';
import { createRememberTool } from './tool';

const memory = (overrides: Partial<ShortTermMemory> = {}): ShortTermMemory => ({
  id: 'memory-1',
  type: 'memory.session_fact',
  title: 'Duration mapping',
  description: 'duration_ms is a keyword and must be cast.',
  content: 'Use TO_DOUBLE(duration_ms) before numeric comparisons.',
  tags: [],
  user_id: 'u_alice_0',
  user_name: 'alice',
  agent_id: 'agent-1',
  session_id: 'conversation-1',
  space: 'default',
  created_at: '2026-10-26T12:00:00.000Z',
  updated_at: '2026-10-26T12:00:00.000Z',
  expires_at: '2026-11-25T12:00:00.000Z',
  promotion: { status: 'pending' },
  ...overrides,
});

describe('remember tool', () => {
  const client = {
    userId: 'u_alice_0',
    create: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
    deleteAll: jest.fn(),
    markUsed: jest.fn(),
  } satisfies jest.Mocked<ScopedShortTermMemoryClient>;
  const getShortTermMemoryClient = jest.fn();

  const tool = createRememberTool({
    getCoreStart: async () => coreMock.createStart(),
    generateSessionId: () => 'generated-session-id',
  });

  const handle: NonNullable<typeof tool.handler> = (...args) => {
    if (!tool.handler) {
      throw new Error('Expected a tool handler');
    }
    return tool.handler(...args);
  };

  const createContext = ({
    conversationId,
    agentId = 'agent-1',
    callSource,
  }: {
    conversationId?: string;
    agentId?: string;
    callSource?: 'mcp';
  }) => {
    const context = agentBuilderMocks.tools.createHandlerContext();
    return {
      ...context,
      getShortTermMemoryClient,
      ...(callSource !== undefined && { callContext: { ...context.callContext, callSource } }),
      runContext: {
        runId: 'run-1',
        stack: [
          ...(callSource === 'mcp'
            ? []
            : [
                {
                  type: 'agent' as const,
                  agentId,
                  ...(conversationId !== undefined && { conversationId }),
                },
              ]),
          { type: 'tool' as const, toolId: contextEngineMemoryTools.remember },
        ],
      },
    } as unknown as ToolHandlerContext;
  };

  const params = {
    type: 'memory.session_fact' as const,
    title: 'Duration mapping',
    description: 'duration_ms is a keyword and must be cast.',
    content: 'Use TO_DOUBLE(duration_ms) before numeric comparisons.',
  };

  const run = (input: Record<string, unknown>, context: ToolHandlerContext) =>
    handle(input as never, context);

  beforeEach(() => {
    jest.clearAllMocks();
    getShortTermMemoryClient.mockResolvedValue(client);
    client.create.mockImplementation(async (created) => memory({ ...created, id: 'memory-1' }));
    client.update.mockImplementation(async (id, changes) => memory({ id, ...changes }));
    client.get.mockResolvedValue(memory());
  });

  it('takes no identity from the model', () => {
    expect(tool.id).toBe(contextEngineMemoryTools.remember);
    expect(Object.keys(tool.schema.shape)).not.toEqual(
      expect.arrayContaining(['aiIndexId', 'userId', 'agentId'])
    );
    expect(tool.schema.safeParse(params).success).toBe(true);
    expect(tool.schema.safeParse({ ...params, type: 'document' }).success).toBe(false);
    expect(tool.schema.safeParse({ ...params, expires_at: null }).success).toBe(true);
  });

  it('writes short-term memory owned by the caller, with agent and session from the run', async () => {
    const result = await run(params, createContext({ conversationId: 'conversation-1' }));

    expect(client.create).toHaveBeenCalledWith({
      ...params,
      agentId: 'agent-1',
      sessionId: 'conversation-1',
    });
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: expect.objectContaining({ id: 'memory-1', sessionId: 'conversation-1' }),
        },
      ],
    });
  });

  it('ignores a model-supplied sessionId inside a conversation', async () => {
    await run(
      { ...params, sessionId: 'invented' },
      createContext({ conversationId: 'conversation-1' })
    );

    expect(client.create).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'conversation-1' })
    );
  });

  it('refuses outside a conversation unless called over MCP', async () => {
    const result = await run(params, createContext({}));

    expect(client.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: expect.stringContaining('outside an Agent Builder conversation'),
          },
        },
      ],
    });
  });

  it('records MCP memories under the MCP agent id and a generated session', async () => {
    await run(params, createContext({ callSource: 'mcp' }));

    expect(client.create).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: MCP_MEMORY_AGENT_ID, sessionId: 'generated-session-id' })
    );
  });

  it('revises an owned memory of the same agent and type', async () => {
    await run({ ...params, id: 'memory-1' }, createContext({ conversationId: 'conversation-1' }));

    expect(client.get).toHaveBeenCalledWith('memory-1');
    expect(client.update).toHaveBeenCalledWith('memory-1', params);
  });

  it("does not revise another agent's memory", async () => {
    client.get.mockResolvedValue(memory({ agent_id: 'agent-2' }));

    const result = await run(
      { ...params, id: 'memory-1' },
      createContext({ conversationId: 'conversation-1' })
    );

    expect(client.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({ results: [{ type: ToolResultType.error }] });
  });

  it('does not change the type of a memory', async () => {
    client.get.mockResolvedValue(memory({ type: 'memory.session' }));

    const result = await run(
      { ...params, id: 'memory-1' },
      createContext({ conversationId: 'conversation-1' })
    );

    expect(client.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({ results: [{ type: ToolResultType.error }] });
  });

  it('reports a caller without a stable identity as an error', async () => {
    getShortTermMemoryClient.mockRejectedValue(new ShortTermMemoryIdentityError());

    const result = await run(params, createContext({ conversationId: 'conversation-1' }));

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: expect.stringContaining('stable user identity') },
        },
      ],
    });
  });
});
