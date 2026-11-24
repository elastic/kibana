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
import type {
  ForgetResult,
  SessionMemoryService,
} from '@kbn/context-engine-plugin/server/session_memory/types';
import { coreMock } from '@kbn/core/server/mocks';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createForgetTool } from './tool';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn(),
}));

const assertContextEngineWriteAccessMock = jest.mocked(assertContextEngineWriteAccess);

describe('forget tool', () => {
  const forget = jest.fn();
  const auditLog = jest.fn();
  const getCurrentProfileId = jest.fn();

  const createTool = () => {
    const coreStart = coreMock.createStart();
    coreStart.userProfile.getCurrentProfileId = getCurrentProfileId;
    coreStart.security.audit.asScoped = jest.fn().mockReturnValue({ log: auditLog });
    return createForgetTool({
      getSessionMemoryService: async () => ({ forget } as unknown as SessionMemoryService),
      getCoreStart: async () => coreStart,
      getSecurityStart: async () => undefined,
    });
  };

  const createContext = (): ToolHandlerContext =>
    ({
      ...agentBuilderMocks.tools.createHandlerContext(),
      spaceId: 'space-1',
      runContext: { runId: 'run-1', stack: [] },
    } as unknown as ToolHandlerContext);

  const run = async (ids: string[]) => {
    const tool = createTool();
    const { handler } = tool;
    if (!handler) {
      throw new Error('Expected forget tool handler');
    }
    const context = createContext();
    const result = await handler(tool.schema.parse({ ids }), context);
    return { result, context };
  };

  const errorResult = (message: string) => ({
    results: [{ type: ToolResultType.error, data: { message } }],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    assertContextEngineWriteAccessMock.mockResolvedValue();
    getCurrentProfileId.mockResolvedValue('profile-1');
  });

  it('registers a destructive, idempotent tool that takes bounded ids', () => {
    const tool = createTool();

    expect(tool.id).toBe(contextEngineMemoryTools.forget);
    expect(tool.availability?.cacheMode).toBe('none');
    expect(tool.annotations?.destructiveHint).toBe(true);
    expect(tool.annotations?.idempotentHint).toBe(true);
    expect(tool.confirmation).toBeUndefined();
    expect(tool.schema.safeParse({ ids: ['a'] }).success).toBe(true);
    expect(tool.schema.safeParse({ ids: [] }).success).toBe(false);
    expect(tool.schema.safeParse({ ids: [''] }).success).toBe(false);
    expect(tool.schema.safeParse({ ids: ['a', ' \t'] }).success).toBe(false);
    expect(
      tool.schema.safeParse({ ids: Array.from({ length: 101 }, (_, i) => `id-${i}`) }).success
    ).toBe(false);
    expect(tool.schema.safeParse({ id: 'a' }).success).toBe(false);
  });

  it('forgets the unique ids for the caller scope and returns one result per id', async () => {
    const results: ForgetResult[] = [
      { id: 'a', outcome: 'forgotten' },
      { id: 'b', outcome: 'already_forgotten' },
    ];
    forget.mockResolvedValue(results);

    const { result } = await run(['a', 'b', 'a']);

    expect(assertContextEngineWriteAccessMock).toHaveBeenCalled();
    expect(forget).toHaveBeenCalledWith({ space: 'space-1', userId: 'profile-1' }, ['a', 'b']);
    expect(result).toEqual({ results: [{ type: ToolResultType.other, data: { results } }] });
  });

  it('audits one event per result with the outcome mapped to success or failure', async () => {
    forget.mockResolvedValue([
      { id: 'a', outcome: 'forgotten' },
      { id: 'b', outcome: 'already_forgotten' },
      { id: 'c', outcome: 'not_found' },
      { id: 'd', outcome: 'failed', error: 'rejected' },
    ]);

    await run(['a', 'b', 'c', 'd']);

    const events = auditLog.mock.calls.map(([event]) => event);
    expect(events.map(({ kibana }) => kibana.saved_object.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(events.map(({ event }) => event.outcome)).toEqual([
      'success',
      'success',
      'failure',
      'failure',
    ]);
    expect(events[2].error).toEqual({ code: 'not_found', message: 'Session memory not found' });
    expect(events[3].error).toEqual({ code: 'failed', message: 'rejected' });
    expect(events[0].user).toEqual({ target: { id: 'profile-1' } });
  });

  it('returns an error and forgets nothing when write access is denied', async () => {
    assertContextEngineWriteAccessMock.mockRejectedValue(new Error('Insufficient privileges'));

    const { result, context } = await run(['a']);

    expect(result).toEqual(errorResult('Failed to forget memory: Insufficient privileges'));
    expect(context.logger.error).toHaveBeenCalled();
    expect(forget).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('returns an error and audits a failure for every id when the caller has no user profile', async () => {
    getCurrentProfileId.mockResolvedValue(null);

    const { result } = await run(['a', 'b']);

    expect(result).toEqual(
      errorResult(
        'Failed to forget memory: The caller has no user profile, so memory cannot be attributed to a user.'
      )
    );
    expect(forget).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledTimes(2);
    auditLog.mock.calls.forEach(([event]) => {
      expect(event.event.outcome).toBe('failure');
      expect(event.error.code).toBe('Forbidden');
    });
  });

  it('returns an error and audits a failure for every id when the service throws', async () => {
    forget.mockRejectedValue(new Error('search failed'));

    const { result } = await run(['a', 'b']);

    expect(result).toEqual(errorResult('Failed to forget memory: search failed'));
    expect(auditLog).toHaveBeenCalledTimes(2);
    auditLog.mock.calls.forEach(([event]) => expect(event.event.outcome).toBe('failure'));
  });
});
