/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metrics, ValueType } from '@opentelemetry/api';

import type { InboundIngressOutcome } from './log_inbound_ingress_outcome';

const meter = metrics.getMeter('kibana.actions');

export const inboundEventsRequestCounter = meter.createCounter(
  'kibana.actions.inbound_events.request.count',
  {
    description:
      'Inbound event hub requests by result: accepted, auth, size, throttle, schedule, or other.',
    unit: '{request}',
    valueType: ValueType.INT,
  }
);

/** Coarse hub result. Six values, so the series stays summable and omits the connector id. */
export type InboundEventsRequestResult =
  | 'accepted'
  | 'auth'
  | 'size'
  | 'throttle'
  | 'schedule'
  | 'other';

const RESULT_BY_OUTCOME: Record<InboundIngressOutcome, InboundEventsRequestResult> = {
  accepted: 'accepted',
  http_ack: 'accepted',
  auth_fail: 'auth',
  payload_too_large: 'size',
  rate_limited: 'throttle',
  emit_partial: 'schedule',
  identity_missing: 'schedule',
  disabled: 'other',
  no_spec: 'other',
  load_miss: 'other',
  handle_fail: 'other',
  validate_fail: 'other',
};

export const inboundEventsRequestResult = (
  outcome: InboundIngressOutcome
): InboundEventsRequestResult => RESULT_BY_OUTCOME[outcome];

export const recordInboundEventsRequest = (outcome: InboundIngressOutcome): void => {
  // @otel: kibana.actions.inbound_events.request.count { result: inboundEventsRequestResult(outcome) }
  inboundEventsRequestCounter.add(1, {
    result: inboundEventsRequestResult(outcome),
  });
};
