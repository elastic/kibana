/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWithActiveSpan, type WithActiveSpanOptions } from '@kbn/tracing-utils';
import { ROOT_CONTEXT, context, propagation, trace } from '@opentelemetry/api';

const EVALS_TRACER = trace.getTracer('@kbn/evals');
const withActiveEvalsSpan = createWithActiveSpan({
  tracer: EVALS_TRACER,
});

export function withTaskSpan(name: string, opts: WithActiveSpanOptions, cb: () => any) {
  const baggage = propagation.getBaggage(context.active());
  const parentContext = baggage ? propagation.setBaggage(ROOT_CONTEXT, baggage) : ROOT_CONTEXT;

  return context.with(parentContext, () =>
    withActiveEvalsSpan(
      name,
      {
        ...opts,
        attributes: {
          'instrumentationScope.name': '@kbn/evals',
          'task.name': name,
          ...opts.attributes,
        },
      },
      parentContext,
      cb
    )
  );
}

/**
 * Use this wrapper when you want to include trace-based metrics with evaluations and use qualitative evaluators within the
 * context of a Phoenix task. This ensures the evaluator spans get new root context and have a different trace id than the evaluated example span.
 */
export function withEvaluatorSpan(name: string, opts: WithActiveSpanOptions, cb: () => any) {
  // Execute callback in the context with baggage
  const baggage = propagation.getBaggage(context.active());
  const parentContext = baggage ? propagation.setBaggage(ROOT_CONTEXT, baggage) : ROOT_CONTEXT;

  return context.with(parentContext, () =>
    withActiveEvalsSpan(
      name,
      {
        ...opts,
        attributes: {
          'instrumentationScope.name': '@kbn/evals',
          'evaluator.name': name, // Set on this span too
          ...opts.attributes,
        },
      },
      parentContext,
      cb
    )
  );
}

export function getCurrentTraceId(): string | null {
  try {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) {
      return null;
    }

    const spanContext = activeSpan.spanContext();
    if (!spanContext.traceId) {
      return null;
    }

    return spanContext.traceId;
  } catch {
    return null;
  }
}
