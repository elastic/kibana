/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LLMSpanAttributes } from '@langtrase/trace-attributes';
import { Context, Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { finalize, Observable, tap } from 'rxjs';
import { getLangtraceSpanAttributes } from './get_langtrace_span_attributes';
import { getLangtraceTracer } from './get_langtrace_tracer';

type SpanCallback<T> = ({}: { span: Span; tracer: LangTracer }) => Observable<T>;

interface Options {
  attributes?: Partial<LLMSpanAttributes>;
  kind?: SpanKind;
}

export class LangTracer {
  private tracer = getLangtraceTracer();

  constructor(private context: Context) {}

  startActiveSpan<T>(name: string, callback: SpanCallback<T>): Observable<T>;
  startActiveSpan<T>(name: string, options: Options, callback: SpanCallback<T>): Observable<T>;
  startActiveSpan<T>(
    name: string,
    ...rest: [Options, SpanCallback<T>] | [SpanCallback<T>]
  ): Observable<T> {
    let [options, callback] = rest;

    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    const span = this.tracer.startSpan(
      name,
      {
        ...options,
        attributes: {
          ...getLangtraceSpanAttributes(),
          ...(options.attributes || {}),
        },
      },
      this.context
    );

    const nextContext = trace.setSpan(this.context, span);

    const nextTracer = new LangTracer(nextContext);

    return callback!({ span, tracer: nextTracer }).pipe(
      tap({
        error: (error) => {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.end();
        },
        complete: () => {
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
        },
      }),
      finalize(() => {
        span.end();
      })
    );
  }
}
