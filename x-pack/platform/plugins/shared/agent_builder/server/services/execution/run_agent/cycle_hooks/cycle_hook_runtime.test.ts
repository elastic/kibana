/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  ConversationRoundStepType,
  MODEL_CONTEXT_MAX_LENGTH,
  isInjectedContextStep,
} from '@kbn/agent-builder-common';
import type {
  ConversationRoundStep,
  InjectedContextStep,
  ReasoningStep,
  ToolCallStep,
} from '@kbn/agent-builder-common';
import type {
  CycleHandler,
  CycleHookDefinition,
  CycleHookExecutionContext,
} from '@kbn/agent-builder-server';
import { applyStepUpdates } from '../step_state';
import { CycleHookRuntime, type CycleDispatchFacts } from './cycle_hook_runtime';

const execution = {
  execution: { id: 'exec-1', resumed: false },
} as unknown as CycleHookExecutionContext;
const resumedExecution = {
  execution: { id: 'exec-2', resumed: true },
} as unknown as CycleHookExecutionContext;

const facts = (cycle: number, overrides: Partial<CycleDispatchFacts> = {}): CycleDispatchFacts => ({
  cycle,
  attempt: 0,
  steps: [],
  ...overrides,
});

const hook = (
  id: string,
  handler: CycleHandler,
  overrides: Partial<CycleHookDefinition> = {}
): CycleHookDefinition => ({ id, getHandler: () => handler, ...overrides });

const reasoning = (text: string): ReasoningStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
});

const toolCall = (id: string, group: string): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'tool',
  params: {},
  results: [],
  tool_call_group_id: group,
});

const appended = (steps: readonly ConversationRoundStep[]): InjectedContextStep[] =>
  steps.filter(isInjectedContextStep);

const texts = (updates: readonly ConversationRoundStep[]) =>
  appended(updates).map((step) => `${step.hook_id}:${step.text}`);

describe('CycleHookRuntime', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let clock: number;

  const createRuntime = (definitions: CycleHookDefinition[]) =>
    new CycleHookRuntime({ definitions, execution, logger, now: () => clock });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    clock = 1_000;
  });

  describe('start', () => {
    it('calls getHandler once per definition with the execution context', async () => {
      const getHandler = jest.fn(() => undefined);
      const runtime = createRuntime([{ id: 'a', getHandler }]);

      await runtime.start();
      await runtime.dispatch(facts(0));
      await runtime.dispatch(facts(1));

      expect(getHandler).toHaveBeenCalledTimes(1);
      expect(getHandler).toHaveBeenCalledWith(execution);
    });

    it('skips a hook whose getHandler returns undefined', async () => {
      const handler = jest.fn();
      const runtime = createRuntime([{ id: 'a', getHandler: () => undefined }, hook('b', handler)]);

      await runtime.start();
      await runtime.dispatch(facts(0));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('logs and skips a hook whose getHandler returns something else', async () => {
      const runtime = createRuntime([
        { id: 'bad', getHandler: () => 'nope' as unknown as CycleHandler },
      ]);

      await runtime.start();
      const updates = await runtime.dispatch(facts(0));

      expect(updates).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('"bad"'));
    });

    it('logs and skips a hook whose getHandler throws, and keeps the others', async () => {
      const handler = jest.fn();
      const runtime = createRuntime([
        {
          id: 'boom',
          getHandler: () => {
            throw new Error('setup failed');
          },
        },
        hook('ok', handler),
      ]);

      await runtime.start();
      await runtime.dispatch(facts(0));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('setup failed'));
    });
  });

  describe('schedule', () => {
    it('calls an unscheduled hook at every cycle', async () => {
      const handler = jest.fn();
      const runtime = createRuntime([hook('a', handler)]);
      await runtime.start();

      for (const cycle of [0, 1, 2]) {
        await runtime.dispatch(facts(cycle));
      }

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('calls an everyCycles hook before cycles n, 2n, 3n only', async () => {
      const seen: number[] = [];
      const runtime = createRuntime([
        hook('a', (cycle) => void seen.push(cycle.index), { when: { everyCycles: 3 } }),
      ]);
      await runtime.start();

      for (let cycle = 0; cycle <= 7; cycle++) {
        await runtime.dispatch(facts(cycle));
      }

      expect(seen).toEqual([3, 6]);
    });

    it('calls a first hook during start, lands its note at cycle 0, and never again', async () => {
      const handler = jest.fn(async (_cycle, api) => {
        await api.append({ text: 'early' });
      });
      const runtime = createRuntime([hook('a', handler, { when: 'first' })]);

      await runtime.start();
      await new Promise((resolve) => setImmediate(resolve)); // the early call is started, not awaited
      expect(handler).toHaveBeenCalledTimes(1);

      const atZero = await runtime.dispatch(facts(0));
      const atOne = await runtime.dispatch(facts(1));

      expect(texts(applyStepUpdates([], atZero))).toEqual(['a:early']);
      expect(atOne).toEqual([]);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not create a first hook on a resumed execution, and still runs the others', async () => {
      const firstGetHandler = jest.fn(() => jest.fn());
      const every = jest.fn();
      const runtime = new CycleHookRuntime({
        definitions: [
          { id: 'first', when: 'first', getHandler: firstGetHandler },
          hook('every', every),
        ],
        execution: resumedExecution,
        logger,
        now: () => clock,
      });

      await runtime.start();
      await runtime.dispatch(facts(3));

      expect(firstGetHandler).not.toHaveBeenCalled();
      expect(every).toHaveBeenCalledTimes(1);
    });

    it('runs early first hooks one after another, in registration order', async () => {
      let releaseSlow: () => void = () => {};
      const order: string[] = [];
      let seenBySecond: string[] = [];
      const runtime = createRuntime([
        hook(
          'slow',
          async (_cycle, api) => {
            await new Promise<void>((resolve) => {
              releaseSlow = resolve;
            });
            order.push('slow');
            await api.append({ text: 'from slow' });
          },
          { when: 'first' }
        ),
        hook(
          'fast',
          async (cycle, api) => {
            order.push('fast');
            seenBySecond = texts(cycle.steps);
            await api.append({ text: 'from fast' });
          },
          { when: 'first' }
        ),
      ]);

      await runtime.start();
      await new Promise((resolve) => setImmediate(resolve));
      expect(order).toEqual([]); // the fast hook waits for the slow one

      releaseSlow();
      const steps = applyStepUpdates([], await runtime.dispatch(facts(0)));

      expect(order).toEqual(['slow', 'fast']);
      expect(seenBySecond).toEqual(['slow:from slow']);
      expect(texts(steps)).toEqual(['slow:from slow', 'fast:from fast']);
    });

    it('hands the seed steps to the early call', async () => {
      const seed = [reasoning('seed')];
      let seen: ConversationRoundStep[] = [];
      const runtime = createRuntime([
        hook('a', (cycle) => void (seen = [...cycle.steps]), { when: 'first' }),
      ]);

      await runtime.start(seed);
      await runtime.dispatch(facts(0));

      expect(seen).toEqual(seed);
    });

    it('never calls handlers on a retry, but still drains queued notes', async () => {
      const handler = jest.fn();
      const runtime = createRuntime([hook('a', handler)]);
      await runtime.start();
      await runtime.dispatch(facts(0));

      const updates = await runtime.dispatch(facts(0, { attempt: 1 }));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(updates).toEqual([]);
    });

    it('runs hooks in definition order', async () => {
      const order: string[] = [];
      const runtime = createRuntime([
        hook('second', () => void order.push('second')),
        hook('first', () => void order.push('first')),
      ]);
      await runtime.start();

      await runtime.dispatch(facts(0));

      expect(order).toEqual(['second', 'first']);
    });
  });

  describe('append', () => {
    it('returns notes appended during the call as injected_context updates stamped with the hook id', async () => {
      const runtime = createRuntime([
        hook('memory', async (_cycle, api) => {
          await api.append({ text: 'one', data: { k: 1 }, pin: 'round' });
          await api.append({ text: 'two' });
        }),
      ]);
      await runtime.start();

      const steps = applyStepUpdates([], await runtime.dispatch(facts(0)));

      expect(appended(steps)).toEqual([
        {
          type: ConversationRoundStepType.injectedContext,
          hook_id: 'memory',
          text: 'one',
          data: { k: 1 },
          pin: 'round',
        },
        { type: ConversationRoundStepType.injectedContext, hook_id: 'memory', text: 'two' },
      ]);
    });

    it('does not let a hook forge the hook id', async () => {
      const runtime = createRuntime([
        hook('honest', async (_cycle, api) => {
          await api.append({ text: 'x', hook_id: 'forged' } as never);
        }),
      ]);
      await runtime.start();

      const steps = applyStepUpdates([], await runtime.dispatch(facts(0)));

      expect(appended(steps)[0].hook_id).toBe('honest');
    });

    it('queues a note appended after the handler returned for the next cycle', async () => {
      let resolveLater: () => void = () => {};
      const runtime = createRuntime([
        hook('bg', (_cycle, api) => {
          void new Promise<void>((resolve) => {
            resolveLater = resolve;
          }).then(() => api.append({ text: 'late' }));
        }),
      ]);
      await runtime.start();

      const atZero = await runtime.dispatch(facts(0));
      resolveLater();
      await new Promise((resolve) => setImmediate(resolve));
      const atOne = await runtime.dispatch(facts(1));

      expect(atZero).toEqual([]);
      expect(texts(applyStepUpdates([], atOne))).toEqual(['bg:late']);
    });

    it('puts queued notes ahead of what the handlers append this cycle', async () => {
      let resolveLater: () => void = () => {};
      const runtime = createRuntime([
        hook('bg', (cycle, api) => {
          if (cycle.index === 0) {
            void new Promise<void>((resolve) => {
              resolveLater = resolve;
            }).then(() => api.append({ text: 'queued' }));
            return;
          }
          return api.append({ text: 'now' });
        }),
      ]);
      await runtime.start();
      await runtime.dispatch(facts(0));
      resolveLater();
      await new Promise((resolve) => setImmediate(resolve));

      const atOne = await runtime.dispatch(facts(1));

      expect(texts(applyStepUpdates([], atOne))).toEqual(['bg:queued', 'bg:now']);
    });

    it('rejects an append once the runtime is closed', async () => {
      let api: Parameters<CycleHandler>[1] | undefined;
      const runtime = createRuntime([hook('a', (_cycle, hookApi) => void (api = hookApi))]);
      await runtime.start();
      await runtime.dispatch(facts(0));

      runtime.close();

      await expect(api!.append({ text: 'too late' })).rejects.toThrow(/the run has finished/);
    });

    it('rejects empty text and text over the cap, and the handler can catch it', async () => {
      const errors: string[] = [];
      const runtime = createRuntime([
        hook('a', async (_cycle, api) => {
          for (const text of ['', '   ', 'x'.repeat(MODEL_CONTEXT_MAX_LENGTH + 1)]) {
            await api.append({ text }).catch((err: Error) => errors.push(err.message));
          }
          await api.append({ text: 'fine' });
        }),
      ]);
      await runtime.start();

      const steps = applyStepUpdates([], await runtime.dispatch(facts(0)));

      expect(errors).toEqual([
        expect.stringContaining('non-empty string'),
        expect.stringContaining('non-empty string'),
        expect.stringContaining(`exceeds ${MODEL_CONTEXT_MAX_LENGTH} characters`),
      ]);
      expect(texts(steps)).toEqual(['a:fine']);
    });
  });

  describe('cycle context', () => {
    it("exposes the index, the steps so far including this cycle's notes, and the summary", async () => {
      const existing = [reasoning('r')];
      const summary = { summarized_round_count: 1 } as CycleDispatchFacts['summary'];
      let observed: { index: number; stepCount: number; summary: unknown } | undefined;
      const runtime = createRuntime([
        hook('a', async (cycle, api) => {
          await api.append({ text: 'mine' });
          observed = { index: cycle.index, stepCount: cycle.steps.length, summary: cycle.summary };
        }),
      ]);
      await runtime.start();

      await runtime.dispatch(facts(4, { steps: existing, summary }));

      expect(observed).toEqual({ index: 4, stepCount: 2, summary });
    });

    it("exposes the previous cycle's tool calls as the last tool-call group", async () => {
      const steps = [
        toolCall('c1', 'g1'),
        reasoning('between'),
        toolCall('c2', 'g2'),
        toolCall('c3', 'g2'),
      ];
      let ids: string[] = [];
      const runtime = createRuntime([
        hook('a', (cycle) => void (ids = cycle.previousToolCalls.map((c) => c.tool_call_id))),
      ]);
      await runtime.start();

      await runtime.dispatch(facts(1, { steps }));

      expect(ids).toEqual(['c2', 'c3']);
    });

    it('reports time since start and since the hook last appended', async () => {
      const timings: Array<{ sinceStartMs: number; sinceLastAppendMs?: number }> = [];
      const runtime = createRuntime([
        hook('a', async (cycle, api) => {
          timings.push({ ...cycle.timing });
          if (cycle.index === 0) await api.append({ text: 'note' });
        }),
      ]);
      await runtime.start();

      clock = 1_500;
      await runtime.dispatch(facts(0));
      clock = 4_000;
      await runtime.dispatch(facts(1));

      expect(timings).toEqual([
        { sinceStartMs: 500, sinceLastAppendMs: undefined },
        { sinceStartMs: 3_000, sinceLastAppendMs: 2_500 },
      ]);
    });
  });

  describe('failures', () => {
    it('skips a handler that throws, logs it, and runs the next hook', async () => {
      const handler = jest.fn();
      const runtime = createRuntime([
        hook('boom', () => {
          throw new Error('handler failed');
        }),
        hook('ok', handler),
      ]);
      await runtime.start();

      await runtime.dispatch(facts(0));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('handler failed'));
    });

    it('skips a handler that outruns its timeout and keeps calling it on later cycles', async () => {
      const calls: number[] = [];
      const runtime = createRuntime([
        hook(
          'slow',
          (cycle) => {
            calls.push(cycle.index);
            return new Promise(() => {});
          },
          { timeout: 20 }
        ),
      ]);
      await runtime.start();

      await runtime.dispatch(facts(0));
      await runtime.dispatch(facts(1));

      expect(calls).toEqual([0, 1]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('timed out after 20ms'));
    });

    it('keeps a note a handler appended before it failed', async () => {
      const runtime = createRuntime([
        hook('a', async (_cycle, api) => {
          await api.append({ text: 'kept' });
          throw new Error('after append');
        }),
      ]);
      await runtime.start();

      const steps = applyStepUpdates([], await runtime.dispatch(facts(0)));

      expect(texts(steps)).toEqual(['a:kept']);
    });
  });
});
