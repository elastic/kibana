/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { createBadRequestError, createRequestAbortedError } from '@kbn/agent-builder-common';
import { withTimeout } from '@kbn/std';
import type {
  HookContext,
  HookRegistration,
  HooksServiceSetup,
  HooksServiceStart,
} from '@kbn/agent-builder-server';
import {
  applyHookResultByEvent,
  HookExecutionMode,
  HookLifecycle,
} from '@kbn/agent-builder-server';
import { orderBy } from 'lodash';
import {
  createHooksExecutionError,
  isHooksExecutionError,
} from '@kbn/agent-builder-common/base/errors';

export interface HooksServiceSetupDeps {
  logger: Logger;
}

/** Default maximum execution time for a hook when timeout is not configured (5 minutes). */
const DEFAULT_HOOK_TIMEOUT_MS = 5 * 60 * 1000;

/** After hooks run in reverse order so they nest like LangChain (last before = first after). */
const AFTER_EVENTS: HookLifecycle[] = [HookLifecycle.afterAgent, HookLifecycle.afterToolCall];

const isAfterEvent = (event: HookLifecycle): boolean => AFTER_EVENTS.includes(event);

type BlockingHookRegistration<E extends HookLifecycle> = Extract<
  HookRegistration<E>,
  { mode: HookExecutionMode.blocking }
>;
type NonBlockingHookRegistration<E extends HookLifecycle> = Extract<
  HookRegistration<E>,
  { mode: HookExecutionMode.nonBlocking }
>;

const normalizeHookError = <E extends HookLifecycle>(
  hookLifecycle: E,
  hook: Pick<HookRegistration<E>, 'id' | 'mode'>,
  err: unknown
) => {
  if (isHooksExecutionError(err)) {
    return err;
  }

  return createHooksExecutionError(
    err instanceof Error ? err.message : String(err),
    hookLifecycle,
    hook.id,
    hook.mode
  );
};

export class HooksService {
  private setupDeps?: HooksServiceSetupDeps;

  private readonly registrationsByEvent = new Map<
    HookLifecycle,
    Array<HookRegistration<HookLifecycle>>
  >();

  setup(deps: HooksServiceSetupDeps): HooksServiceSetup {
    this.setupDeps = deps;

    for (const lifecycle of Object.values(HookLifecycle)) {
      this.registrationsByEvent.set(lifecycle, []);
    }

    return {
      register: (bundle) => {
        for (const [lifeCycle, entry] of Object.entries(bundle.hooks)) {
          const lifeCycleId = `${bundle.id}-${lifeCycle}`;
          const hooksLifecycleEntries = this.registrationsByEvent.get(lifeCycle as HookLifecycle);

          if (!hooksLifecycleEntries) {
            throw new Error(`Hook lifecycle "${lifeCycle}" was not initialized in setup`);
          }
          if (hooksLifecycleEntries.some((r) => r.id === lifeCycleId)) {
            throw new Error(
              `Hook with id "${lifeCycleId}" is already registered for event "${lifeCycle}".`
            );
          }

          hooksLifecycleEntries.push({
            ...entry,
            id: lifeCycleId,
            priority: bundle.priority,
          } as HookRegistration<HookLifecycle>);
        }
      },
    };
  }

  private getRelevantHooks<E extends HookLifecycle>(
    lifecycle: E,
    mode: HookExecutionMode.blocking,
    context: HookContext<E>
  ): Array<BlockingHookRegistration<E>>;
  private getRelevantHooks<E extends HookLifecycle>(
    lifecycle: E,
    mode: HookExecutionMode.nonBlocking,
    context: HookContext<E>
  ): Array<NonBlockingHookRegistration<E>>;
  private getRelevantHooks<E extends HookLifecycle>(
    lifecycle: E,
    mode: HookExecutionMode,
    context: HookContext<E>
  ): Array<HookRegistration<E>> {
    const hooks = (this.registrationsByEvent.get(lifecycle) ?? []) as unknown as Array<
      HookRegistration<E>
    >;

    const filtered = hooks.filter((h) => h.mode === mode);
    const sorted = orderBy(filtered, [(h) => h.priority ?? 0], ['desc']);
    return isAfterEvent(lifecycle) ? sorted.reverse() : sorted;
  }

  start(): HooksServiceStart {
    if (!this.setupDeps) {
      throw new Error('#start called before #setup');
    }

    const logger = this.setupDeps.logger.get('hooks');

    const runBlocking = async <E extends HookLifecycle>(
      lifecycle: E,
      context: HookContext<E>
    ): Promise<HookContext<E>> => {
      const hooks = this.getRelevantHooks(lifecycle, HookExecutionMode.blocking, context);
      let currentContext: HookContext<E> = context;

      for (const hook of hooks) {
        if ('abortSignal' in currentContext && currentContext.abortSignal?.aborted) {
          throw createRequestAbortedError('Request aborted while executing hooks', {
            hookLifecycle: lifecycle,
            hookId: hook.id,
          });
        }

        try {
          const timeoutMs = hook.timeout ?? DEFAULT_HOOK_TIMEOUT_MS;
          const timed = await withTimeout({
            promise: (async () => hook.handler(currentContext))(),
            timeoutMs,
          });
          if (timed.timedout) {
            throw createBadRequestError(`Hook "${hook.id}" timed out after ${timeoutMs}ms`, {
              hookLifecycle: lifecycle,
              hookId: hook.id,
            });
          }
          currentContext = applyHookResultByEvent[lifecycle](currentContext, timed.value);
        } catch (err) {
          throw normalizeHookError(lifecycle, hook, err);
        }
      }

      return currentContext;
    };

    const runNonBlocking = <E extends HookLifecycle>(
      lifecycle: E,
      context: HookContext<E>
    ): void => {
      const hooks = this.getRelevantHooks(lifecycle, HookExecutionMode.nonBlocking, context);
      for (const hook of hooks) {
        // Fire-and-forget. Must never throw to the caller.
        Promise.resolve()
          .then(() => hook.handler(context))
          .catch((err) => {
            const normalized = normalizeHookError(lifecycle, hook, err);
            // Log and swallow the error
            logger.error(`Non-blocking hook "${hook.id}" failed: ${normalized.message}`);
          });
      }
    };

    const run: HooksServiceStart['run'] = async <E extends HookLifecycle>(
      lifecycle: E,
      context: HookContext<E>
    ): Promise<HookContext<E>> => {
      const updated = await runBlocking(lifecycle, context);
      runNonBlocking(lifecycle, updated);
      return updated;
    };

    return { run };
  }
}
