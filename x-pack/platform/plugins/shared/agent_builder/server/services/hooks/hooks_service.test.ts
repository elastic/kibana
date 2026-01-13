/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError, isBadRequestError } from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { HooksService } from './hooks_service';
import { HookEvent, HookExecutionMode } from './types';
import type { ConversationRoundStartHookContext } from './types';

describe('HooksService', () => {
  const createService = () => {
    const logger = loggingSystemMock.create().get('test');
    const service = new HooksService();
    const setup = service.setup({ logger });
    const start = service.start();
    return { setup, start };
  };

  const baseContext = {
    event: HookEvent.onConversationRoundStart as const,
    agentId: 'agent-1',
    conversationId: 'conv-1',
    conversation: {
      id: 'conv-1',
      agent_id: 'agent-1',
      user: { id: 'u-1', name: 'User', username: 'user' },
      title: 't',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rounds: [],
    },
    nextInput: { message: 'hello' },
    request: {} as any,
  };

  it('runs blocking hooks in priority order (desc) and applies nextInput mutation', async () => {
    const { setup, start } = createService();
    const calls: string[] = [];

    setup.register({
      id: 'h1',
      event: HookEvent.onConversationRoundStart,
      mode: HookExecutionMode.blocking,
      priority: 5,
      handler: async () => {
        calls.push('h1');
        return { nextInput: { message: 'mutated' } };
      },
    });
    setup.register({
      id: 'h2',
      event: HookEvent.onConversationRoundStart,
      mode: HookExecutionMode.blocking,
      priority: 10,
      handler: async (ctx: ConversationRoundStartHookContext) => {
        calls.push(`h2:${ctx.nextInput.message}`);
      },
    });

    const result = await start.runBlocking(HookEvent.onConversationRoundStart, baseContext);
    expect(calls).toEqual(['h2:hello', 'h1']);
    expect(result.nextInput.message).toBe('mutated');
  });

  it('aborts blocking execution when a hook throws a non-AgentBuilderError', async () => {
    const { setup, start } = createService();

    setup.register({
      id: 'h1',
      event: HookEvent.onConversationRoundStart,
      mode: HookExecutionMode.blocking,
      handler: async () => {
        throw new Error('nope');
      },
    });

    try {
      await start.runBlocking(HookEvent.onConversationRoundStart, baseContext);
      throw new Error('Expected hook execution to throw');
    } catch (e) {
      expect(e).toMatchObject({ message: 'nope' });
      expect(isBadRequestError(e)).toBe(true);
    }
  });

  it('preserves AgentBuilderErrors thrown by hooks and augments metadata', async () => {
    const { setup, start } = createService();

    setup.register({
      id: 'h1',
      event: HookEvent.onConversationRoundStart,
      mode: HookExecutionMode.blocking,
      handler: async () => {
        throw createBadRequestError('blocked', { reason: 'test' });
      },
    });

    await expect(
      start.runBlocking(HookEvent.onConversationRoundStart, baseContext)
    ).rejects.toMatchObject({
      message: 'blocked',
      meta: expect.objectContaining({
        reason: 'test',
        hookId: 'h1',
        hookEvent: HookEvent.onConversationRoundStart,
        hookMode: HookExecutionMode.blocking,
      }),
    });
  });

  it('runs parallel hooks without blocking and swallows errors', async () => {
    const { setup, start } = createService();

    const handler = jest.fn(async () => {
      throw new Error('boom');
    });

    setup.register({
      id: 'p1',
      event: HookEvent.onConversationRoundStart,
      mode: HookExecutionMode.parallel,
      handler,
    });

    expect(() => start.runParallel(HookEvent.onConversationRoundStart, baseContext)).not.toThrow();
  });

  it('aborts via abortController when a parallel hook throws', async () => {
    const { setup, start } = createService();

    setup.register({
      id: 'p1',
      event: HookEvent.onConversationRoundStart,
      mode: HookExecutionMode.parallel,
      handler: async () => {
        throw new Error('guardrails violation');
      },
    });

    const abortController = new AbortController();
    const context = { ...baseContext, abortController };

    start.runParallel(HookEvent.onConversationRoundStart, context as any);

    // allow the promise chain + catch handler to run
    await new Promise((resolve) => setImmediate(resolve));

    expect(abortController.signal.aborted).toBe(true);
    const reason = (abortController.signal as any).reason;
    expect(reason).toMatchObject({ message: 'guardrails violation' });
  });
});
