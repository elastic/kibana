/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context, propagation, trace } from '@opentelemetry/api';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from './baggage';

export function createInferenceContext() {
  const ctx = context.active();
  let baggage = propagation.getBaggage(ctx);

  let isRoot = false;

  if (!baggage) {
    isRoot = true;
    baggage = propagation.createBaggage({
      [BAGGAGE_TRACKING_BEACON_KEY]: {
        value: BAGGAGE_TRACKING_BEACON_VALUE,
      },
    });
  } else if (
    baggage.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value !== BAGGAGE_TRACKING_BEACON_VALUE
  ) {
    isRoot = true;
    baggage = baggage.setEntry(BAGGAGE_TRACKING_BEACON_KEY, {
      value: BAGGAGE_TRACKING_BEACON_VALUE,
    });
  }

  // create a new context with the updated baggage
  let parentContext = propagation.setBaggage(ctx, baggage);

  if (isRoot) {
    // Remove any pre-existing span context so new work starts a fresh trace
    parentContext = trace.deleteSpan(parentContext);
  }
  return { context: parentContext, baggage, isRoot };
}
