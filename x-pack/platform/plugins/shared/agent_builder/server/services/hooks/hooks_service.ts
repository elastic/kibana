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
import { safeJsonStringify, withTimeout } from '@kbn/std';
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
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';

export interface HooksServiceSetupDeps {
  logger: Logger;
}

/** Default maximum execution time for a hook when timeout is not configured (5 minutes). */
const DEFAULT_HOOK_TIMEOUT_MS = 5 * 60 * 1000;

/** After hooks run in reverse order so they nest like LangChain (last before = first after). */
const AFTER_EVENTS: HookLifecycle[] = [
  HookLifecycle.afterConversationRound,
  HookLifecycle.afterToolCall,
];

const isAfterEvent = (event: HookLifecycle): boolean => AFTER_EVENTS.includes(event);

type BlockingHookRegistration<E extends HookLifecycle> = Extract<
  HookRegistration<E>,
  { mode: HookExecutionMode.blocking }
>;
type NonBlockingHookRegistration<E extends HookLifecycle> = Extract<
  HookRegistration<E>,
  { mode: HookExecutionMode.nonBlocking }
>;

const getStringProp = (context: HookContext<HookLifecycle>, key: string): string | undefined => {
  const value = (context as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const getHookSpanAttributes = <E extends HookLifecycle>(
  lifecycle: E,
  hook: HookRegistration<E>,
  context: HookContext<E>
): Record<string, string> => {
  const attributes: Record<string, string> = {
    [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
    'hook.lifecycle': lifecycle,
    'hook.id': hook.id,
    'hook.mode': hook.mode,
  };

  const agentId = getStringProp(context, 'agentId');
  if (agentId) {
    attributes[ElasticGenAIAttributes.AgentId] = agentId;
  }

  const conversationId = getStringProp(context, 'conversationId');
  if (conversationId) {
    attributes[ElasticGenAIAttributes.AgentConversationId] = conversationId;
  }

  const connectorId = getStringProp(context, 'connectorId');
  if (connectorId) {
    attributes['hook.connector.id'] = connectorId;
  }

  const toolId = getStringProp(context, 'toolId');
  if (toolId) {
    attributes['hook.tool.id'] = toolId;
  }

  const toolCallId = getStringProp(context, 'toolCallId');
  if (toolCallId) {
    attributes['hook.tool_call.id'] = toolCallId;
  }

  const model = getStringProp(context, 'model');
  if (model) {
    attributes['hook.model'] = model;
  }

  const phase = getStringProp(context, 'phase');
  if (phase) {
    attributes['hook.model.phase'] = phase;
  }

  return attributes;
};

const normalizeHookError = <E extends HookLifecycle>(
  event: E,
  hook: Pick<HookRegistration<E>, 'id' | 'mode'>,
  err: unknown
) => {
  if (isAgentBuilderError(err)) {
    err.meta = {
      ...err.meta,
      hookLifecycle: event,
      hookId: hook.id,
      hookMode: hook.mode,
    };
    return err;
  }
  const error = err instanceof Error ? err : new Error(String(err));
  return createBadRequestError(error.message, {
    hookLifecycle: event,
    hookId: hook.id,
    hookMode: hook.mode,
  });
};

export class HooksService {
  private setupDeps?: HooksServiceSetupDeps;

  private readonly registrationsByEvent = new Map<
    HookLifecycle,
    Array<HookRegistration<HookLifecycle>>
  >();

  setup(deps: HooksServiceSetupDeps): HooksServiceSetup {
    this.setupDeps = deps;

    return {
      register: (bundle) => {
        const lifecycles = Object.values(HookLifecycle);
        for (const lifecycle of lifecycles) {
          const entry = bundle[lifecycle];
          if (entry === undefined) continue;

          const lifeCycleId = `${bundle.id}-${lifecycle}`;

          const existing = this.registrationsByEvent.get(lifecycle) ?? [];
          if (existing.some((r) => r.id === lifeCycleId)) {
            throw new Error(
              `Hook with id "${lifeCycleId}" is already registered for event "${lifecycle}".`
            );
          }

          existing.push({
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

    const direction = isAfterEvent(lifecycle) ? 'asc' : 'desc';
    return orderBy(
      hooks.filter((h) => h.mode === mode),
      [(h) => h.priority ?? 0],
      [direction]
    );
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
            promise: withActiveInferenceSpan(
              `Hook:${hook.id}`,
              {
                attributes: getHookSpanAttributes(lifecycle, hook, currentContext),
              },
              async (span) => {
                const hookResult = await hook.handler(currentContext);
                if (hookResult !== undefined) {
                  const stringified = safeJsonStringify(hookResult);
                  if (stringified) {
                    span?.setAttribute('hook.result', stringified);
                  }
                }
                return hookResult;
              }
            ),
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
          .then(() =>
            withActiveInferenceSpan(
              `Hook:${hook.id}`,
              {
                attributes: getHookSpanAttributes(lifecycle, hook, context),
              },
              async (span) => {
                const hookResult = await hook.handler(context);
                if (hookResult !== undefined) {
                  const stringified = safeJsonStringify(hookResult);
                  if (stringified) {
                    span?.setAttribute('hook.result', stringified);
                  }
                }
                return hookResult;
              }
            )
          )
          .catch((err) => {
            const normalized = normalizeHookError(lifecycle, hook, err);
            logger.error(
              `Non-blocking hook "${hook.id}" failed for event "${lifecycle}": ${
                normalized instanceof Error ? normalized.message : String(normalized)
              }`
            );
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
