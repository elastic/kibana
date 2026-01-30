/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError, isBadRequestError } from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { HooksService } from './hooks_service';
import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type {
  BeforeConversationRoundHookContext,
  BeforeToolCallHookContext,
  AfterToolCallHookContext,
} from '@kbn/agent-builder-server';

const TEST_AGENT_ID = 'agent-1';
const TEST_CONVERSATION_ID = 'conv-1';

const baseToolCallContext: BeforeToolCallHookContext = {
  agentId: TEST_AGENT_ID,
  conversationId: TEST_CONVERSATION_ID,
  toolId: 'tool-1',
  toolCallId: 'call-1',
  toolParams: {},
  source: 'agent',
  request: {} as any,
};

const createAfterToolCallContext = (
  overrides: Partial<AfterToolCallHookContext> = {}
): AfterToolCallHookContext => ({
  ...baseToolCallContext,
  toolReturn: { results: [] },
  ...overrides,
});

describe('HooksService', () => {
  const createService = () => {
    const logger = loggingSystemMock.create().get('test');
    const service = new HooksService();
    const setup = service.setup({ logger });
    const start = service.start();
    return { setup, start };
  };

  const createCallRecorder = (calls: string[]) => (label: string) => async () => {
    calls.push(label);
  };

  const flushEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

  const baseContext = {
    agentId: TEST_AGENT_ID,
    conversationId: TEST_CONVERSATION_ID,
    conversation: {
      id: TEST_CONVERSATION_ID,
      agent_id: TEST_AGENT_ID,
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
      priority: 5,
      [HookLifecycle.beforeConversationRound]: {
        mode: HookExecutionMode.blocking,
        handler: async () => {
          calls.push('h1');
          return { nextInput: { message: 'mutated' } };
        },
      },
    });
    setup.register({
      id: 'h2',
      priority: 10,
      [HookLifecycle.beforeConversationRound]: {
        mode: HookExecutionMode.blocking,
        handler: async (ctx: BeforeConversationRoundHookContext) => {
          calls.push(`h2:${ctx.nextInput.message}`);
        },
      },
    });

    const result = await start.run(HookLifecycle.beforeConversationRound, baseContext);
    expect(calls).toEqual(['h2:hello', 'h1']);
    expect(result.nextInput.message).toBe('mutated');
  });

  it('runs after* hooks in reverse order', async () => {
    const { setup, start } = createService();
    const hookCalls: string[] = [];
    const afterContext = createAfterToolCallContext();
    const handler = createCallRecorder(hookCalls);

    // No priority: order is registration order. Before = registration order, after = reverse.
    setup.register({
      id: 'order-first',
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('before-first'),
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('after-first'),
      },
    });
    setup.register({
      id: 'order-second',
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('before-second'),
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('after-second'),
      },
    });
    setup.register({
      id: 'order-third',
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('before-third'),
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('after-third'),
      },
    });

    await start.run(HookLifecycle.beforeToolCall, baseToolCallContext);
    await start.run(HookLifecycle.afterToolCall, afterContext);

    expect(hookCalls).toEqual([
      'before-first',
      'before-second',
      'before-third',
      'after-third',
      'after-second',
      'after-first',
    ]);
  });

  it('runs before* hooks by priority (desc) and after* in reverse of that order', async () => {
    const { setup, start } = createService();
    const hookCalls: string[] = [];
    const afterContext = createAfterToolCallContext();
    const handler = createCallRecorder(hookCalls);

    // Priority 1 (low), 5 (mid), 10 (high). Before = high first; after = reverse (low first).
    setup.register({
      id: 'priority-low',
      priority: 1,
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('before-low'),
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('after-low'),
      },
    });
    setup.register({
      id: 'priority-mid',
      priority: 5,
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('before-mid'),
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('after-mid'),
      },
    });
    setup.register({
      id: 'priority-high',
      priority: 10,
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('before-high'),
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('after-high'),
      },
    });

    await start.run(HookLifecycle.beforeToolCall, baseToolCallContext);
    await start.run(HookLifecycle.afterToolCall, afterContext);

    expect(hookCalls).toEqual([
      'before-high',
      'before-mid',
      'before-low',
      'after-low',
      'after-mid',
      'after-high',
    ]);
  });

  it('run() runs blocking first then non-blocking with updated context and returns updated context', async () => {
    const { setup, start } = createService();
    const hookCalls: string[] = [];
    const handler = createCallRecorder(hookCalls);

    setup.register({
      id: 'blocking',
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: handler('blocking'),
      },
    });
    setup.register({
      id: 'non-blocking',
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: handler('non-blocking'),
      },
    });

    const result = await start.run(HookLifecycle.beforeToolCall, baseToolCallContext);
    expect(result).toBeDefined();
    await flushEventLoop();
    expect(hookCalls).toEqual(['blocking', 'non-blocking']);
  });

  it('runs non-blocking before* hooks in registration order and after* in reverse order', async () => {
    const { setup, start } = createService();
    const hookCalls: string[] = [];
    const afterContext = createAfterToolCallContext();
    const handler = createCallRecorder(hookCalls);

    setup.register({
      id: 'nonBlocking-first',
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: handler('before-first'),
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: handler('after-first'),
      },
    });
    setup.register({
      id: 'nonBlocking-second',
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: handler('before-second'),
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: handler('after-second'),
      },
    });
    setup.register({
      id: 'nonBlocking-third',
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: handler('before-third'),
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: handler('after-third'),
      },
    });

    start.run(HookLifecycle.beforeToolCall, baseToolCallContext);
    await flushEventLoop();

    start.run(HookLifecycle.afterToolCall, afterContext);
    await flushEventLoop();

    expect(hookCalls).toEqual([
      'before-first',
      'before-second',
      'before-third',
      'after-third',
      'after-second',
      'after-first',
    ]);
  });

  it('aborts blocking execution when a hook throws a non-AgentBuilderError', async () => {
    const { setup, start } = createService();

    setup.register({
      id: 'h1',
      [HookLifecycle.beforeConversationRound]: {
        mode: HookExecutionMode.blocking,
        handler: async () => {
          throw new Error('nope');
        },
      },
    });

    try {
      await start.run(HookLifecycle.beforeConversationRound, baseContext);
      throw new Error('Expected hook execution to throw');
    } catch (e) {
      expect(e).toMatchObject({ message: 'nope' });
      expect(isBadRequestError(e)).toBe(true);
    }
  });

  it('throws when a blocking hook exceeds its timeout (default 3min, overridden for test)', async () => {
    const { setup, start } = createService();

    setup.register({
      id: 'slow-hook',
      [HookLifecycle.beforeConversationRound]: {
        mode: HookExecutionMode.blocking,
        timeout: 50,
        handler: () =>
          new Promise<void>((resolve) => {
            setTimeout(resolve, 500);
          }),
      },
    });

    await expect(
      start.run(HookLifecycle.beforeConversationRound, baseContext)
    ).rejects.toMatchObject({
      message: expect.stringContaining('timed out after 50ms'),
      meta: expect.objectContaining({
        hookId: 'slow-hook-beforeConversationRound',
        hookLifecycle: HookLifecycle.beforeConversationRound,
      }),
    });
  });

  it('preserves AgentBuilderErrors thrown by hooks and augments metadata', async () => {
    const { setup, start } = createService();

    setup.register({
      id: 'h1',
      [HookLifecycle.beforeConversationRound]: {
        mode: HookExecutionMode.blocking,
        handler: async () => {
          throw createBadRequestError('blocked', { reason: 'test' });
        },
      },
    });

    await expect(
      start.run(HookLifecycle.beforeConversationRound, baseContext)
    ).rejects.toMatchObject({
      message: 'blocked',
      meta: expect.objectContaining({
        reason: 'test',
        hookId: 'h1-beforeConversationRound',
        hookLifecycle: HookLifecycle.beforeConversationRound,
        hookMode: HookExecutionMode.blocking,
      }),
    });
  });

  it('runs non-blocking hooks without blocking and swallows errors', async () => {
    const { setup, start } = createService();

    const handler = jest.fn(async () => {
      throw new Error('boom');
    });

    setup.register({
      id: 'p1',
      [HookLifecycle.beforeConversationRound]: {
        mode: HookExecutionMode.nonBlocking,
        handler,
      },
    });

    expect(() => start.run(HookLifecycle.beforeConversationRound, baseContext)).not.toThrow();
  });
});
