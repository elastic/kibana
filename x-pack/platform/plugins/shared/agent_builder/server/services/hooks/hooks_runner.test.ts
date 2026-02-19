/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHooksExecutionError, ToolResultType } from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createHooksRunner } from './hooks_runner';
import type { CreateHooksRunnerDeps } from './hooks_runner';
import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type {
  BeforeAgentHookContext,
  BeforeToolCallHookContext,
  AfterToolCallHookContext,
  HookContext,
  HookRegistration,
} from '@kbn/agent-builder-server';

const baseContext: BeforeAgentHookContext = {
  nextInput: { message: 'hello', attachments: [] },
  request: {} as BeforeAgentHookContext['request'],
};

const baseToolCallContext: BeforeToolCallHookContext = {
  toolId: 'tool-1',
  toolCallId: 'call-1',
  toolParams: {},
  source: 'agent',
  request: {} as BeforeToolCallHookContext['request'],
};

const createAfterToolCallContext = (
  overrides: Partial<AfterToolCallHookContext> = {}
): AfterToolCallHookContext => ({
  ...baseToolCallContext,
  toolReturn: { results: [] },
  ...overrides,
});

const flushEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('createHooksRunner', () => {
  const createRunner = (deps: Partial<CreateHooksRunnerDeps> = {}) => {
    const logger = loggingSystemMock.create().get('hooks');
    return createHooksRunner({
      logger,
      getHooksForLifecycle: () => [],
      ...deps,
    });
  };

  it('returns context unchanged when getHooksForLifecycle returns no hooks', async () => {
    const run = createRunner().run;
    const result = await run(HookLifecycle.beforeAgent, baseContext);
    expect(result).toBe(baseContext);
  });

  it('runs blocking hooks and applies context updates', async () => {
    const run = createRunner({
      getHooksForLifecycle: (): HookRegistration<HookLifecycle>[] => [
        {
          id: 'h1',
          mode: HookExecutionMode.blocking,
          handler: async () => ({ nextInput: { message: 'mutated', attachments: [] } }),
        } as HookRegistration<HookLifecycle>,
      ],
    }).run;

    const result = await run(HookLifecycle.beforeAgent, baseContext);
    expect(result.nextInput.message).toBe('mutated');
  });

  it('runs blocking first then non-blocking with updated context', async () => {
    const calls: string[] = [];
    const run = createRunner({
      getHooksForLifecycle: (): HookRegistration<HookLifecycle>[] => [
        {
          id: 'blocking',
          mode: HookExecutionMode.blocking,
          handler: async (ctx: HookContext<HookLifecycle.beforeAgent>) => {
            calls.push('blocking');
            return { nextInput: { message: 'from-blocking', attachments: [] } };
          },
        } as HookRegistration<HookLifecycle>,
        {
          id: 'non-blocking',
          mode: HookExecutionMode.nonBlocking,
          handler: (ctx: BeforeAgentHookContext) => {
            calls.push(`non-blocking:${ctx.nextInput.message}`);
          },
        } as HookRegistration<HookLifecycle>,
      ],
    }).run;

    const result = await run(HookLifecycle.beforeAgent, baseContext);
    expect(result.nextInput.message).toBe('from-blocking');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(calls).toEqual(['blocking', 'non-blocking:from-blocking']);
  });

  it('throws normalized HooksExecutionError when a blocking hook throws', async () => {
    const run = createRunner({
      getHooksForLifecycle: (): HookRegistration<HookLifecycle>[] => [
        {
          id: 'error-hook',
          mode: HookExecutionMode.blocking,
          handler: async () => {
            throw new Error('error');
          },
        } as HookRegistration<HookLifecycle>,
      ],
    }).run;

    await expect(run(HookLifecycle.beforeAgent, baseContext)).rejects.toMatchObject({
      message: 'error',
    });
    try {
      await run(HookLifecycle.beforeAgent, baseContext);
    } catch (e) {
      expect(isHooksExecutionError(e)).toBe(true);
    }
  });

  it('throws when a blocking hook exceeds its timeout', async () => {
    const run = createRunner({
      getHooksForLifecycle: (): HookRegistration<HookLifecycle>[] => [
        {
          id: 'slow-hook',
          mode: HookExecutionMode.blocking,
          timeout: 50,
          handler: () =>
            new Promise<void>((resolve) => {
              setTimeout(resolve, 500);
            }),
        } as HookRegistration<HookLifecycle>,
      ],
    }).run;

    await expect(run(HookLifecycle.beforeAgent, baseContext)).rejects.toMatchObject({
      message: expect.stringContaining('timed out after 50ms'),
      meta: expect.objectContaining({
        hookId: 'slow-hook',
        hookLifecycle: HookLifecycle.beforeAgent,
      }),
    });
  });

  it('throws request aborted when abortSignal is aborted before a hook runs', async () => {
    const controller = new AbortController();
    controller.abort();
    const contextWithSignal = { ...baseContext, abortSignal: controller.signal };

    const run = createRunner({
      getHooksForLifecycle: (): HookRegistration<HookLifecycle>[] => [
        {
          id: 'blocking-hook',
          mode: HookExecutionMode.blocking,
          handler: async (ctx) => ctx,
        } as HookRegistration<HookLifecycle>,
      ],
    }).run;

    await expect(run(HookLifecycle.beforeAgent, contextWithSignal)).rejects.toMatchObject({
      message: expect.stringContaining('Request aborted'),
    });
  });

  it('runs non-blocking hooks without blocking and swallows errors', async () => {
    const logger = loggingSystemMock.create().get('hooks');
    const run = createRunner({
      logger,
      getHooksForLifecycle: (): HookRegistration<HookLifecycle>[] => [
        {
          id: 'p1',
          mode: HookExecutionMode.nonBlocking,
          handler: async () => {
            throw new Error('boom');
          },
        } as HookRegistration<HookLifecycle>,
      ],
    }).run;

    await expect(run(HookLifecycle.beforeAgent, baseContext)).resolves.toBeDefined();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Non-blocking hook "p1" failed')
    );
  });

  it('runs blocking hooks in priority order (desc) and applies nextInput mutation', async () => {
    const calls: string[] = [];
    const run = createRunner({
      getHooksForLifecycle: (): HookRegistration<HookLifecycle>[] => [
        {
          id: 'h1',
          priority: 5,
          mode: HookExecutionMode.blocking,
          handler: async () => {
            calls.push('h1');
            return { nextInput: { message: 'mutated', attachments: [] } };
          },
        } as HookRegistration<HookLifecycle>,
        {
          id: 'h2',
          priority: 10,
          mode: HookExecutionMode.blocking,
          handler: async (ctx: BeforeAgentHookContext) => {
            calls.push(`h2:${ctx.nextInput.message}`);
          },
        } as HookRegistration<HookLifecycle>,
      ],
    }).run;

    const result = await run(HookLifecycle.beforeAgent, baseContext);
    expect(calls).toEqual(['h2:hello', 'h1']);
    expect(result.nextInput.message).toBe('mutated');
  });

  it('runs after* hooks in reverse order', async () => {
    const hookCalls: string[] = [];
    const record = (label: string) => async () => {
      hookCalls.push(label);
    };
    const afterContext = createAfterToolCallContext();

    const run = createRunner({
      getHooksForLifecycle: (lifecycle): HookRegistration<HookLifecycle>[] => {
        if (lifecycle === HookLifecycle.beforeToolCall) {
          return [
            {
              id: 'order-first',
              mode: HookExecutionMode.blocking,
              handler: record('before-first'),
            } as HookRegistration<HookLifecycle>,
            {
              id: 'order-second',
              mode: HookExecutionMode.blocking,
              handler: record('before-second'),
            } as HookRegistration<HookLifecycle>,
            {
              id: 'order-third',
              mode: HookExecutionMode.blocking,
              handler: record('before-third'),
            } as HookRegistration<HookLifecycle>,
          ];
        }
        if (lifecycle === HookLifecycle.afterToolCall) {
          return [
            {
              id: 'order-first',
              mode: HookExecutionMode.blocking,
              handler: record('after-first'),
            } as HookRegistration<HookLifecycle>,
            {
              id: 'order-second',
              mode: HookExecutionMode.blocking,
              handler: record('after-second'),
            } as HookRegistration<HookLifecycle>,
            {
              id: 'order-third',
              mode: HookExecutionMode.blocking,
              handler: record('after-third'),
            } as HookRegistration<HookLifecycle>,
          ];
        }
        return [];
      },
    }).run;

    await run(HookLifecycle.beforeToolCall, baseToolCallContext);
    await run(HookLifecycle.afterToolCall, afterContext);

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
    const hookCalls: string[] = [];
    const record = (label: string) => async () => {
      hookCalls.push(label);
    };
    const afterContext = createAfterToolCallContext();

    const run = createRunner({
      getHooksForLifecycle: (lifecycle): HookRegistration<HookLifecycle>[] => {
        if (
          lifecycle === HookLifecycle.beforeToolCall ||
          lifecycle === HookLifecycle.afterToolCall
        ) {
          return [
            {
              id: 'priority-low',
              priority: 1,
              mode: HookExecutionMode.blocking,
              handler:
                lifecycle === HookLifecycle.beforeToolCall
                  ? record('before-low')
                  : record('after-low'),
            } as HookRegistration<HookLifecycle>,
            {
              id: 'priority-mid',
              priority: 5,
              mode: HookExecutionMode.blocking,
              handler:
                lifecycle === HookLifecycle.beforeToolCall
                  ? record('before-mid')
                  : record('after-mid'),
            } as HookRegistration<HookLifecycle>,
            {
              id: 'priority-high',
              priority: 10,
              mode: HookExecutionMode.blocking,
              handler:
                lifecycle === HookLifecycle.beforeToolCall
                  ? record('before-high')
                  : record('after-high'),
            } as HookRegistration<HookLifecycle>,
          ];
        }
        return [];
      },
    }).run;

    await run(HookLifecycle.beforeToolCall, baseToolCallContext);
    await run(HookLifecycle.afterToolCall, afterContext);

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
    const hookCalls: string[] = [];
    const record = (label: string) => async () => {
      hookCalls.push(label);
    };

    const run = createRunner({
      getHooksForLifecycle: (): HookRegistration<HookLifecycle>[] => [
        {
          id: 'blocking',
          mode: HookExecutionMode.blocking,
          handler: record('blocking'),
        } as HookRegistration<HookLifecycle>,
        {
          id: 'non-blocking',
          mode: HookExecutionMode.nonBlocking,
          handler: record('non-blocking'),
        } as HookRegistration<HookLifecycle>,
      ],
    }).run;

    const result = await run(HookLifecycle.beforeToolCall, baseToolCallContext);
    expect(result).toBeDefined();
    await flushEventLoop();
    expect(hookCalls).toEqual(['blocking', 'non-blocking']);
  });

  it('runs non-blocking before* hooks in registration order and after* in reverse order', async () => {
    const hookCalls: string[] = [];
    const record = (label: string) => () => {
      hookCalls.push(label);
    };
    const afterContext = createAfterToolCallContext();

    const run = createRunner({
      getHooksForLifecycle: (lifecycle): HookRegistration<HookLifecycle>[] => {
        if (lifecycle === HookLifecycle.beforeToolCall) {
          return [
            {
              id: 'nb-first',
              mode: HookExecutionMode.nonBlocking,
              handler: record('before-first'),
            } as HookRegistration<HookLifecycle>,
            {
              id: 'nb-second',
              mode: HookExecutionMode.nonBlocking,
              handler: record('before-second'),
            } as HookRegistration<HookLifecycle>,
            {
              id: 'nb-third',
              mode: HookExecutionMode.nonBlocking,
              handler: record('before-third'),
            } as HookRegistration<HookLifecycle>,
          ];
        }
        if (lifecycle === HookLifecycle.afterToolCall) {
          return [
            {
              id: 'nb-first',
              mode: HookExecutionMode.nonBlocking,
              handler: record('after-first'),
            } as HookRegistration<HookLifecycle>,
            {
              id: 'nb-second',
              mode: HookExecutionMode.nonBlocking,
              handler: record('after-second'),
            } as HookRegistration<HookLifecycle>,
            {
              id: 'nb-third',
              mode: HookExecutionMode.nonBlocking,
              handler: record('after-third'),
            } as HookRegistration<HookLifecycle>,
          ];
        }
        return [];
      },
    }).run;

    await run(HookLifecycle.beforeToolCall, baseToolCallContext);
    await flushEventLoop();
    await run(HookLifecycle.afterToolCall, afterContext);
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
    const hookCalls: string[] = [];
    const record = (label: string) => async () => {
      hookCalls.push(label);
    };

    const run = createRunner({
      getHooksForLifecycle: (): HookRegistration<HookLifecycle>[] => [
        {
          id: 'undefined-priority',
          mode: HookExecutionMode.blocking,
          handler: record('undefined-priority'),
        } as HookRegistration<HookLifecycle>,
        {
          id: 'priority-1',
          priority: 1,
          mode: HookExecutionMode.blocking,
          handler: record('priority-1'),
        } as HookRegistration<HookLifecycle>,
      ],
    }).run;

    await run(HookLifecycle.beforeToolCall, baseToolCallContext);
    await flushEventLoop();

    expect(hookCalls).toEqual(['priority-1', 'undefined-priority']);
  });

  it('applies afterToolCall mutation and returns modified toolReturn', async () => {
    const originalToolReturn = {
      results: [{ tool_result_id: 'res-1', type: ToolResultType.other as const, data: { a: 1 } }],
    };
    const afterContext = createAfterToolCallContext({ toolReturn: originalToolReturn });

    const modifiedToolReturn = {
      results: [
        { tool_result_id: 'res-hook', type: ToolResultType.other as const, data: { from: 'hook' } },
      ],
    };

    const run = createRunner({
      getHooksForLifecycle: (): HookRegistration<HookLifecycle>[] => [
        {
          id: 'tool-return-mutator',
          mode: HookExecutionMode.blocking,
          handler: async () => ({ toolReturn: modifiedToolReturn }),
        } as HookRegistration<HookLifecycle>,
      ],
    }).run;

    const result = await run(HookLifecycle.afterToolCall, afterContext);
    expect(result.toolReturn).toEqual(modifiedToolReturn);
  });

  it('run() returns context unchanged when no hooks are registered for that lifecycle', async () => {
    const afterContext = createAfterToolCallContext();

    const run = createRunner({
      getHooksForLifecycle: (lifecycle) =>
        lifecycle === HookLifecycle.beforeAgent
          ? [
              {
                id: 'other',
                mode: HookExecutionMode.blocking,
                handler: async (ctx) => ctx,
              } as HookRegistration<HookLifecycle>,
            ]
          : [],
    }).run;

    const result = await run(HookLifecycle.afterToolCall, afterContext);
    expect(result).toBe(afterContext);
  });

  it('forwards abortSignal from context to handler', async () => {
    const controller = new AbortController();
    const contextWithSignal = { ...baseContext, abortSignal: controller.signal };

    let receivedSignal: AbortSignal | undefined;
    const run = createRunner({
      getHooksForLifecycle: (): HookRegistration<HookLifecycle>[] => [
        {
          id: 'signal-check',
          mode: HookExecutionMode.blocking,
          handler: async (ctx: BeforeAgentHookContext) => {
            receivedSignal = ctx.abortSignal;
            return ctx;
          },
        } as HookRegistration<HookLifecycle>,
      ],
    }).run;

    await run(HookLifecycle.beforeAgent, contextWithSignal);
    expect(receivedSignal).toBe(controller.signal);
  });
});
