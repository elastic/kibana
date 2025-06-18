/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTracingSuppressed } from '@opentelemetry/core';
import { Span, context, propagation, trace } from '@opentelemetry/api';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from './baggage';
import { InferenceSpanAttributes } from './with_inference_span';
import { IS_ROOT_INFERENCE_SPAN_ATTRIBUTE_NAME } from './root_inference_span';

export function createActiveInferenceSpan<T>(
  options: string | (InferenceSpanAttributes & { name: string }),
  cb: (span?: Span) => T
) {
  const tracer = trace.getTracer('inference');

  const { name, ...attributes } = typeof options === 'string' ? { name: options } : options;

  const apm = {
    currentTransaction: {
      ids: {
        'trace.id': undefined,
        'span.id': undefined,
        'transaction.id': undefined,
      },
    },
    currentSpan: {
      ids: {
        'trace.id': undefined,
        'span.id': undefined,
        'transaction.id': undefined,
      },
    },
  };

  const currentTransaction = apm.currentTransaction;

  const parentSpan = trace.getActiveSpan();

  const parentSpanContext = parentSpan?.spanContext();

  const parentTraceId = parentSpanContext?.traceId || currentTransaction?.ids['trace.id'];
  const parentSpanId =
    (parentSpanContext?.spanId || apm.currentSpan?.ids['span.id']) ??
    currentTransaction?.ids['transaction.id'];

  let parentContext = context.active();

  if (isTracingSuppressed(parentContext)) {
    return cb();
  }

  let baggage = propagation.getBaggage(parentContext);

  let isRootInferenceSpan = false;

  if (!baggage) {
    baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: {
        value: BAGGAGE_TRACKING_BEACON_VALUE,
      },
    });
    isRootInferenceSpan = true;
  } else if (
    baggage.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value !== BAGGAGE_TRACKING_BEACON_VALUE
  ) {
    isRootInferenceSpan = true;
    baggage = baggage.setEntry(BAGGAGE_TRACKING_BEACON_KEY, {
      value: BAGGAGE_TRACKING_BEACON_VALUE,
    });
  }

  parentContext = propagation.setBaggage(parentContext, baggage);

  if ((!parentSpan || !parentSpan.isRecording()) && parentSpanId && parentTraceId) {
    parentContext = trace.setSpanContext(parentContext, {
      spanId: parentSpanId,
      traceId: parentTraceId,
      traceFlags: 1,
    });
  }

  return tracer.startActiveSpan(
    name,
    {
      attributes: {
        ...attributes,
        [IS_ROOT_INFERENCE_SPAN_ATTRIBUTE_NAME]: isRootInferenceSpan,
      },
    },
    parentContext,
    (span) => {
      return cb(span);
    }
  );
}
