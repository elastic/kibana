/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context, propagation } from '@opentelemetry/api';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from './baggage';

export function isInInferenceContext(context: Context) {
  // Only capture if span is part of an inference trace/span
  // baggage is set in ../create_inference_active_span.ts
  const baggage = propagation.getBaggage(context);
  const inInferenceContext =
    baggage?.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value === BAGGAGE_TRACKING_BEACON_VALUE;

  return inInferenceContext;
}
