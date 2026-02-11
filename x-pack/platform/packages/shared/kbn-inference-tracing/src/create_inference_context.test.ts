/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context, propagation, trace, TraceFlags } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from './baggage';
import { createInferenceContext } from './create_inference_context';

const TEST_SPAN_CONTEXT = {
  isRemote: false,
  spanId: '1234567890abcdef',
  traceFlags: TraceFlags.SAMPLED,
  traceId: '1234567890abcdef1234567890abcdef',
} as const;

describe('createInferenceContext', () => {
  let contextManager: AsyncHooksContextManager;

  beforeEach(() => {
    contextManager = new AsyncHooksContextManager();
    context.setGlobalContextManager(contextManager);
    contextManager.enable();
  });

  afterEach(() => {
    contextManager.disable();
  });

  it('marks requests without tracking baggage as root and clears span context', () => {
    const contextWithSpan = trace.setSpanContext(context.active(), TEST_SPAN_CONTEXT);

    const inferenceContext = context.with(contextWithSpan, () => createInferenceContext());

    expect(inferenceContext.isRoot).toBe(true);

    const spanContext = trace.getSpanContext(inferenceContext.context);
    expect(spanContext).toBeUndefined();

    const baggageEntry = propagation
      .getBaggage(inferenceContext.context)
      ?.getEntry(BAGGAGE_TRACKING_BEACON_KEY);
    expect(baggageEntry?.value).toBe(BAGGAGE_TRACKING_BEACON_VALUE);
  });

  it('preserves span context when tracking baggage exists', () => {
    const nextBaggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: BAGGAGE_TRACKING_BEACON_VALUE },
    });

    const parentContext = trace.setSpanContext(context.active(), TEST_SPAN_CONTEXT);

    const nextContext = propagation.setBaggage(parentContext, nextBaggage);

    const inferenceContext = context.with(nextContext, () => createInferenceContext());

    expect(inferenceContext.isRoot).toBe(false);

    const spanContext = trace.getSpanContext(inferenceContext.context);
    expect(spanContext).toMatchObject(TEST_SPAN_CONTEXT);
  });

  it('resets span context when tracking beacon needs to be refreshed', () => {
    const baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: 'some-other-value' },
    });
    const contextWithOutdatedBaggage = propagation.setBaggage(
      trace.setSpanContext(context.active(), TEST_SPAN_CONTEXT),
      baggage
    );

    const inferenceContext = context.with(contextWithOutdatedBaggage, () =>
      createInferenceContext()
    );

    expect(inferenceContext.isRoot).toBe(true);

    const spanContext = trace.getSpanContext(inferenceContext.context);
    expect(spanContext).toBeUndefined();

    const baggageEntry = propagation
      .getBaggage(inferenceContext.context)
      ?.getEntry(BAGGAGE_TRACKING_BEACON_KEY);
    expect(baggageEntry?.value).toBe(BAGGAGE_TRACKING_BEACON_VALUE);
  });
});
