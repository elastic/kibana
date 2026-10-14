/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { Logger } from '@kbn/logging';
import { withTimeout } from '@kbn/std';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import type {
  CompactionSummary,
  ConversationRoundStep,
  ToolCallStep,
} from '@kbn/agent-builder-common';
import { MODEL_CONTEXT_MAX_LENGTH, createInjectedContextStep } from '@kbn/agent-builder-common';
import type {
  CycleContext,
  CycleHandler,
  CycleHookApi,
  CycleHookDefinition,
  CycleHookExecutionContext,
  CycleTrigger,
  InjectedContextInput,
} from '@kbn/agent-builder-server';
import {
  DEFAULT_CYCLE_HOOK_TIMEOUT_MS,
  MAX_CYCLE_HOOK_TIMEOUT_MS,
} from '@kbn/agent-builder-server';
import { applyStepUpdates, stepUpdates, type RunStepUpdate } from '../step_state';
import { groupToolCallSteps } from '../utils/render_steps_to_messages';

/** What the graph knows at the top of a cycle, before the model request. */
export interface CycleDispatchFacts {
  cycle: number;
  /** 0 for the cycle's first request, 1+ for a retry. Handlers are never called on a retry. */
  attempt: number;
  steps: ConversationRoundStep[];
  summary?: CompactionSummary;
}

export interface CycleHookRuntimeDeps {
  /** In the order they should run. */
  definitions: CycleHookDefinition[];
  execution: CycleHookExecutionContext;
  logger: Logger;
  /** Epoch ms clock, injectable for tests. */
  now?: () => number;
}

interface ActiveHook {
  def: CycleHookDefinition;
  handler: CycleHandler;
  /** The last cycle the handler was called for; -1 until the first call. */
  lastRunCycle: number;
  /** When the hook last appended a note, for `timing.sinceLastAppendMs`. */
  lastAppendAt?: number;
  /** Set for a hook called in `start()`: the call, and what it appended during it. */
  early?: { done: Promise<void>; out: RunStepUpdate[] };
  /** The handler's current call until it settles; a timed-out call keeps running in the background. */
  running?: Promise<void>;
}

interface QueuedNote {
  hookId: string;
  update: RunStepUpdate;
}

const noop = () => {};

/**
 * Runs the cycle hooks of one agent execution: creates their handlers once, calls the due ones at
 * each cycle, and collects the `injected_context` steps they append as step updates for the graph.
 *
 * Hooks run in registration order, and each one sees what the hooks before it appended.
 */
export class CycleHookRuntime {
  private readonly hooks: ActiveHook[] = [];
  private readonly queue: QueuedNote[] = [];
  private closed = false;
  private readonly now: () => number;
  private readonly startedAt: number;

  constructor(private readonly deps: CycleHookRuntimeDeps) {
    this.now = deps.now ?? Date.now;
    this.startedAt = this.now();
  }

  /**
   * Creates the handlers of the hooks that apply to this agent, all at once.
   *
   * A hook due before the first model call (`'first'`, `'every_execution'`) is called right away,
   * so its work overlaps whatever runs before the first cycle, unless an every-cycle hook was
   * registered before it: that one can only run at cycle 0, and the early hook then takes its turn
   * there. Early calls run one after another; `dispatch` waits for them and lands their notes at
   * the hooks' positions. `summary` is the compaction summary the first model call will use.
   */
  async start(seedSteps: ConversationRoundStep[] = [], summary?: CompactionSummary): Promise<void> {
    const { execution } = this.deps;
    const definitions = this.deps.definitions.filter((def) => {
      if (def.boundAgents && !def.boundAgents.includes(execution.agent.id)) {
        return false;
      }
      // Once per round: the paused round being resumed already carries what the hook added.
      return !(def.when === 'first' && execution.execution.resumed);
    });
    const handlers = await Promise.all(
      definitions.map((def) =>
        this.guarded(def, 'getHandler', () => def.getHandler(execution)).then(({ value }) => value)
      )
    );

    let chain: Promise<void> = Promise.resolve();
    const earlyOuts: RunStepUpdate[][] = [];
    let cycleZeroHookSeen = false;
    for (const [index, def] of definitions.entries()) {
      const handler = handlers[index];
      if (handler === undefined) {
        continue;
      }
      if (typeof handler !== 'function') {
        this.deps.logger.error(
          `Cycle hook "${def.id}": getHandler must return a function or undefined, skipped.`
        );
        continue;
      }
      const hook: ActiveHook = { def, handler, lastRunCycle: -1 };
      this.hooks.push(hook);
      const when = def.when ?? 'every_cycle';
      if (!isOncePerExecution(when)) {
        if (when === 'every_cycle') {
          cycleZeroHookSeen = true;
        }
        continue;
      }
      if (cycleZeroHookSeen) {
        continue;
      }
      hook.lastRunCycle = 0;
      const before = [...earlyOuts];
      const out: RunStepUpdate[] = [];
      earlyOuts.push(out);
      chain = chain.then(() =>
        this.call(
          hook,
          { cycle: 0, attempt: 0, steps: applyStepUpdates(seedSteps, before.flat()), summary },
          out
        )
      );
      hook.early = { done: chain, out };
    }
  }

  /**
   * Returns the step updates to fold into the state before this cycle's prompt is rendered: the
   * notes queued since the last cycle, then, hook by hook, what an early call appended or what the
   * handler appends now. A retry only drains the queue. A hook whose previous call is still running
   * is skipped, so a handler never runs twice at once.
   */
  async dispatch(facts: CycleDispatchFacts): Promise<RunStepUpdate[]> {
    const out = this.queue.splice(0).map((note) => note.update);
    for (const hook of this.hooks) {
      if (hook.early) {
        const { done, out: earlyOut } = hook.early;
        hook.early = undefined;
        await done;
        out.push(...earlyOut);
        continue;
      }
      if (facts.attempt > 0 || !isDue(hook, facts.cycle)) {
        continue;
      }
      if (hook.running) {
        this.deps.logger.warn(
          `Cycle hook "${hook.def.id}": the previous call is still running, skipped at cycle ${facts.cycle}.`
        );
        continue;
      }
      await this.call(hook, facts, out);
      hook.lastRunCycle = facts.cycle;
    }
    return out;
  }

  /** After this, `append` throws: the run is over and there is no prompt left to land in. */
  close(): void {
    this.closed = true;
    if (this.queue.length > 0) {
      const hookIds = Array.from(new Set(this.queue.map((note) => `"${note.hookId}"`)));
      this.deps.logger.debug(
        `Cycle hooks: ${
          this.queue.length
        } queued note(s) dropped at the end of the run, from ${hookIds.join(', ')}.`
      );
      this.queue.length = 0;
    }
  }

  private async call(hook: ActiveHook, facts: CycleDispatchFacts, out: RunStepUpdate[]) {
    const { id } = hook.def;
    const { abortSignal: executionSignal } = this.deps.execution;
    // The call's own signal: aborted when it times out, and with the execution.
    const controller = new AbortController();
    const abortWithExecution = () => controller.abort(executionSignal.reason);
    if (executionSignal.aborted) {
      abortWithExecution();
    } else {
      executionSignal.addEventListener('abort', abortWithExecution, { once: true });
    }
    // While the handler runs, appended rows go into this cycle's prompt. Once it has returned or
    // timed out, a late append (from a promise it started) is queued for the next cycle instead.
    let inCall = true;
    const api: CycleHookApi = {
      append: (input) => {
        const update = this.toUpdate(id, input);
        hook.lastAppendAt = this.now();
        if (inCall) {
          out.push(update);
        } else {
          this.queue.push({ hookId: id, update });
        }
      },
    };
    const now = this.now();
    // The handler gets copies: nothing it does to them reaches the run. The steps are copied once
    // per call; a read after an append only re-applies the notes.
    let base: ConversationRoundStep[] | undefined;
    let steps: { appended: number; value: ConversationRoundStep[] } | undefined;
    let previousToolCalls: ToolCallStep[] | undefined;
    const cycle: CycleContext = {
      index: facts.cycle,
      abortSignal: controller.signal,
      timing: {
        sinceStartMs: now - this.startedAt,
        sinceLastAppendMs: hook.lastAppendAt === undefined ? undefined : now - hook.lastAppendAt,
      },
      get steps() {
        if (!base) {
          base = cloneDeep(facts.steps);
        }
        if (steps?.appended !== out.length) {
          steps = { appended: out.length, value: applyStepUpdates(base, cloneDeep(out)) };
        }
        return steps.value;
      },
      get previousToolCalls() {
        if (!previousToolCalls) {
          previousToolCalls = cloneDeep(lastToolCallGroup(facts.steps));
        }
        return previousToolCalls;
      },
      summary: cloneDeep(facts.summary),
    };
    const run = Promise.resolve().then(() => hook.handler(cycle, api));
    hook.running = run.then(noop, noop).finally(() => {
      hook.running = undefined;
    });
    try {
      const { timedOut } = await this.guarded(hook.def, 'handler', () => run, facts.cycle);
      if (timedOut) {
        controller.abort(new Error(`Cycle hook "${id}" timed out.`));
      }
    } finally {
      inCall = false;
      executionSignal.removeEventListener('abort', abortWithExecution);
    }
  }

  private toUpdate(hookId: string, input: InjectedContextInput): RunStepUpdate {
    if (this.closed) {
      throw new Error(`Cycle hook "${hookId}": the run has finished, the note was dropped.`);
    }
    if (typeof input.text !== 'string' || input.text.trim().length === 0) {
      throw new Error(`Cycle hook "${hookId}": text must be a non-empty string.`);
    }
    if (input.text.length > MODEL_CONTEXT_MAX_LENGTH) {
      throw new Error(
        `Cycle hook "${hookId}": text exceeds ${MODEL_CONTEXT_MAX_LENGTH} characters.`
      );
    }
    return stepUpdates.append(createInjectedContextStep({ ...input, hook_id: hookId }));
  }

  /**
   * One span per call. A throw or a timeout is logged and yields no value; the run goes on. A
   * timed-out call is reported as such so the caller can abort its signal.
   */
  private async guarded<T>(
    def: CycleHookDefinition,
    kind: 'getHandler' | 'handler',
    fn: () => T | Promise<T>,
    cycle?: number
  ): Promise<{ value?: T; timedOut: boolean }> {
    const { id } = def;
    const timeoutMs = Math.min(
      def.timeout ?? DEFAULT_CYCLE_HOOK_TIMEOUT_MS,
      MAX_CYCLE_HOOK_TIMEOUT_MS
    );
    return withActiveInferenceSpan(
      `cycle_hook ${id}`,
      {
        attributes: {
          [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
          'hook.id': id,
          'hook.call': kind,
          ...(cycle === undefined ? {} : { 'hook.cycle': cycle }),
        },
      },
      async () => {
        try {
          const timed = await withTimeout({ promise: Promise.resolve().then(fn), timeoutMs });
          if (timed.timedout) {
            this.deps.logger.warn(
              `Cycle hook "${id}" ${kind} timed out after ${timeoutMs}ms, skipped.`
            );
            return { timedOut: true };
          }
          return { value: timed.value, timedOut: false };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.deps.logger.warn(`Cycle hook "${id}" ${kind} failed, skipped: ${message}`);
          return { timedOut: false };
        }
      }
    );
  }
}

const isOncePerExecution = (when: CycleTrigger): when is 'first' | 'every_execution' =>
  when === 'first' || when === 'every_execution';

const isDue = (hook: ActiveHook, cycle: number): boolean => {
  const when: CycleTrigger = hook.def.when ?? 'every_cycle';
  if (when === 'every_cycle') {
    return true;
  }
  if (isOncePerExecution(when)) {
    return hook.lastRunCycle < 0;
  }
  return cycle > 0 && cycle % when.everyCycles === 0;
};

const lastToolCallGroup = (steps: ConversationRoundStep[]): ToolCallStep[] =>
  groupToolCallSteps(steps).at(-1) ?? [];
