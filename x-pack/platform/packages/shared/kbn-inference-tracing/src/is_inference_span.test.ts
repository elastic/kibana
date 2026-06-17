/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context, propagation } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from './baggage';
import { isInferenceSpan } from './is_inference_span';

function createSpan(scopeName: string): tracing.Span {
  const span = {
    instrumentationScope: { name: scopeName },
  };
  return span as tracing.Span;
}

describe('isInferenceSpan', () => {
  let contextManager: AsyncLocalStorageContextManager;

  beforeEach(() => {
    contextManager = new AsyncLocalStorageContextManager();
    context.setGlobalContextManager(contextManager);
    contextManager.enable();
  });

  afterEach(() => {
    contextManager.disable();
  });

  it('returns true when in inference context (baggage)', () => {
    const baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: BAGGAGE_TRACKING_BEACON_VALUE },
    });
    const parentContext = propagation.setBaggage(context.active(), baggage);
    const span = createSpan('some.scope');

    expect(isInferenceSpan(span, parentContext)).toBe(true);
  });

  it('returns true when instrumentationScope.name is inference', () => {
    const span = createSpan('inference');

    expect(isInferenceSpan(span, context.active())).toBe(true);
  });

  it('returns false when instrumentationScope.name is @elastic/transport', () => {
    const baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: { value: BAGGAGE_TRACKING_BEACON_VALUE },
    });
    const parentContext = propagation.setBaggage(context.active(), baggage);
    const span = createSpan('@elastic/transport');

    expect(isInferenceSpan(span, parentContext)).toBe(false);
  });

  it('returns false for non-inference spans outside inference context', () => {
    const span = createSpan('http');

    expect(isInferenceSpan(span, context.active())).toBe(false);
  });
});
