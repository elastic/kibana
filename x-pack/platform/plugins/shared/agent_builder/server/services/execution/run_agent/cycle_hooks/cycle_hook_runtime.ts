/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  /** The call a `'first'` hook started in `start()`, awaited at the top of the first dispatch. */
  early?: Promise<void>;
}

/**
 * Runs the cycle hooks of one agent execution: creates their handlers once, calls the due ones at
 * each cycle, and collects the `injected_context` steps they append as step updates for the graph.
 */
export class CycleHookRuntime {
  private readonly hooks: ActiveHook[] = [];
  private readonly queue: RunStepUpdate[] = [];
  private closed = false;
  private readonly now: () => number;
  private readonly startedAt: number;

  constructor(private readonly deps: CycleHookRuntimeDeps) {
    this.now = deps.now ?? Date.now;
    this.startedAt = this.now();
  }

  /**
   * Creates the handlers. A `'first'` hook is called right away so its work overlaps whatever runs
   * before the first cycle; `dispatch` waits for it. Early calls run one after another, in
   * registration order, so a later hook sees what an earlier one appended.
   */
  async start(seedSteps: ConversationRoundStep[] = []): Promise<void> {
    let early: Promise<void> = Promise.resolve();
    for (const def of this.deps.definitions) {
      // Once per round: the paused round being resumed already carries what the hook added.
      if (def.when === 'first' && this.deps.execution.execution.resumed) {
        continue;
      }
      const handler = await this.guarded(def, 'getHandler', () =>
        def.getHandler(this.deps.execution)
      );
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
      if (def.when === 'first') {
        hook.lastRunCycle = 0;
        early = early.then(() =>
          this.call(hook, { cycle: 0, attempt: 0, steps: seedSteps }, this.queue)
        );
        hook.early = early;
      }
    }
  }

  /**
   * Returns the step updates to fold into the state before this cycle's prompt is rendered: notes
   * queued since the last cycle first, then what the due handlers append during their call.
   */
  async dispatch(facts: CycleDispatchFacts): Promise<RunStepUpdate[]> {
    for (const hook of this.hooks) {
      if (hook.early) {
        await hook.early;
        hook.early = undefined;
      }
    }
    const out = this.queue.splice(0);
    if (facts.attempt > 0) {
      return out;
    }
    for (const hook of this.hooks) {
      if (!isDue(hook, facts.cycle)) {
        continue;
      }
      await this.call(hook, facts, out);
      hook.lastRunCycle = facts.cycle;
    }
    return out;
  }

  /** After this, `append` rejects: the run is over and there is no prompt left to land in. */
  close(): void {
    this.closed = true;
  }

  private async call(hook: ActiveHook, facts: CycleDispatchFacts, out: RunStepUpdate[]) {
    const { id } = hook.def;
    // While the handler runs, appended rows go into this cycle's prompt. Once it has returned or
    // timed out, a late append (from a promise it started) is queued for the next cycle instead.
    let inCall = true;
    const api: CycleHookApi = {
      append: async (input) => {
        const update = this.toUpdate(id, input);
        hook.lastAppendAt = this.now();
        (inCall ? out : this.queue).push(update);
      },
    };
    const now = this.now();
    const cycle: CycleContext = {
      index: facts.cycle,
      timing: {
        sinceStartMs: now - this.startedAt,
        sinceLastAppendMs: hook.lastAppendAt === undefined ? undefined : now - hook.lastAppendAt,
      },
      get steps() {
        return applyStepUpdates(facts.steps, out);
      },
      previousToolCalls: lastToolCallGroup(facts.steps),
      summary: facts.summary,
    };
    try {
      await this.guarded(hook.def, 'handler', () => hook.handler(cycle, api), facts.cycle);
    } finally {
      inCall = false;
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

  /** One span per call. A throw or a timeout is logged and yields `undefined`; the run goes on. */
  private async guarded<T>(
    def: CycleHookDefinition,
    kind: 'getHandler' | 'handler',
    fn: () => T | Promise<T>,
    cycle?: number
  ): Promise<T | undefined> {
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
            return undefined;
          }
          return timed.value;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.deps.logger.warn(`Cycle hook "${id}" ${kind} failed, skipped: ${message}`);
          return undefined;
        }
      }
    );
  }
}

const isDue = (hook: ActiveHook, cycle: number): boolean => {
  const when: CycleTrigger = hook.def.when ?? 'every_cycle';
  if (when === 'every_cycle') {
    return true;
  }
  if (when === 'first') {
    return hook.lastRunCycle < 0;
  }
  return cycle > 0 && cycle % when.everyCycles === 0;
};

const lastToolCallGroup = (steps: ConversationRoundStep[]): ToolCallStep[] =>
  groupToolCallSteps(steps).at(-1) ?? [];
