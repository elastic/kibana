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
import { assertAiIndicesWritable } from '@kbn/context-engine-plugin/server/ai_indices/assert_ai_indices_writable';
import { AiIndexNotFoundError } from '@kbn/context-engine-plugin/server/ai_indices/errors';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import type { SessionMemoryService } from '@kbn/context-engine-plugin/server/session_memory/types';
import { coreMock } from '@kbn/core/server/mocks';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createRememberTool } from './tool';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn(),
}));
jest.mock('@kbn/context-engine-plugin/server/ai_indices/assert_ai_indices_writable', () => ({
  assertAiIndicesWritable: jest.fn(),
}));

const assertContextEngineWriteAccessMock = jest.mocked(assertContextEngineWriteAccess);
const assertAiIndicesWritableMock = jest.mocked(assertAiIndicesWritable);

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('remember tool', () => {
  const remember = jest.fn();
  const auditLog = jest.fn();
  const getCurrentProfileId = jest.fn();
  const memoryEnabled = jest.fn();
  const asCurrentUser = {};

  const createTool = () => {
    const coreStart = coreMock.createStart();
    coreStart.uiSettings.globalAsScopedToClient = jest.fn().mockReturnValue({ get: memoryEnabled });
    coreStart.userProfile.getCurrentProfileId = getCurrentProfileId;
    coreStart.security.audit.asScoped = jest.fn().mockReturnValue({ log: auditLog });
    return createRememberTool({
      getAiIndexService: async () => ({} as AiIndexService),
      getSessionMemoryService: async () => ({ remember } as unknown as SessionMemoryService),
      getCoreStart: async () => coreStart,
      getSecurityStart: async () => undefined,
      generateId: () => 'generated-memory-id',
      generateSessionId: () => 'generated-session-id',
    });
  };

  const createContext = (conversationId: string | undefined, callSource?: 'mcp') => {
    const context = agentBuilderMocks.tools.createHandlerContext();
    return {
      ...context,
      ...(callSource !== undefined && {
        callContext: { ...context.callContext, callSource },
      }),
      spaceId: 'space-1',
      esClient: { ...context.esClient, asCurrentUser },
      runContext: {
        runId: 'run-1',
        stack: [
          {
            type: 'agent' as const,
            agentId: 'agent-1',
            ...(conversationId !== undefined && { conversationId }),
          },
          { type: 'tool' as const, toolId: contextEngineMemoryTools.remember },
        ],
      },
    } as unknown as ToolHandlerContext;
  };

  const params = { content: 'Use TO_DOUBLE(duration_ms) before numeric comparisons.' };

  const run = async (
    input: Record<string, unknown> = params,
    conversationId: string | undefined = 'conversation-1',
    callSource?: 'mcp'
  ) => {
    const tool = createTool();
    const { handler } = tool;
    if (!handler) {
      throw new Error('Expected remember tool handler');
    }
    const context = createContext(conversationId, callSource);
    const result = await handler(tool.schema.parse(input), context);
    await flushPromises();
    return { result, context };
  };

  const errorResult = (message: string) => ({
    results: [{ type: ToolResultType.error, data: { message } }],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    assertContextEngineWriteAccessMock.mockResolvedValue();
    assertAiIndicesWritableMock.mockResolvedValue();
    memoryEnabled.mockResolvedValue(true);
    getCurrentProfileId.mockResolvedValue('profile-1');
    remember.mockResolvedValue({ id: 'generated-memory-id' });
  });

  it('accepts only the store fields and bounds them', () => {
    const { schema } = createTool();

    expect(schema.safeParse(params).success).toBe(true);
    expect(
      schema.safeParse({
        ...params,
        id: 'memory-1',
        sessionId: 's',
        aiIndexIds: ['support'],
        attributes: { topic: 'mapping' },
      }).success
    ).toBe(true);
    expect(schema.safeParse({ content: '' }).success).toBe(false);
    expect(schema.safeParse({ ...params, id: '' }).success).toBe(false);
    expect(schema.safeParse({ ...params, attributes: { '': 'x' } }).success).toBe(false);
    expect(schema.safeParse({ ...params, attributes: { a: 1 } }).success).toBe(false);
    expect(
      schema.safeParse({
        ...params,
        aiIndexIds: Array.from({ length: 101 }, (_, i) => `ai-${i}`),
      }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...params,
        attributes: Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, 'v'])),
      }).success
    ).toBe(false);
    expect(schema.shape.sessionId.description).toContain(
      'sessionId returned by an earlier remember call'
    );
  });

  it('writes the memory for the caller scope and returns the id and conversation session', async () => {
    const { result } = await run({
      ...params,
      aiIndexIds: ['support', 'support', 'logs'],
      attributes: { topic: 'mapping' },
    });

    expect(assertContextEngineWriteAccessMock).toHaveBeenCalled();
    expect(assertAiIndicesWritableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        esClient: asCurrentUser,
        spaceId: 'space-1',
        aiIndexIds: ['support', 'logs'],
      })
    );
    expect(remember).toHaveBeenCalledWith(
      { space: 'space-1', userId: 'profile-1' },
      {
        id: 'generated-memory-id',
        sessionId: 'conversation-1',
        content: params.content,
        aiIndexIds: ['support', 'logs'],
        attributes: { topic: 'mapping' },
      }
    );
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: { id: 'generated-memory-id', sessionId: 'conversation-1' },
        },
      ],
    });
  });

  it('revises the memory with the given id', async () => {
    const { result } = await run({ ...params, id: 'memory-1' });

    expect(remember).toHaveBeenCalledWith(
      { space: 'space-1', userId: 'profile-1' },
      expect.objectContaining({ id: 'memory-1' })
    );
    expect(result).toEqual({
      results: [
        { type: ToolResultType.other, data: { id: 'memory-1', sessionId: 'conversation-1' } },
      ],
    });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: expect.objectContaining({ type: ['change'] }) })
    );
  });

  it('returns before the background write finishes', async () => {
    remember.mockReturnValue(new Promise(() => {}));

    const { result } = await run();

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: { id: 'generated-memory-id', sessionId: 'conversation-1' },
        },
      ],
    });
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('audits a successful write once', async () => {
    await run();

    expect(auditLog).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'User has remembered session memory [id=generated-memory-id] of session [id=conversation-1]',
        event: expect.objectContaining({ action: 'memory_remember', outcome: 'success' }),
        user: { target: { id: 'profile-1' } },
      })
    );
  });

  it('uses the supplied session id for an MCP call, or generates one', async () => {
    await run({ ...params, sessionId: 'mcp-session' }, '', 'mcp');
    expect(remember).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ sessionId: 'mcp-session' })
    );

    await run(params, '', 'mcp');
    expect(remember).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ sessionId: 'generated-session-id' })
    );
  });

  it('ignores sessionId in an Agent Builder conversation', async () => {
    await run({ ...params, sessionId: 'other' });

    expect(remember).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sessionId: 'conversation-1' })
    );
  });

  it('rejects non-MCP calls without a conversation', async () => {
    const { result } = await run(params, '');

    expect(result).toEqual(
      errorResult('Cannot store memory outside an Agent Builder conversation.')
    );
    expect(assertContextEngineWriteAccessMock).not.toHaveBeenCalled();
    expect(remember).not.toHaveBeenCalled();
  });

  it('returns an error and writes nothing when write access is denied', async () => {
    assertContextEngineWriteAccessMock.mockRejectedValue(new Error('Insufficient privileges'));

    const { result, context } = await run();

    expect(result).toEqual(errorResult('Failed to store memory: Insufficient privileges'));
    expect(context.logger.error).toHaveBeenCalled();
    expect(remember).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('returns an error and writes nothing when memory is disabled', async () => {
    memoryEnabled.mockResolvedValue(false);

    const { result } = await run();

    expect(result).toEqual(
      errorResult('Failed to store memory: Context Engine memory is disabled.')
    );
    expect(getCurrentProfileId).not.toHaveBeenCalled();
    expect(remember).not.toHaveBeenCalled();
  });

  it('returns an error and audits a failure when the caller has no user profile', async () => {
    getCurrentProfileId.mockResolvedValue(null);

    const { result } = await run();

    expect(result).toEqual(
      errorResult(
        'Failed to store memory: The caller has no user profile, so memory cannot be attributed to a user.'
      )
    );
    expect(remember).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
    );
  });

  it('returns an error and audits a failure when an AI index is missing', async () => {
    assertAiIndicesWritableMock.mockRejectedValue(new AiIndexNotFoundError('support'));

    const { result } = await run({ ...params, aiIndexIds: ['support'] });

    expect(result).toEqual({
      results: [expect.objectContaining({ type: ToolResultType.error })],
    });
    expect(remember).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ outcome: 'failure' }),
        error: expect.objectContaining({ code: 'AiIndexNotFoundError' }),
      })
    );
  });

  it('returns an error and audits a failure when an AI index is not writable', async () => {
    assertAiIndicesWritableMock.mockRejectedValue(new Error("Cannot write to AI index 'support'"));

    const { result } = await run({ ...params, aiIndexIds: ['support'] });

    expect(result).toEqual(
      errorResult("Failed to store memory: Cannot write to AI index 'support'")
    );
    expect(remember).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledTimes(1);
  });

  it('logs and audits a background write failure but still returns the id', async () => {
    remember.mockRejectedValue(new Error('index unavailable'));

    const { result, context } = await run();

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: { id: 'generated-memory-id', sessionId: 'conversation-1' },
        },
      ],
    });
    expect(context.logger.error).toHaveBeenCalledWith(
      'Failed to remember session memory [id=generated-memory-id]: index unavailable'
    );
    expect(auditLog).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ outcome: 'failure' }),
        error: expect.objectContaining({ message: 'index unavailable' }),
      })
    );
  });
});
