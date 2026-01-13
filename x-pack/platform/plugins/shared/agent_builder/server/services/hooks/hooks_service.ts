/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  createBadRequestError,
  createRequestAbortedError,
  isAgentBuilderError,
} from '@kbn/agent-builder-common';
import type {
  HookContext,
  HookHandlerResult,
  HookRegistration,
  HooksServiceSetup,
  HooksServiceStart,
} from './types';
import { HookEvent, HookExecutionMode } from './types';

export interface HooksServiceSetupDeps {
  logger: Logger;
}

const sortByPriorityDesc = <R extends { priority?: number }>(a: R, b: R) => {
  return (b.priority ?? 0) - (a.priority ?? 0);
};

const hasAgentId = (
  context: HookContext<HookEvent>
): context is HookContext<HookEvent> & { agentId: string } => {
  const agentId = (context as unknown as { agentId?: unknown }).agentId;
  return typeof agentId === 'string' && agentId.length > 0;
};

const hasAbortController = (
  context: HookContext<HookEvent>
): context is HookContext<HookEvent> & { abortController: AbortController } => {
  const abortController = (context as unknown as { abortController?: unknown }).abortController;
  return abortController instanceof AbortController;
};

interface HookRegistrationLike {
  id: string;
  mode: HookExecutionMode;
}

const normalizeHookError = (event: HookEvent, hook: HookRegistrationLike, err: unknown) => {
  if (isAgentBuilderError(err)) {
    err.meta = {
      ...err.meta,
      hookEvent: event,
      hookId: hook.id,
      hookMode: hook.mode,
    };
    return err;
  }
  const error = err instanceof Error ? err : new Error(String(err));
  return createBadRequestError(error.message, {
    hookEvent: event,
    hookId: hook.id,
    hookMode: hook.mode,
  });
};

export class HooksService {
  private setupDeps?: HooksServiceSetupDeps;
  /**
   * Stored untyped to avoid generic variance issues for function-typed fields (handlers).
   * Safe to cast back based on the map key (event) when reading.
   */
  private readonly registrationsByEvent = new Map<HookEvent, unknown[]>();

  setup(deps: HooksServiceSetupDeps): HooksServiceSetup {
    this.setupDeps = deps;

    return {
      register: (registration) => {
        const existing = this.registrationsByEvent.get(registration.event) ?? [];
        if (existing.some((r) => (r as { id?: unknown }).id === registration.id)) {
          throw new Error(
            `Hook with id "${registration.id}" is already registered for event "${registration.event}".`
          );
        }
        this.registrationsByEvent.set(registration.event, [...existing, registration]);
      },
    };
  }

  start(): HooksServiceStart {
    if (!this.setupDeps) {
      throw new Error('#start called before #setup');
    }

    const logger = this.setupDeps.logger.get('hooks');

    const getRelevantHooks = <E extends HookEvent>(
      event: E,
      mode: HookExecutionMode,
      context: HookContext<E>
    ): Array<HookRegistration<E>> => {
      const hooks = (this.registrationsByEvent.get(event) ?? []) as unknown as Array<
        HookRegistration<E>
      >;
      const agentId = hasAgentId(context) ? context.agentId : undefined;

      return hooks
        .filter((h) => h.mode === mode)
        .filter((h) => {
          if (!h.agentFilter) return true;
          if (!agentId) return false;
          return h.agentFilter.includes(agentId);
        })
        .slice()
        .sort(sortByPriorityDesc);
    };

    const applyHookResult = <E extends HookEvent>(
      event: E,
      context: HookContext<E>,
      result: void | HookHandlerResult<E>
    ): HookContext<E> => {
      if (!result || typeof result !== 'object') {
        return context;
      }

      switch (event) {
        case HookEvent.onConversationRoundStart: {
          const { nextInput } = result as HookHandlerResult<HookEvent.onConversationRoundStart>;
          return nextInput ? ({ ...context, nextInput } as HookContext<E>) : context;
        }
        case HookEvent.onConversationRoundEnd: {
          const { round } = result as HookHandlerResult<HookEvent.onConversationRoundEnd>;
          return round ? ({ ...context, round } as HookContext<E>) : context;
        }
        case HookEvent.preToolCall: {
          const { toolParams } = result as HookHandlerResult<HookEvent.preToolCall>;
          return toolParams ? ({ ...context, toolParams } as HookContext<E>) : context;
        }
        case HookEvent.postToolCall: {
          const { toolReturn } = result as HookHandlerResult<HookEvent.postToolCall>;
          return toolReturn ? ({ ...context, toolReturn } as HookContext<E>) : context;
        }
        case HookEvent.onAgentRunStart:
        case HookEvent.onAgentRunEnd:
          return context;
        default:
          return context;
      }
    };

    const runBlocking: HooksServiceStart['runBlocking'] = async (event, context) => {
      if ('abortSignal' in context && context.abortSignal?.aborted) {
        throw createRequestAbortedError('Request aborted before executing hooks', {
          hookEvent: event,
        });
      }

      const hooks = getRelevantHooks(event, HookExecutionMode.blocking, context);
      let currentContext = context;

      for (const hook of hooks) {
        if ('abortSignal' in currentContext && currentContext.abortSignal?.aborted) {
          throw createRequestAbortedError('Request aborted while executing hooks', {
            hookEvent: event,
            hookId: hook.id,
          });
        }

        try {
          const result = await hook.handler(currentContext);
          currentContext = applyHookResult(
            event,
            currentContext,
            result as unknown as HookHandlerResult<typeof event>
          );
        } catch (err) {
          throw normalizeHookError(event, hook, err);
        }
      }

      return currentContext;
    };

    const runParallel: HooksServiceStart['runParallel'] = (event, context) => {
      const hooks = getRelevantHooks(event, HookExecutionMode.parallel, context);
      for (const hook of hooks) {
        // Fire-and-forget. Must never throw to the caller.
        Promise.resolve()
          .then(() => hook.handler(context))
          .catch((err) => {
            const normalized = normalizeHookError(event, hook, err);
            // If the triggering flow provided an abort controller, use it to cancel the main operation.
            // This enables parallel hooks to "gate" a flow without blocking it.
            if (hasAbortController(context) && !context.abortController.signal.aborted) {
              try {
                context.abortController.abort(normalized);
              } catch (e) {
                // ignore
              }
            }
            logger.warn(
              `Parallel hook "${hook.id}" failed for event "${event}": ${
                normalized instanceof Error ? normalized.message : String(normalized)
              }`
            );
          });
      }
    };

    return { runBlocking, runParallel };
  }
}
