/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context, Span, SpanStatusCode, context } from '@opentelemetry/api';
import { Observable, from, ignoreElements, isObservable, of, switchMap, tap } from 'rxjs';
import { isPromise } from 'util/types';
import { createActiveInferenceSpan } from './create_inference_active_span';
import { GenAISemConvAttributes } from './types';

export type InferenceSpanAttributes = GenAISemConvAttributes;

export function withInferenceSpan<T>(
  options: string | ({ name: string } & InferenceSpanAttributes),
  cb: (span?: Span) => T
): T {
  const parentContext = context.active();
  return createActiveInferenceSpan(options, (span) => {
    const res = cb(span);
    if (isObservable(res)) {
      return withInferenceSpan$(span, parentContext, res) as T;
    }

    if (isPromise(res)) {
      return withInferenceSpanPromise(span, res) as T;
    }
    return res;
  });
}

function withInferenceSpan$<T>(
  span: Span,
  parentContext: Context,
  source$: Observable<T>
): Observable<T> {
  const ctx = context.active();

  return new Observable<T>((subscriber) => {
    const subscription = context.with(ctx, () => {
      return source$
        .pipe(
          tap({
            next: (value) => {
              subscriber.next(value);
            },
            error: (error) => {
              context.with(parentContext, () => {
                span.recordException(error);
                span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                span.end();
                subscriber.error(error);
              });
            },
            complete: () => {},
          }),
          switchMap((value) => {
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
              span.recordException(error);
              span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
              span.end();
              subscriber.error(error);
            });
          },
          complete: () => {
            context.with(parentContext, () => {
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
