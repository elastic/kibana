/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHooksExecutionError } from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { HooksService } from './hooks_service';
import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type {
  BeforeAgentHookContext,
  BeforeToolCallHookContext,
  AfterToolCallHookContext,
  AfterAgentHookContext,
} from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common';
import { type ConversationRound } from '@kbn/agent-builder-common';

const TEST_AGENT_ID = 'agent-1';
const TEST_CONVERSATION_ID = 'conv-1';

const baseToolCallContext: BeforeToolCallHookContext = {
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

  const baseContext: BeforeAgentHookContext = {
    nextInput: { message: 'hello', attachments: [] },
    request: {} as any,
  };

  const baseConversation = {
    id: TEST_CONVERSATION_ID,
    agent_id: TEST_AGENT_ID,
    user: { id: 'u-1', name: 'User', username: 'user' },
    title: 't',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rounds: [],
  };

  it('runs blocking hooks in priority order (desc) and applies nextInput mutation', async () => {
    const { setup, start } = createService();
    const calls: string[] = [];

    setup.register({
      id: 'h1',
      priority: 5,
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.blocking,
          handler: async () => {
            calls.push('h1');
            return { nextInput: { message: 'mutated' } };
          },
        },
      },
    });
    setup.register({
      id: 'h2',
      priority: 10,
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.blocking,
          handler: async (ctx: BeforeAgentHookContext) => {
            calls.push(`h2:${ctx.nextInput.message}`);
          },
        },
      },
    });

    const result = await start.run(HookLifecycle.beforeAgent, baseContext);
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
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('before-first'),
        },
        [HookLifecycle.afterToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('after-first'),
        },
      },
    });
    setup.register({
      id: 'order-second',
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('before-second'),
        },
        [HookLifecycle.afterToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('after-second'),
        },
      },
    });
    setup.register({
      id: 'order-third',
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('before-third'),
        },
        [HookLifecycle.afterToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('after-third'),
        },
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
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('before-low'),
        },
        [HookLifecycle.afterToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('after-low'),
        },
      },
    });
    setup.register({
      id: 'priority-mid',
      priority: 5,
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('before-mid'),
        },
        [HookLifecycle.afterToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('after-mid'),
        },
      },
    });
    setup.register({
      id: 'priority-high',
      priority: 10,
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('before-high'),
        },
        [HookLifecycle.afterToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('after-high'),
        },
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
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('blocking'),
        },
      },
    });
    setup.register({
      id: 'non-blocking',
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.nonBlocking,
          handler: handler('non-blocking'),
        },
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
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.nonBlocking,
          handler: handler('before-first'),
        },
        [HookLifecycle.afterToolCall]: {
          mode: HookExecutionMode.nonBlocking,
          handler: handler('after-first'),
        },
      },
    });
    setup.register({
      id: 'nonBlocking-second',
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.nonBlocking,
          handler: handler('before-second'),
        },
        [HookLifecycle.afterToolCall]: {
          mode: HookExecutionMode.nonBlocking,
          handler: handler('after-second'),
        },
      },
    });
    setup.register({
      id: 'nonBlocking-third',
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.nonBlocking,
          handler: handler('before-third'),
        },
        [HookLifecycle.afterToolCall]: {
          mode: HookExecutionMode.nonBlocking,
          handler: handler('after-third'),
        },
      },
    });

    await start.run(HookLifecycle.beforeToolCall, baseToolCallContext);
    await flushEventLoop();

    await start.run(HookLifecycle.afterToolCall, afterContext);
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

  it('runs hooks with undefined priority after those with priority', async () => {
    const { setup, start } = createService();
    const hookCalls: string[] = [];
    const handler = createCallRecorder(hookCalls);

    setup.register({
      id: 'undefined-priority',
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('undefined-priority'),
        },
      },
    });

    setup.register({
      id: 'priority-1',
      priority: 1,
      hooks: {
        [HookLifecycle.beforeToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: handler('priority-1'),
        },
      },
    });

    await start.run(HookLifecycle.beforeToolCall, baseToolCallContext);
    await flushEventLoop();

    expect(hookCalls).toEqual(['priority-1', 'undefined-priority']);
  });

  it('aborts blocking execution when a hook throws an error', async () => {
    const { setup, start } = createService();

    setup.register({
      id: 'error-hook',
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.blocking,
          handler: async () => {
            throw new Error('error');
          },
        },
      },
    });

    try {
      await start.run(HookLifecycle.beforeAgent, baseContext);
      throw new Error('Expected hook execution to throw');
    } catch (e) {
      expect(e).toMatchObject({ message: 'error' });
      expect(isHooksExecutionError(e)).toBe(true);
    }
  });

  it('throws when a blocking hook exceeds its timeout (default 3min, overridden for test)', async () => {
    const { setup, start } = createService();

    setup.register({
      id: 'slow-hook',
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.blocking,
          timeout: 50,
          handler: () =>
            new Promise<void>((resolve) => {
              setTimeout(resolve, 500);
            }),
        },
      },
    });

    await expect(start.run(HookLifecycle.beforeAgent, baseContext)).rejects.toMatchObject({
      message: expect.stringContaining('timed out after 50ms'),
      meta: expect.objectContaining({
        hookId: 'slow-hook-beforeAgent',
        hookLifecycle: HookLifecycle.beforeAgent,
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
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.nonBlocking,
          handler,
        },
      },
    });

    expect(() => start.run(HookLifecycle.beforeAgent, baseContext)).not.toThrow();
  });

  it('applies afterAgent mutation and returns modified round', async () => {
    const { setup, start } = createService();
    const baseRound = {
      id: 'round-1',
    } as unknown as ConversationRound;
    const baseAfterRoundContext: AfterAgentHookContext = {
      request: baseContext.request,
      conversation: { ...baseConversation, rounds: [baseRound] },
      round: baseRound,
    };

    setup.register({
      id: 'round-mutator',
      hooks: {
        [HookLifecycle.afterAgent]: {
          mode: HookExecutionMode.blocking,
          handler: async (ctx) => ({
            round: {
              ...ctx.round,
              response: { message: 'modified-by-hook' },
            },
          }),
        },
      },
    });

    const result = await start.run(HookLifecycle.afterAgent, baseAfterRoundContext);
    expect(result.round.response).toEqual({ message: 'modified-by-hook' });
  });

  it('applies afterToolCall mutation and returns modified toolReturn', async () => {
    const { setup, start } = createService();
    const originalToolReturn = {
      results: [
        {
          tool_result_id: 'res-1',
          type: ToolResultType.other as const,
          data: { a: 1 },
        },
      ],
    };
    const afterContext = createAfterToolCallContext({ toolReturn: originalToolReturn });

    const modifiedToolReturn = {
      results: [
        {
          tool_result_id: 'res-hook',
          type: ToolResultType.other as const,
          data: { from: 'hook' },
        },
      ],
    };
    setup.register({
      id: 'tool-return-mutator',
      hooks: {
        [HookLifecycle.afterToolCall]: {
          mode: HookExecutionMode.blocking,
          handler: async () => ({ toolReturn: modifiedToolReturn }),
        },
      },
    });

    const result = await start.run(HookLifecycle.afterToolCall, afterContext);
    expect(result.toolReturn).toEqual(modifiedToolReturn);
  });

  it('run() returns context unchanged when no hooks are registered for that lifecycle', async () => {
    const { setup, start } = createService();
    // Register only for a different lifecycle so the target lifecycle has no handlers
    setup.register({
      id: 'other',
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.blocking,
          handler: async (ctx) => ctx,
        },
      },
    });

    const roundR1 = { id: 'r1' } as unknown as ConversationRound;
    const contextForAfterRound: AfterAgentHookContext = {
      request: baseContext.request,
      conversation: { ...baseConversation, rounds: [roundR1] },
      round: roundR1,
    };

    const result = await start.run(HookLifecycle.afterAgent, contextForAfterRound);
    expect(result).toBe(contextForAfterRound);
  });

  it('forwards abortSignal from context to handler', async () => {
    const { setup, start } = createService();
    const controller = new AbortController();
    const contextWithSignal = { ...baseContext, abortSignal: controller.signal };

    let receivedSignal: AbortSignal | undefined;
    setup.register({
      id: 'signal-check',
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.blocking,
          handler: async (ctx) => {
            receivedSignal = ctx.abortSignal;
            return ctx;
          },
        },
      },
    });

    await start.run(HookLifecycle.beforeAgent, contextWithSignal);
    expect(receivedSignal).toBe(controller.signal);
  });
});
