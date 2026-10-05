/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  createHooksExecutionError,
  createRequestAbortedError,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import { withTimeout } from '@kbn/std';
import type {
  AfterChatEventHookContext,
  HookContext,
  HookRegistration,
  HooksServiceStart,
} from '@kbn/agent-builder-server';
import {
  applyHookResultByLifecycle,
  HookExecutionMode,
  HookLifecycle,
} from '@kbn/agent-builder-server';
import {
  isHooksExecutionError,
  isWorkflowAbortedError,
  isWorkflowExecutionError,
} from '@kbn/agent-builder-common/base/errors';
import { orderBy } from 'lodash';

/** Default maximum execution time for a hook when timeout is not configured (5 minutes). */
const DEFAULT_HOOK_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Default maximum execution time for an `afterChatEvent` hook. Events queue behind an event whose
 * hooks are running, so these hooks must be fast.
 */
const AFTER_CHAT_EVENT_HOOK_TIMEOUT_MS = 10 * 1000;

/** After hooks run in reverse order so they nest like LangChain (last before = first after). */
const AFTER_EVENTS: HookLifecycle[] = [
  HookLifecycle.afterToolCall,
  HookLifecycle.afterExecution,
  HookLifecycle.afterChatEvent,
];

type AfterChatEventHookRegistration = HookRegistration<HookLifecycle.afterChatEvent>;

const runsOnEventType = (hook: object, eventType: ChatEvent['type']): boolean =>
  (hook as AfterChatEventHookRegistration).eventTypes.some((type) => type === eventType);

const isAfterEvent = (event: HookLifecycle): boolean => AFTER_EVENTS.includes(event);

const normalizeHookError = <E extends HookLifecycle>(
  hookLifecycle: E,
  hook: { id: string; mode: HookExecutionMode },
  err: unknown
) => {
  if (isHooksExecutionError(err) || isWorkflowAbortedError(err) || isWorkflowExecutionError(err)) {
    return err;
  }

  return createHooksExecutionError(
    err instanceof Error ? err.message : String(err),
    hookLifecycle,
    hook.id,
    hook.mode
  );
};

export interface CreateHooksRunnerDeps {
  logger: Logger;
  /** Returns all hook registrations for a given lifecycle (no filtering by mode). */
  getHooksForLifecycle: (lifecycle: HookLifecycle) => Array<HookRegistration<HookLifecycle>>;
}

function getRelevantHooks<E extends HookLifecycle>(
  getHooksForLifecycle: CreateHooksRunnerDeps['getHooksForLifecycle'],
  lifecycle: E,
  mode: HookExecutionMode,
  context: HookContext<E>
): Array<HookRegistration<E>> {
  const hooks = getHooksForLifecycle(lifecycle) as Array<HookRegistration<E>>;
  const filtered = hooks.filter(
    (h) =>
      h.mode === mode &&
      (lifecycle !== HookLifecycle.afterChatEvent ||
        runsOnEventType(h, (context as AfterChatEventHookContext).event.type))
  );
  const sorted = orderBy(filtered, [(h) => h.priority ?? 0], ['desc']);
  return isAfterEvent(lifecycle) ? sorted.reverse() : sorted;
}

/**
 * Factory that creates the hooks runner (run function).
 * It runs blocking hooks first, then non-blocking hooks.
 */
export function createHooksRunner(deps: CreateHooksRunnerDeps): HooksServiceStart {
  const { logger, getHooksForLifecycle } = deps;
  const getRelevant = <E extends HookLifecycle>(
    lifecycle: E,
    mode: HookExecutionMode,
    context: HookContext<E>
  ) => getRelevantHooks(getHooksForLifecycle, lifecycle, mode, context);

  const runBlocking = async <E extends HookLifecycle>(
    lifecycle: E,
    context: HookContext<E>
  ): Promise<HookContext<E>> => {
    const hooks = getRelevant(lifecycle, HookExecutionMode.blocking, context);
    let currentContext: HookContext<E> = context;

    for (const hook of hooks) {
      if ('abortSignal' in currentContext && currentContext.abortSignal?.aborted) {
        throw createRequestAbortedError('Request aborted while executing hooks', {
          hookLifecycle: lifecycle,
          hookId: hook.id,
        });
      }

      try {
        const defaultTimeoutMs =
          lifecycle === HookLifecycle.afterChatEvent
            ? AFTER_CHAT_EVENT_HOOK_TIMEOUT_MS
            : DEFAULT_HOOK_TIMEOUT_MS;
        const timeoutMs =
          hook.mode === HookExecutionMode.blocking && 'timeout' in hook
            ? hook.timeout ?? defaultTimeoutMs
            : defaultTimeoutMs;
        const timed = await withTimeout({
          promise: (async () => hook.handler(currentContext))(),
          timeoutMs,
        });
        if (timed.timedout) {
          throw createHooksExecutionError(
            `Hook execution timed out after ${timeoutMs}ms`,
            lifecycle,
            hook.id,
            hook.mode
          );
        }
        currentContext = applyHookResultByLifecycle[lifecycle](currentContext, timed.value);
      } catch (err) {
        throw normalizeHookError(lifecycle, hook, err);
      }
    }

    return currentContext;
  };

  const runNonBlocking = <E extends HookLifecycle>(lifecycle: E, context: HookContext<E>): void => {
    const hooks = getRelevant(lifecycle, HookExecutionMode.nonBlocking, context);
    for (const hook of hooks) {
      // Fire-and-forget. Must never throw to the caller.
      Promise.resolve()
        .then(() => hook.handler(context))
        .catch((err) => {
          const normalized = normalizeHookError(lifecycle, hook, err);
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

  const handles: HooksServiceStart['handles'] = (lifecycle, eventType) =>
    getHooksForLifecycle(lifecycle).some((hook) => runsOnEventType(hook, eventType));

  return { run, handles };
}
