/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context, ROOT_CONTEXT, trace } from '@opentelemetry/api';
import type { SpanContext } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';

/** Non-recording parent copied from main. Not an exported span. */
export interface ParentSpanContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: number;
}

const TRACE_ID = /^(?!0{32}$)[0-9a-f]{32}$/;
const SPAN_ID = /^(?!0{16}$)[0-9a-f]{16}$/;

/**
 * Reads the active span on the caller. Call it synchronously inside that span;
 * a later turn of the event loop is a different context.
 */
export const captureParentSpan = (): ParentSpanContext | undefined => {
  const current = trace.getActiveSpan()?.spanContext();
  if (!current || !TRACE_ID.test(current.traceId) || !SPAN_ID.test(current.spanId)) return undefined;
  return { traceId: current.traceId, spanId: current.spanId, traceFlags: current.traceFlags };
};

let managerReady = false;

/** One context manager per worker process. A second registration would fight the first. */
const ensureContextManager = (): void => {
  if (managerReady) return;
  managerReady = true;
  const manager = new AsyncHooksContextManager();
  manager.enable();
  context.setGlobalContextManager(manager);
};

/** Restores the main span for this run only. Concurrent runs keep their own ids. */
export const runWithParentSpan = <T>(span: ParentSpanContext | undefined, fn: () => T): T => {
  if (!span) return fn();
  ensureContextManager();
  const spanContext: SpanContext = {
    traceId: span.traceId,
    spanId: span.spanId,
    traceFlags: span.traceFlags,
    isRemote: true,
  };
  return context.with(trace.setSpanContext(ROOT_CONTEXT, spanContext), fn);
};
