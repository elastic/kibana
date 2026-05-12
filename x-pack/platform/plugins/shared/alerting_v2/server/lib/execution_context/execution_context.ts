/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionCancellationError } from './cancellation_error';
import { CancellationScope } from './cancellation_scope';
// `import type` keeps this dependency type-only — there is no runtime cycle
// between `execution_context` and `rule_executor/events`.
import type { RuleExecutionEvent } from '../rule_executor/events/types';

/**
 * Function signature for emitting an event into the rule-execution observer
 * pipeline. The pipeline binds this to {@link RuleExecutionObserverHub.emit}
 * when it constructs the context. Tests pass a no-op.
 */
export type EmitRuleExecutionEvent = (event: RuleExecutionEvent) => void;

const noopEmit: EmitRuleExecutionEvent = () => {};

export interface ExecutionContext {
  readonly signal: AbortSignal;
  /**
   * Publishes an event into the rule-execution observer pipeline. Pipeline
   * lifecycle events are emitted by the pipeline / middlewares; steps and
   * services emit domain events (`batch_processed`, `episode_transitioned`,
   * etc.) that observers consume to build telemetry, audit logs, traces, etc.
   *
   * Fire-and-forget: errors thrown by observers are caught by the hub and
   * never propagate to the caller.
   */
  emit(event: RuleExecutionEvent): void;
  throwIfAborted(): void;
  onAbort(handler: () => void): () => void;
  createScope(): CancellationScope;
}

export class AbortSignalExecutionContext implements ExecutionContext {
  constructor(
    public readonly signal: AbortSignal,
    private readonly emitFn: EmitRuleExecutionEvent = noopEmit
  ) {}

  public emit(event: RuleExecutionEvent): void {
    this.emitFn(event);
  }

  public throwIfAborted(): void {
    if (!this.signal.aborted) {
      return;
    }

    const reason = this.signal.reason;

    if (reason instanceof Error) {
      throw reason;
    }

    throw new RuleExecutionCancellationError(undefined, { cause: reason });
  }

  public onAbort(handler: () => void): () => void {
    this.signal.addEventListener('abort', handler, { once: true });
    return () => this.signal.removeEventListener('abort', handler);
  }

  /**
   * Creates a CancellationScope that automatically disposes all registered
   * resources when the abort signal fires. The scope can also be disposed
   * manually via `disposeAll()`.
   */
  public createScope(): CancellationScope {
    const scope = new CancellationScope();
    const unsubscribe = this.onAbort(() => {
      scope.disposeAll().catch(() => {
        // Disposal errors during abort are best-effort.
        // The primary abort reason is already propagated through
        // the stream/pipeline error path.
      });
    });

    scope.add(unsubscribe);

    return scope;
  }
}

export const createExecutionContext = (
  signal: AbortSignal,
  emit: EmitRuleExecutionEvent = noopEmit
): ExecutionContext => new AbortSignalExecutionContext(signal, emit);
