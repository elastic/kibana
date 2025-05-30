/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context, Span, SpanStatusCode, context } from '@opentelemetry/api';
import { Observable, from, ignoreElements, isObservable, of, switchMap, tap } from 'rxjs';
import { isPromise } from 'util/types';
import { once } from 'lodash';
import { createActiveInferenceSpan } from './create_inference_active_span';
import { GenAISemConvAttributes } from './types';

export type InferenceSpanAttributes = GenAISemConvAttributes;

/**
 * Wraps a callback in an active span. If the callback returns an Observable
 * or Promise, it will set the span status to the appropriate value when the
 * async operation completes.
 * @param options
 * @param cb
 */
export function withInferenceSpan<T>(
  options: string | ({ name: string } & InferenceSpanAttributes),
  cb: (span?: Span) => T
): T {
  const parentContext = context.active();
  return createActiveInferenceSpan(options, (span) => {
    if (!span) {
      return cb();
    }

    try {
      const res = cb(span);
      if (isObservable(res)) {
        return withInferenceSpan$(span, parentContext, res) as T;
      }

      if (isPromise(res)) {
        return withInferenceSpanPromise(span, res) as T;
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return res;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error;
    }
  });
}

function withInferenceSpan$<T>(
  span: Span,
  parentContext: Context,
  source$: Observable<T>
): Observable<T> {
  const ctx = context.active();

  return new Observable<T>((subscriber) => {
    // Make sure anything that happens during this callback uses the context
    // that was active when this function was called
    const subscription = context.with(ctx, () => {
      const end = once((error: Error) => {
        if (span.isRecording()) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.end();
        }
      });
      return source$
        .pipe(
          tap({
            next: (value) => {
              subscriber.next(value);
            },
            error: (error) => {
              // Call span.end() and subscriber.error() in the parent context, to
              // ensure a span that gets created right after doesn't get created
              // as a child of this span, but as a child of its parent span.
              context.with(parentContext, () => {
                end(error);
                subscriber.error(error);
              });
            },
          }),
          switchMap((value) => {
            // unwraps observable -> observable | promise which is a use case for the
            // Observability AI Assistant in tool calling
            if (isObservable(value)) {
              return value;
            }
            if (isPromise(value)) {
              return from(value);
            }
            return of(value);
          }),
          ignoreElements()
        )
        .subscribe({
          error: (error) => {
            context.with(parentContext, () => {
              end(error);
              subscriber.error(error);
            });
          },
          complete: () => {
            context.with(parentContext, () => {
              span.setStatus({
                code: SpanStatusCode.OK,
              });
              span.end();
              subscriber.complete();
            });
          },
        });
    });
    return () => context.with(parentContext, () => subscription.unsubscribe());
  });
}

function withInferenceSpanPromise<T>(span: Span, promise: Promise<T>): Promise<T> {
  return promise
    .then((res) => {
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return res;
    })
    .catch((error) => {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.end();
      throw error;
    });
}
