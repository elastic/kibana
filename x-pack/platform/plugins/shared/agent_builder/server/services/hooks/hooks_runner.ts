/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { createHooksExecutionError, createRequestAbortedError } from '@kbn/agent-builder-common';
import { withTimeout } from '@kbn/std';
import type { HookContext, HookRegistration, HooksServiceStart } from '@kbn/agent-builder-server';
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

const DEFAULT_HOOK_TIMEOUT_MS = 2 * 60 * 1000;

interface HookLifecycleConfig {
  /** `after` hooks run last to first, so they nest like LangChain (last before = first after). */
  phase: 'before' | 'after';
  /** Maximum execution time of a blocking hook that doesn't set `timeout`. */
  defaultTimeoutMs: number;
}

const LIFECYCLE_CONFIG: Record<HookLifecycle, HookLifecycleConfig> = {
  [HookLifecycle.beforeAgent]: { phase: 'before', defaultTimeoutMs: DEFAULT_HOOK_TIMEOUT_MS },
  [HookLifecycle.beforeToolCall]: { phase: 'before', defaultTimeoutMs: DEFAULT_HOOK_TIMEOUT_MS },
  [HookLifecycle.afterToolCall]: { phase: 'after', defaultTimeoutMs: DEFAULT_HOOK_TIMEOUT_MS },
  [HookLifecycle.afterExecution]: { phase: 'after', defaultTimeoutMs: DEFAULT_HOOK_TIMEOUT_MS },
  // Events queue behind an event whose hooks are running, so these hooks must be fast.
  [HookLifecycle.afterChatEvent]: { phase: 'after', defaultTimeoutMs: 10 * 1000 },
};

const normalizeHookError = <E extends HookLifecycle>(
  hookLifecycle: E,
  hook: Pick<HookRegistration<E>, 'id' | 'mode'>,
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
  _context: HookContext<E>
): Array<HookRegistration<E>> {
  const hooks = getHooksForLifecycle(lifecycle) as Array<HookRegistration<E>>;
  const filtered = hooks.filter((h) => h.mode === mode);
  const sorted = orderBy(filtered, [(h) => h.priority ?? 0], ['desc']);
  return LIFECYCLE_CONFIG[lifecycle].phase === 'after' ? sorted.reverse() : sorted;
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
        const timeoutMs =
          ('timeout' in hook ? hook.timeout : undefined) ??
          LIFECYCLE_CONFIG[lifecycle].defaultTimeoutMs;
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

  return { run };
}
