/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPromise } from '@kbn/std';
import type { Context, Span, SpanOptions, Tracer } from '@opentelemetry/api';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { isObservable, Observable } from 'rxjs';

/**
 * Lightweight span helper that uses explicit context threading instead of
 * AsyncLocalStorage-based `startActiveSpan`. The parent-child relationship
 * is established by passing `parentCtx` to `tracer.startSpan`, and the
 * child context is returned to the callback so callers can propagate it
 * further without any global side effects.
 */
export function withExplicitSpan<T>(
  tracer: Tracer,
  name: string,
  opts: SpanOptions,
  parentCtx: Context,
  cb: (span: Span, ctx: Context) => T
): T {
  const span = tracer.startSpan(name, opts, parentCtx);
  const childCtx = trace.setSpan(parentCtx, span);
  try {
    const res = cb(span, childCtx);

    if (isPromise(res)) {
      return handlePromise(span, res) as T;
    }

    if (isObservable(res)) {
      return handleObservable(span, res) as T;
    }

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    return res;
  } catch (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.end();
    throw error;
  }
}

function handlePromise<T>(span: Span, promise: Promise<T>): Promise<T> {
  return promise.then(
    (res) => {
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return res;
    },
    (error) => {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.end();
      throw error;
    }
  );
}

function handleObservable<T>(span: Span, source$: Observable<T>): Observable<T> {
  return new Observable<T>((subscriber) => {
    let ended = false;
    const endSpan = (status: SpanStatusCode, message?: string) => {
      if (ended) return;
      ended = true;
      span.setStatus({ code: status, ...(message ? { message } : {}) });
      span.end();
    };

    const subscription = source$.subscribe({
      next: (value) => subscriber.next(value),
      error: (error) => {
        span.recordException(error);
        endSpan(SpanStatusCode.ERROR, error instanceof Error ? error.message : String(error));
        subscriber.error(error);
      },
      complete: () => {
        endSpan(SpanStatusCode.OK);
        subscriber.complete();
      },
    });
    return () => {
      subscription.unsubscribe();
      endSpan(SpanStatusCode.ERROR, 'cancelled');
    };
  });
}
