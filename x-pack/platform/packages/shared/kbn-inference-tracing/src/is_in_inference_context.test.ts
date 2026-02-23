/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context, propagation } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { isInInferenceContext } from './is_in_inference_context';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from './baggage';

describe('isInInferenceContext', () => {
  let contextManager: AsyncHooksContextManager;

  beforeEach(() => {
    contextManager = new AsyncHooksContextManager();
    context.setGlobalContextManager(contextManager);
    contextManager.enable();
  });

  afterEach(() => {
    contextManager.disable();
  });

  it('returns false when no baggage is present', () => {
    const result = isInInferenceContext(context.active());
    expect(result).toBe(false);
  });

  it('returns false when baggage exists but does not contain inference beacon', () => {
    const baggage = propagation.createBaggage({
      'some.other.key': { value: 'some-value' },
    });
    const ctx = propagation.setBaggage(context.active(), baggage);

    const result = isInInferenceContext(ctx);
    expect(result).toBe(false);
  });

  it('returns false when inference beacon has wrong value', () => {
    const baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: 'wrong-value' },
    });
    const ctx = propagation.setBaggage(context.active(), baggage);

    const result = isInInferenceContext(ctx);
    expect(result).toBe(false);
  });

  it('returns true when inference beacon is present with correct value', () => {
    const baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: BAGGAGE_TRACKING_BEACON_VALUE },
    });
    const ctx = propagation.setBaggage(context.active(), baggage);

    const result = isInInferenceContext(ctx);
    expect(result).toBe(true);
  });

  it('returns true when inference beacon is present alongside other baggage entries', () => {
    const baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: BAGGAGE_TRACKING_BEACON_VALUE },
      'kibana.evals.run_id': { value: 'test-run-123' },
      'kibana.evals.thread_id': { value: 'thread-456' },
    });
    const ctx = propagation.setBaggage(context.active(), baggage);

    const result = isInInferenceContext(ctx);
    expect(result).toBe(true);
  });
});
